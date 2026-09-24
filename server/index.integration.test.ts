import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { once } from "node:events"
import type { AddressInfo } from "node:net"
import { io as createClient, type Socket } from "socket.io-client"
import type { ClientToServerEvents, RoomState, ServerToClientEvents } from "@shared/types"
import { httpServer, io as ioServer } from "./index"
import { getRoom } from "./room-manager"
import { SEAT_GRACE_MS } from "./constants"

type Client = Socket<ServerToClientEvents, ClientToServerEvents>

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
let port = 0

function connect(name: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket = createClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: { "x-test": name },
    }) as Client
    const timer = setTimeout(() => reject(new Error(`connect timeout for ${name}`)), 5000)
    socket.once("connect", () => {
      clearTimeout(timer)
      resolve(socket)
    })
    socket.once("connect_error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

// Returns a promise resolved by the next occurrence of the event. Used
// together with the matching emit, so callers must invoke it BEFORE emitting:
// the socket client drops events that arrive with no listener attached.
function onceEvent<K extends keyof ServerToClientEvents>(
  socket: Client,
  event: K,
  timeout = 8000,
): Promise<Parameters<ServerToClientEvents[K]>[0]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${String(event)}`)), timeout)
    socket.once(event, ((data: Parameters<ServerToClientEvents[K]>[0]) => {
      clearTimeout(timer)
      resolve(data)
    }) as never)
  })
}

function expectSilence(socket: Client, event: keyof ServerToClientEvents, windowMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const onEvent = () => {
      socket.off(event, onEvent as never)
      resolve(false)
    }
    socket.once(event, onEvent as never)
    setTimeout(() => {
      socket.off(event, onEvent as never)
      resolve(true)
    }, windowMs)
  })
}

function collectErrors(socket: Client): string[] {
  const errors: string[] = []
  socket.on("error", (message: string) => errors.push(message))
  return errors
}

// One shared room carries most tests so the suite stays under the per IP room
// cap while covering create, join, resume, kick, racing resume, and rate
// limiting end to end. A second room (maxPlayers 2) covers capacity and grace
// expiry. The 60s race timer in the shared room outlives the tests; the server
// is closed in afterAll regardless.
const world: {
  roomId: string
  hostSeat: { playerId: string; resumeToken: string }
  host: Client
  joinerSeat: { playerId: string; resumeToken: string }
  joiner: Client
  back: Client
  hostLive: Client
  go: { startAt: number; endsAt: number } | null
} = {
  roomId: "",
  hostSeat: { playerId: "", resumeToken: "" },
  host: undefined as never,
  joinerSeat: { playerId: "", resumeToken: "" },
  joiner: undefined as never,
  back: undefined as never,
  hostLive: undefined as never,
  go: null,
}

describe("multiplayer wire behavior (spec 0001 AC-1..AC-6)", () => {
  beforeAll(async () => {
    if (!httpServer.listening) await once(httpServer, "listening")
    port = (httpServer.address() as AddressInfo).port
  })

  afterAll(async () => {
    const sockets = [world.host, world.joiner, world.back, world.hostLive]
    for (const socket of sockets) {
      if (socket && typeof socket.disconnect === "function") socket.disconnect()
    }
    ioServer.close()
    httpServer.close()
  })

  it("AC-1/AC-5: room:create seats one player with a token seat and the first room:state always arrives", async () => {
    world.host = await connect("it-create")
    // Pre attached before the emit: create sends created, seat, and state in
    // one burst, and each needs a listener already in place.
    const createdP = onceEvent(world.host, "room:created")
    const seatP = onceEvent(world.host, "player:seat")
    const stateP = onceEvent(world.host, "room:state")
    world.host.emit("room:create", {
      username: "HostName",
      config: { wordCount: 20, maxPlayers: 4, timeLimit: 60 },
    })
    const [created, seat, state] = await Promise.all([createdP, seatP, stateP])
    world.roomId = created.roomId
    world.hostSeat = seat

    expect(seat.resumeToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(state.roomId).toBe(created.roomId)
    expect(state.hostId).toBe(seat.playerId)
    expect(state.players).toHaveLength(1)
    expect(state.players[0].playerId).toBe(seat.playerId)
    const serialized = JSON.stringify(state)
    expect(serialized).not.toContain("resumeToken")
    expect(serialized).not.toContain("socketId")
  })

  it("AC-1: room:join seats a second racer and both members receive the state", async () => {
    world.joiner = await connect("it-join")
    const seatP = onceEvent(world.joiner, "player:seat")
    const joinerStateP = onceEvent(world.joiner, "room:state")
    const hostStateP = onceEvent(world.host, "room:state")
    world.joiner.emit("room:join", { roomId: world.roomId, username: "RacerTwo" })
    const [seat, joinerState, hostState] = await Promise.all([seatP, joinerStateP, hostStateP])
    world.joinerSeat = seat
    expect(seat.playerId).toBeTruthy()
    expect(joinerState.players).toHaveLength(2)
    expect(hostState.players).toHaveLength(2)
  })

  it("AC-5: a foreign resume token is rejected", async () => {
    const stranger = await connect("it-foreign")
    const errors = collectErrors(stranger)
    stranger.emit("room:resume", { roomId: world.roomId, resumeToken: "not-a-real-token" })
    await sleep(1200)
    expect(errors.some((message) => message.includes("could not be resumed"))).toBe(true)
    stranger.disconnect()
  })

  it("AC-1: room:resume rebinds a disconnected waiting room seat in place with state", async () => {
    // Watch the broadcasts of the drop before dropping the joiner.
    const reconnectingP = onceEvent(world.host, "player:connection")
    const dropStateP = onceEvent(world.host, "room:state")
    world.joiner.disconnect()
    const reconnecting = await reconnectingP
    expect(reconnecting).toEqual({ playerId: world.joinerSeat.playerId, connectionState: "reconnecting" })
    await dropStateP

    world.back = await connect("it-resume")
    const resumedP = onceEvent(world.back, "player:seatResumed")
    const stateP = onceEvent(world.back, "room:state")
    world.back.emit("room:resume", { roomId: world.roomId, resumeToken: world.joinerSeat.resumeToken })
    const [resumed, state] = await Promise.all([resumedP, stateP])
    expect(resumed.playerId).toBe(world.joinerSeat.playerId)
    expect(state.players).toHaveLength(2)
    const seated = state.players.find((player) => player.playerId === world.joinerSeat.playerId)
    expect(seated?.connectionState).toBe("connected")
  })

  it("AC-5: a second live resume kicks the older connection out of the room", async () => {
    world.hostLive = await connect("it-kick")
    const resumedP = onceEvent(world.hostLive, "player:seatResumed")
    const connectionSilence = expectSilence(world.host, "player:connection")
    const stateSilence = expectSilence(world.host, "room:state")
    world.hostLive.emit("room:resume", { roomId: world.roomId, resumeToken: world.hostSeat.resumeToken })
    const resumed = await resumedP
    expect(resumed.playerId).toBe(world.hostSeat.playerId)
    expect(await connectionSilence).toBe(true)
    expect(await stateSilence).toBe(true)
  })

  it("AC-1: resuming into a racing room replays countdown and go at the race time", async () => {
    world.hostLive.emit("game:startRequest", { roomId: world.roomId })
    const announced = await onceEvent(world.hostLive, "game:countdown")
    expect(announced.text).toHaveLength(20)
    const go = await onceEvent(world.hostLive, "game:go")
    world.go = go

    world.back.disconnect()
    const back2 = await connect("it-racing-resume")
    const [countdownP, goP, stateP] = [
      onceEvent(back2, "game:countdown"),
      onceEvent(back2, "game:go"),
      onceEvent(back2, "room:state"),
    ]
    const resumedP = onceEvent(back2, "player:seatResumed")
    back2.emit("room:resume", { roomId: world.roomId, resumeToken: world.joinerSeat.resumeToken })
    const [resumed, replayedCountdown, replayedGo, state] = await Promise.all([
      resumedP,
      countdownP,
      goP,
      stateP,
    ])
    expect(resumed.playerId).toBe(world.joinerSeat.playerId)
    expect(replayedCountdown.startAt).toBe(go.startAt)
    expect(replayedGo.startAt).toBe(go.startAt)
    expect(replayedGo.endsAt).toBe(go.endsAt)
    expect(state).toBeTruthy()
    back2.disconnect()
  })

  it("AC-6: room:resume is rate limited per socket (6 per 10s)", async () => {
    const spammer = await connect("it-spam")
    const errors = collectErrors(spammer)
    for (let i = 0; i < 8; i++) {
      spammer.emit("room:resume", { roomId: world.roomId, resumeToken: "garbage" })
    }
    await sleep(1500)
    expect(errors.filter((message) => message.includes("Too many requests"))).toHaveLength(2)
    expect(errors.filter((message) => message.includes("could not be resumed"))).toHaveLength(6)
    spammer.disconnect()
  })

  it("AC-1: room:resume is rejected for a socket already seated in another room (no ghost seat)", async () => {
    const renegade = await connect("it-ghost-a")
    const createdAP = onceEvent(renegade, "room:created")
    const seatAP = onceEvent(renegade, "player:seat")
    renegade.emit("room:create", {
      username: "AlreadyA",
      config: { wordCount: 20, maxPlayers: 4, timeLimit: 60 },
    })
    const [createdA, seatA] = await Promise.all([createdAP, seatAP])

    const ghostmaker = await connect("it-ghost-b")
    const createdBP = onceEvent(ghostmaker, "room:created")
    const seatBP = onceEvent(ghostmaker, "player:seat")
    ghostmaker.emit("room:create", {
      username: "GhostB",
      config: { wordCount: 20, maxPlayers: 4, timeLimit: 60 },
    })
    const [createdB, seatB] = await Promise.all([createdBP, seatBP])

    // Put room B's seat into grace so it is a live, unbounded token target.
    ghostmaker.disconnect()
    const deadline = Date.now() + 4000
    let bState = getRoom(createdB.roomId)?.players.get(seatB.playerId)?.connectionState
    while (bState !== "reconnecting" && Date.now() < deadline) {
      await sleep(50)
      bState = getRoom(createdB.roomId)?.players.get(seatB.playerId)?.connectionState
    }
    expect(bState).toBe("reconnecting")

    // The renegade socket is already bound to room A; the room B resume must
    // be rejected instead of stacking a second seat on the same socket.
    const errors = collectErrors(renegade)
    const seatResumedSilence = expectSilence(renegade, "player:seatResumed")
    renegade.emit("room:resume", { roomId: createdB.roomId, resumeToken: seatB.resumeToken })
    expect(await seatResumedSilence).toBe(true)
    expect(errors.some((message) => message.includes("already in a room"))).toBe(true)

    // No ghost: once the renegade disconnects, room B's seat is untouched. It
    // stays in grace with no socketId instead of staying connected with a dead
    // one, so it still expires, frees its capacity slot, and lets the waiting
    // room be removed. Room A's own seat does go into grace, proving the
    // disconnect only ever unbinds the socket's real seat.
    renegade.disconnect()
    await sleep(300)
    const roomBBeforeGrace = getRoom(createdB.roomId)
    expect(roomBBeforeGrace?.players.get(seatB.playerId)?.connectionState).toBe("reconnecting")
    expect(roomBBeforeGrace?.players.get(seatB.playerId)?.socketId).toBeNull()
    expect(roomBBeforeGrace?.players.get(seatB.playerId)?.playerId).toBe(seatB.playerId)
    expect(getRoom(createdA.roomId)?.players.get(seatA.playerId)?.connectionState).toBe("reconnecting")
  })

  it("AC-2/AC-6: a held seat counts toward capacity and frees its slot after grace", async () => {
    const h2 = await connect("it-cap-host")
    const createdP = onceEvent(h2, "room:created")
    const hostSeatP = onceEvent(h2, "player:seat")
    h2.emit("room:create", {
      username: "CapHost",
      config: { wordCount: 20, maxPlayers: 2, timeLimit: 60 },
    })
    const [created, hostSeat] = await Promise.all([createdP, hostSeatP])

    const racer = await connect("it-cap-racer")
    const states: RoomState[] = []
    const connections: string[] = []
    racer.on("room:state", (data) => states.push(data))
    racer.on("player:connection", (data) => connections.push(data.connectionState))
    // The disconnect broadcasts flow to the racer; pre attach before dropping.
    const reconnectingP = onceEvent(racer, "player:connection")
    const dropStateP = onceEvent(racer, "room:state")
    const joinerSeatP = onceEvent(racer, "player:seat")
    racer.emit("room:join", { roomId: created.roomId, username: "RacerTwo" })
    await joinerSeatP

    h2.disconnect()
    const [reconnecting, _dropState] = await Promise.all([reconnectingP, dropStateP])
    expect(reconnecting.connectionState).toBe("reconnecting")

    const blocked = await connect("it-cap-blocked")
    const blockedErrors = collectErrors(blocked)
    blocked.emit("room:join", { roomId: created.roomId, username: "Third" })
    await sleep(1200)
    expect(blockedErrors.some((message) => message.includes("full"))).toBe(true)
    blocked.disconnect()

    await sleep(SEAT_GRACE_MS + 1200)
    const third = await connect("it-cap-third")
    const thirdSeatP = onceEvent(third, "player:seat")
    third.emit("room:join", { roomId: created.roomId, username: "Third" })
    const seat = await thirdSeatP
    expect(seat.playerId).toBeTruthy()

    const late = states.at(-1)
    expect(late?.players.find((player) => player.name === "CapHost")?.connectionState).toBe("dropped")
    expect(connections.some((state) => state === "reconnecting")).toBe(true)
    expect(hostSeat.resumeToken).toBeTruthy()

    racer.disconnect()
    third.disconnect()
  }, 30_000)
})