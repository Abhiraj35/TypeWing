import { describe, expect, it, vi } from "vitest"
import {
  buildLeaderboard,
  cleanupStaleRooms,
  clearSeatExpiry,
  createRoom,
  findPlayerBySocketId,
  findRoomForPlayer,
  findSeatByToken,
  getRoom,
  joinRoom,
  migrateHost,
  newPlayerId,
  newResumeToken,
  normalizeConfig,
  removeIfAbandoned,
  resetForRematch,
  scheduleSeatExpiry,
  seatDisconnected,
  serializeRoom,
  validateUsername,
  type InternalPlayer,
  type Room,
} from "./room-manager"
import { MAX_ROOMS_PER_IP } from "./constants"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Unique IP per call keeps room counts under the per IP cap across tests
// sharing the module level room map.
let ipCounter = 0
function nextIp(): string {
  ipCounter += 1
  return `192.168.0.${ipCounter}`
}

function makeRoom(maxPlayers = 4, overrides: { status?: Room["status"] } = {}) {
  const created = createRoom(`create-socket-${ipCounter}`, "Host", { wordCount: 20, maxPlayers }, nextIp())
  if (!created) throw new Error("createRoom returned null")
  if (overrides.status) created.room.status = overrides.status
  return created
}

function joinInto(room: Room, socketId: string, name = "Racer") {
  const result = joinRoom(room.id, socketId, name)
  if (!result) throw new Error("joinRoom returned null")
  return result
}

function seatOf(room: Room, socketId: string): InternalPlayer {
  const player = findPlayerBySocketId(room, socketId)
  if (!player) throw new Error(`no player for socket ${socketId}`)
  return player
}

describe("newPlayerId / newResumeToken (AC-5 token secrecy)", () => {
  it("issues server random identities that never collide", () => {
    const players = new Set<string>()
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) {
      players.add(newPlayerId())
      tokens.add(newResumeToken())
    }
    expect(players.size).toBe(100)
    expect(tokens.size).toBe(100)
    // 9 bytes of hex = 18 chars; 32 bytes base64url = 43 chars.
    for (const id of players) expect(id).toMatch(/^[0-9a-f]{18}$/)
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })
})

describe("normalizeConfig", () => {
  it("falls back to the documented defaults", () => {
    expect(normalizeConfig(undefined)).toEqual({ wordCount: 30, maxPlayers: 8, timeLimit: 90 })
  })

  it("snaps values to the allowed option lists", () => {
    expect(normalizeConfig({ wordCount: 1000, maxPlayers: 2, timeLimit: 500 })).toEqual({
      wordCount: 100,
      maxPlayers: 2,
      timeLimit: 120,
    })
    expect(normalizeConfig({ wordCount: 21, maxPlayers: 999 })).toEqual({
      wordCount: 20,
      maxPlayers: 8,
      timeLimit: 90,
    })
  })
})

describe("validateUsername", () => {
  it("trims, truncates to 20 chars, and strips control characters", () => {
    expect(validateUsername("  hello  ")).toBe("hello")
    expect(validateUsername("x".repeat(50))).toBe("x".repeat(20))
    expect(validateUsername("Bad\u0000Name")).toBe("BadName")
    expect(validateUsername(123)).toBeNull()
    expect(validateUsername("   ")).toBeNull()
  })
})

describe("createRoom", () => {
  it("starts a waiting room with one connected host seat owning a token", () => {
    const { room, playerId, resumeToken } = makeRoom()
    expect(room.status).toBe("waiting")
    expect(room.hostId).toBe(playerId)
    expect(room.players.size).toBe(1)
    const host = seatOf(room, room.players.values().next().value?.socketId ?? "")
    expect(host.connectionState).toBe("connected")
    expect(host.resumeToken).toBe(resumeToken)
    expect(host.spectator).toBe(false)
  })

  it("enforces the per IP room cap (AC-6)", () => {
    const ip = nextIp()
    for (let i = 0; i < MAX_ROOMS_PER_IP; i++) {
      const created = createRoom(`cap-socket-${i + ipCounter}`, "Host", undefined, ip)
      expect(created).not.toBeNull()
    }
    expect(createRoom("cap-overflow", "Host", undefined, ip)).toBeNull()
  })
})

