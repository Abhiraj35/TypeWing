import { customAlphabet } from "nanoid"
import { randomBytes } from "node:crypto"
import type { ConnectionState, Player, RoomConfig, RoomState, RoomStatus } from "@shared/types"
import {
  DEFAULT_MAX_PLAYERS,
  DEFAULT_TIME_LIMIT,
  DEFAULT_WORD_COUNT,
  FINISHED_ROOM_CLEANUP_MS,
  MAX_PLAYER_OPTIONS,
  MAX_ROOMS_PER_IP,
  STALE_ROOM_MINUTES,
  TIME_LIMIT_OPTIONS,
  WORD_COUNT_OPTIONS,
} from "./constants"

export interface InternalPlayer {
  playerId: string
  name: string
  resumeToken: string
  socketId: string | null
  connectionState: ConnectionState
  seatExpiresAt: number | null
  seatExpiryTimer: ReturnType<typeof setTimeout> | null
  wpm: number
  progress: number
  finishTime: number | null
  rank: number | null
  spectator: boolean
}

export interface Room {
  id: string
  hostId: string
  status: RoomStatus
  players: Map<string, InternalPlayer>
  config: RoomConfig
  text: string[] | null
  countdownStartAt: number | null
  startTime: number | null
  createdAt: number
  createdByIp: string
  gameTimer: ReturnType<typeof setTimeout> | null
  countdownTimer: ReturnType<typeof setTimeout> | null
  cleanupTimer: ReturnType<typeof setTimeout> | null
  rematchVotes: Set<string>
}

const rooms = new Map<string, Room>()
const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6)

/** Server issued seat identity; survives socket churn. */
export function newPlayerId(): string {
  return randomBytes(9).toString("hex")
}

/** Secret seat recovery token. Leaves the server exactly once, to the owning socket. */
export function newResumeToken(): string {
  return randomBytes(32).toString("base64url")
}

export function normalizeConfig(input: Partial<RoomConfig> | null | undefined): RoomConfig {
  const nearest = (value: unknown, options: readonly number[], fallback: number) => {
    const number = typeof value === "number" && Number.isFinite(value) ? value : fallback
    return options.reduce((closest, option) =>
      Math.abs(option - number) < Math.abs(closest - number) ? option : closest,
    fallback)
  }
  return {
    wordCount: nearest(input?.wordCount, WORD_COUNT_OPTIONS, DEFAULT_WORD_COUNT),
    maxPlayers: nearest(input?.maxPlayers, MAX_PLAYER_OPTIONS, DEFAULT_MAX_PLAYERS),
    timeLimit: nearest(input?.timeLimit, TIME_LIMIT_OPTIONS, DEFAULT_TIME_LIMIT),
  }
}

export function validateUsername(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().slice(0, 20).replace(/\p{Cc}/gu, "")
  return trimmed.length > 0 ? trimmed : null
}

function uniqueName(room: Room, requestedName: string): string {
  const names = new Set([...room.players.values()].map((player) => player.name.toLowerCase()))
  if (!names.has(requestedName.toLowerCase())) return requestedName
  let suffix = 2
  while (suffix < 1000) {
    const base = requestedName.slice(0, Math.max(1, 20 - ` (${suffix})`.length))
    const candidate = `${base} (${suffix})`
    if (!names.has(candidate.toLowerCase())) return candidate
    suffix += 1
  }
  return `${requestedName.slice(0, 14)} (${Date.now() % 100000})`
}

function newRoomId(): string {
  let id = roomCode()
  while (rooms.has(id)) id = roomCode()
  return id
}

function seat(
  playerId: string,
  socketId: string,
  name: string,
  resumeToken: string,
  spectator: boolean,
): InternalPlayer {
  return {
    playerId,
    name,
    resumeToken,
    socketId,
    connectionState: "connected",
    seatExpiresAt: null,
    seatExpiryTimer: null,
    wpm: 0,
    progress: 0,
    finishTime: null,
    rank: null,
    spectator,
  }
}