describe("joinRoom (AC-6 held seats count toward capacity)", () => {
  it("fills a room up to maxPlayers and then refuses joins", () => {
    const { room } = makeRoom(2)
    const first = joinInto(room, "join-1")
    expect(first.spectator).toBe(false)
    expect(joinRoom(room.id, "join-2", "Third")).toBeNull()
    expect(room.players.size).toBe(2)
  })

  it("keeps a reconnecting (held) seat counted toward capacity while in grace", () => {
    const { room } = makeRoom(2)
    const creatorSocket = [...room.players.values()].find((player) => player.socketId)?.socketId ?? "join-0"
    joinInto(room, "join-1")
    seatDisconnected(creatorSocket!, 2, vi.fn())
    // Host held in grace + one live racer = 2 held seats, room is full.
    expect(joinRoom(room.id, "join-2", "Third")).toBeNull()
    expect(seatOf(room, "join-1").connectionState).toBe("connected")
  })

  it("frees the slot once the held seat drops after grace (AC-2, AC-6)", async () => {
    const { room } = makeRoom(2)
    const creatorSocket = [...room.players.values()].find((player) => player.socketId)?.socketId ?? "join-0"
    joinInto(room, "join-1")
    seatDisconnected(creatorSocket, 20, vi.fn())
    expect(joinRoom(room.id, "blocked", "Third")).toBeNull()
    await sleep(60)
    // The held host seat dropped; the live racer remains and a new join fits.
    expect(seatOf(room, "join-1").connectionState).toBe("connected")
    const freed = joinRoom(room.id, "join-2", "Third")
    expect(freed).not.toBeNull()
  })

  it("seats late joiners as spectators once the race is live (AC-3)", () => {
    const { room } = makeRoom(4, { status: "racing" })
    joinInto(room, "join-1")
    const late = joinRoom(room.id, "join-late", "Spectator")
    expect(late?.spectator).toBe(true)
  })
})

describe("seatDisconnected and the grace window (AC-1, AC-2)", () => {
  it("flips a seat to reconnecting with a deadline and schedules expiry", async () => {
    const { room } = makeRoom()
    const creatorSocket = [...room.players.values()].find((player) => player.socketId)?.socketId ?? ""
    const onExpired = vi.fn()
    const result = seatDisconnected(creatorSocket, 20, onExpired)
    expect(result?.player.connectionState).toBe("reconnecting")
    expect(result?.player.socketId).toBeNull()
    expect(result?.player.seatExpiresAt).toBeGreaterThan(Date.now())
    await sleep(60)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(result?.player.connectionState).toBe("dropped")
  })

  it("a resume before the grace elapses cancels the expiry (no dropped flip)", async () => {
    const { room } = makeRoom()
    const player = [...room.players.values()][0]
    seatDisconnected(player.socketId!, 40, vi.fn())
    clearSeatExpiry(player) // resume path calls this
    expect(player.connectionState).toBe("reconnecting")
    expect(player.seatExpiryTimer).toBeNull()
    await sleep(60)
    expect(player.connectionState).toBe("reconnecting") // never dropped
  })

  it("ignores disconnects for sockets not in a room", () => {
    expect(seatDisconnected("nobody", 1000, vi.fn())).toBeNull()
  })

  it("expires an in flight timer as a no op once the seat already dropped", () => {
    const { room } = makeRoom()
    const player = [...room.players.values()][0]
    const onExpired = vi.fn()
    scheduleSeatExpiry(room, player, 20, onExpired)
    // Drop first, as expiry and resume would have done.
    player.connectionState = "dropped"
    player.socketId = null
    return sleep(40).then(() => expect(onExpired).not.toHaveBeenCalled())
  })
})

describe("token lookups (AC-5)", () => {
  it("findSeatByToken only matches the owning token", () => {
    const { room, playerId, resumeToken } = makeRoom()
    expect(findSeatByToken(room, resumeToken)?.playerId).toBe(playerId)
    expect(findSeatByToken(room, "not-a-token")).toBeUndefined()
  })

  it("findRoomForPlayer finds the room by live socket only", () => {
    const { room } = makeRoom()
    const joined = joinInto(room, "find-socket")
    expect(findRoomForPlayer("find-socket")?.id).toBe(room.id)
    expect(findRoomForPlayer(joined.resumeToken)).toBeUndefined()
  })
})