export function createRoom(
  socketId: string,
  hostName: string,
  inputConfig: Partial<RoomConfig> | undefined,
  ip: string,
): { room: Room; playerId: string; resumeToken: string } | null {
  const activeRoomsFromIp = [...rooms.values()].filter((room) => room.createdByIp === ip).length
  if (activeRoomsFromIp >= MAX_ROOMS_PER_IP) return null

  const playerId = newPlayerId()
  const resumeToken = newResumeToken()
  const room: Room = {
    id: newRoomId(),
    hostId: playerId,
    status: "waiting",
    players: new Map([[playerId, seat(playerId, socketId, validateUsername(hostName)!, resumeToken, false)]]),
    config: normalizeConfig(inputConfig),
    text: null,
    countdownStartAt: null,
    startTime: null,
    createdAt: Date.now(),
    createdByIp: ip,
    gameTimer: null,
    countdownTimer: null,
    cleanupTimer: null,
    rematchVotes: new Set(),
  }
  rooms.set(room.id, room)
  return { room, playerId, resumeToken }
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase())
}

export function joinRoom(
  roomId: string,
  socketId: string,
  username: string,
): { room: Room; playerId: string; resumeToken: string; spectator: boolean } | null {
  const room = getRoom(roomId)
  if (!room || room.status === "finished") return null
  const spectator = room.status !== "waiting"
  // Held seats (connected or in grace) count toward maxPlayers so a room
  // cannot silently overfill while someone is reconnecting.
  const heldSeats = [...room.players.values()].filter((player) => player.connectionState !== "dropped").length
  if (heldSeats >= room.config.maxPlayers) return null
  const activePlayers = [...room.players.values()].filter(
    (player) => !player.spectator && player.connectionState !== "dropped",
  ).length
  if (!spectator && activePlayers >= room.config.maxPlayers) return null
  const name = uniqueName(room, username)
  const playerId = newPlayerId()
  const resumeToken = newResumeToken()
  room.players.set(playerId, seat(playerId, socketId, name, resumeToken, spectator))
  return { room, playerId, resumeToken, spectator }
}

export function findPlayerBySocketId(room: Room, socketId: string): InternalPlayer | undefined {
  for (const player of room.players.values()) if (player.socketId === socketId) return player
  return undefined
}

export function findSeatByToken(room: Room, resumeToken: string): InternalPlayer | undefined {
  for (const player of room.players.values()) if (player.resumeToken === resumeToken) return player
  return undefined
}

export function findRoomForPlayer(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    for (const player of room.players.values()) {
      if (player.socketId === socketId) return room
    }
  }
  return undefined
}

export function clearSeatExpiry(player: InternalPlayer): void {
  if (player.seatExpiryTimer) {
    clearTimeout(player.seatExpiryTimer)
    player.seatExpiryTimer = null
  }
}

/**
 * Marks a seat reconnecting and schedules its grace window. The expiry timer
 * is a no-op when the seat or room is already gone (resumed, dropped, or the
 * room was removed), and it is unref'd so the process can still exit.
 */
export function scheduleSeatExpiry(
  room: Room,
  player: InternalPlayer,
  graceMs: number,
  onExpired: (room: Room, player: InternalPlayer) => void,
): void {
  if (player.seatExpiryTimer) clearTimeout(player.seatExpiryTimer)
  player.seatExpiryTimer = setTimeout(() => {
    player.seatExpiryTimer = null
    if (!rooms.has(room.id)) return
    const seatInRoom = room.players.get(player.playerId)
    if (!seatInRoom || seatInRoom !== player) return
    if (seatInRoom.connectionState !== "reconnecting") return
    seatInRoom.connectionState = "dropped"
    seatInRoom.seatExpiresAt = null
    seatInRoom.socketId = null
    onExpired(room, seatInRoom)
  }, graceMs)
  player.seatExpiryTimer.unref?.()
}

export function seatDisconnected(
  socketId: string,
  graceMs: number,
  onSeatExpired: (room: Room, player: InternalPlayer) => void,
): { room: Room; player: InternalPlayer } | null {
  const room = findRoomForPlayer(socketId)
  if (!room) return null
  const player = findPlayerBySocketId(room, socketId)
  if (!player || player.connectionState === "dropped") return null
  player.socketId = null
  player.connectionState = "reconnecting"
  player.seatExpiresAt = Date.now() + graceMs
  scheduleSeatExpiry(room, player, graceMs, onSeatExpired)
  return { room, player }
}

/** Host migration prefers a connected racer, then any connected seat, then a seat still in grace. */
export function migrateHost(room: Room): boolean {
  const seated = [...room.players.values()]
  const connected = seated.filter((player) => player.connectionState === "connected")
  const next =
    connected.find((player) => !player.spectator) ??
    connected[0] ??
    seated.find((player) => player.connectionState === "reconnecting" && !player.spectator) ??
    seated.find((player) => player.connectionState === "reconnecting") ??
    null
  if (!next) return false
  room.hostId = next.playerId
  return true
}

/** True when no seat is connected or in grace; such a room is dead and is removed. */
export function removeIfAbandoned(room: Room): boolean {
  const hasOccupants = [...room.players.values()].some((player) => player.connectionState !== "dropped")
  if (hasOccupants) return false
  clearRoomTimers(room)
  rooms.delete(room.id)
  return true
}

export function clearRoomTimers(room: Room): void {
  if (room.gameTimer) clearTimeout(room.gameTimer)
  if (room.countdownTimer) clearTimeout(room.countdownTimer)
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer)
  room.gameTimer = null
  room.countdownTimer = null
  room.cleanupTimer = null
}

export function scheduleFinishedCleanup(room: Room, onCleanup: () => void): void {
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer)
  room.cleanupTimer = setTimeout(() => {
    if (room.status === "finished") {
      rooms.delete(room.id)
      onCleanup()
    }
  }, FINISHED_ROOM_CLEANUP_MS)
  room.cleanupTimer.unref?.()
}

export function resetForRematch(room: Room): void {
  clearRoomTimers(room)
  // Dropped seats are terminal for the race and are removed at rematch reset.
  for (const [playerId, player] of [...room.players]) {
    if (player.connectionState === "dropped") {
      clearSeatExpiry(player)
      room.players.delete(playerId)
    }
  }
  if (!room.players.has(room.hostId)) migrateHost(room)
  room.status = "waiting"
  room.text = null
  room.countdownStartAt = null
  room.startTime = null
  room.rematchVotes.clear()
  for (const player of room.players.values()) {
    player.wpm = 0
    player.progress = 0
    player.finishTime = null
    player.rank = null
  }
}

export function buildLeaderboard(room: Room): Player[] {
  return [...room.players.entries()]
    .sort(([, a], [, b]) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank
      if (a.rank !== null) return -1
      if (b.rank !== null) return 1
      if (b.progress !== a.progress) return b.progress - a.progress
      return b.wpm - a.wpm
    })
    // Whitelist on purpose: resumeToken and socketId must never reach the wire.
    .map(([, player]) => ({
      playerId: player.playerId,
      name: player.name,
      wpm: player.wpm,
      progress: player.progress,
      finishTime: player.finishTime,
      rank: player.rank,
      spectator: player.spectator,
      connectionState: player.connectionState,
      seatExpiresAt: player.seatExpiresAt,
    }))
}

export function serializeRoom(room: Room): RoomState {
  return {
    roomId: room.id,
    hostId: room.hostId,
    status: room.status,
    players: buildLeaderboard(room),
    config: room.config,
  }
}

export function cleanupStaleRooms(): string[] {
  const cutoff = Date.now() - STALE_ROOM_MINUTES * 60_000
  const removed: string[] = []
  for (const [id, room] of rooms) {
    if (room.status === "waiting" && room.createdAt < cutoff) {
      clearRoomTimers(room)
      rooms.delete(id)
      removed.push(id)
    }
  }
  return removed
}

export function allRooms(): Iterable<Room> {
  return rooms.values()
}