describe("migrateHost (AC-3 prefers a connected racer)", () => {
  function seededRoom() {
    const { room } = makeRoom(4)
    joinInto(room, "seat-a", "Alpha")
    joinInto(room, "seat-b", "Beta")
    joinInto(room, "seat-c", "Gamma")
    const players = [...room.players.values()]
    return { room, players }
  }

  it("migrates to a connected racer over any other seat", () => {
    const { room, players } = seededRoom()
    const [host, alpha, beta, gamma] = players
    room.hostId = host.playerId
    host.spectator = true
    gamma.spectator = true
    expect(migrateHost(room)).toBe(true)
    expect(room.hostId).toBe(alpha.playerId) // first connected racer
  })

  it("falls back to a racer still in grace when nobody is connected", () => {
    const { room, players } = seededRoom()
    const [host, alpha, beta, gamma] = players
    room.hostId = host.playerId
    host.connectionState = "dropped"
    alpha.connectionState = "reconnecting"
    beta.connectionState = "reconnecting"
    beta.spectator = true
    gamma.connectionState = "dropped"
    expect(migrateHost(room)).toBe(true)
    expect(room.hostId).toBe(alpha.playerId) // first reconnecting racer
  })

  it("returns false when every seat is dropped", () => {
    const { room } = makeRoom()
    for (const player of room.players.values()) {
      player.connectionState = "dropped"
    }
    expect(migrateHost(room)).toBe(false)
  })
})

describe("resetForRematch (AC-3)", () => {
  it("removes dropped seats, clears votes, and zeroes race stats", () => {
    const { room } = makeRoom(4)
    joinInto(room, "seat-1", "One")
    const first = [...room.players.values()][0]
    first.finishTime = 1000
    first.rank = 2
    first.wpm = 80
    first.progress = 30
    const second = [...room.players.values()][1]
    second.connectionState = "dropped"
    second.socketId = null
    room.rematchVotes.add(second.playerId)
    room.status = "finished"
    room.hostId = second.playerId // host dropped as well

    resetForRematch(room)

    expect(room.status).toBe("waiting")
    expect(room.players.has(second.playerId)).toBe(false)
    expect(room.rematchVotes.size).toBe(0)
    expect(room.text).toBeNull()
    const remaining = [...room.players.values()][0]
    expect(remaining.finishTime).toBeNull()
    expect(remaining.rank).toBeNull()
    expect(remaining.wpm).toBe(0)
    expect(remaining.progress).toBe(0)
    expect(room.hostId).toBe(remaining.playerId) // migrated off the dropped host
  })
})

describe("buildLeaderboard / serializeRoom (AC-5 wire whitelist)", () => {
  function rankedRoom() {
    const { room } = makeRoom(4)
    joinInto(room, "seat-1", "One")
    joinInto(room, "seat-2", "Two")
    const [a, b, c] = [...room.players.values()]
    a.progress = 50
    b.progress = 10
    c.progress = 20
    b.rank = 1
    c.rank = 2
    return { room, a, b, c }
  }

  it("never leaks resumeToken or socketId onto the wire (AC-5)", () => {
    const { room } = rankedRoom()
    const serialized = JSON.stringify(serializeRoom(room))
    expect(serialized).not.toContain("resumeToken")
    expect(serialized).not.toContain('"socketId"')
    expect(serialized).not.toContain('"seatExpiryTimer"')
    expect(serialized).toContain("seatExpiresAt") // public state is fine
  })

  it("sorts by rank first, then progress, then wpm", () => {
    const { room, a, b, c } = rankedRoom()
    const board = buildLeaderboard(room)
    expect(board.map((player) => player.playerId)).toEqual([b.playerId, c.playerId, a.playerId])
  })

  it("serializeRoom exposes the public shape only", () => {
    const { room } = rankedRoom()
    const state = serializeRoom(room)
    expect(state.roomId).toBe(room.id)
    expect(Object.keys(state).sort()).toEqual(["config", "hostId", "players", "roomId", "status"])
    expect(state.players.every((player) => player.playerId && typeof player.name === "string")).toBe(true)
  })
})

describe("removeIfAbandoned / cleanupStaleRooms (AC-6)", () => {
  it("removes a room only when no seat is live or held", () => {
    const { room } = makeRoom()
    const player = [...room.players.values()][0]
    // Drop the only seat.
    player.connectionState = "dropped"
    player.socketId = null
    expect(removeIfAbandoned(room)).toBe(true)
    expect(getRoom(room.id)).toBeUndefined()
  })

  it("keeps a room with a seat still in grace", () => {
    const { room } = makeRoom()
    seatDisconnected([...room.players.values()][0].socketId!, 100_000, vi.fn())
    expect(removeIfAbandoned(room)).toBe(false)
  })

  it("reaps waiting rooms older than the stale window", () => {
    const { room } = makeRoom()
    room.createdAt = Date.now() - (30 * 60_000 + 1_000)
    expect(cleanupStaleRooms()).toContain(room.id)
    const { room: fresh } = makeRoom()
    expect(cleanupStaleRooms()).not.toContain(fresh.id)
  })
})