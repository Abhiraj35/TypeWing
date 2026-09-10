import { customAlphabet } from "nanoid"
import type { Player, RoomConfig, RoomState, RoomStatus } from "@shared/types"
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
  name: string
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
  const trimmed = value.trim().slice(0, 20).replace(/[^\x20-\x7E]/g, "")
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

export function createRoom(hostId: string, hostName: string, inputConfig: Partial<RoomConfig> | undefined, ip: string): Room | null {
  const activeRoomsFromIp = [...rooms.values()].filter((room) => room.createdByIp === ip).length
  if (activeRoomsFromIp >= MAX_ROOMS_PER_IP) return null

  const room: Room = {
    id: newRoomId(),
    hostId,
    status: "waiting",
    players: new Map([[hostId, {
      name: validateUsername(hostName)!,
      wpm: 0,
      progress: 0,
      finishTime: null,
      rank: null,
      spectator: false,
    }]]),
    config: normalizeConfig(inputConfig),
    text: null,
    startTime: null,
    createdAt: Date.now(),
    createdByIp: ip,
    gameTimer: null,
    countdownTimer: null,
    cleanupTimer: null,
    rematchVotes: new Set(),
  }
  rooms.set(room.id, room)
  return room
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId.toUpperCase())
}

export function joinRoom(roomId: string, socketId: string, username: string): { room: Room; spectator: boolean } | null {
  const room = getRoom(roomId)
  if (!room || room.status === "finished") return null
  const activePlayers = [...room.players.values()].filter((player) => !player.spectator).length
  const spectator = room.status !== "waiting"
  if (!spectator && activePlayers >= room.config.maxPlayers) return null
  const name = uniqueName(room, username)
  room.players.set(socketId, { name, wpm: 0, progress: 0, finishTime: null, rank: null, spectator })
  return { room, spectator }
}

export function findRoomForPlayer(socketId: string): Room | undefined {
  for (const room of rooms.values()) if (room.players.has(socketId)) return room
  return undefined
}

export function removePlayer(socketId: string): { room: Room; wasHost: boolean } | null {
  const room = findRoomForPlayer(socketId)
  if (!room) return null
  const wasHost = room.hostId === socketId
  room.players.delete(socketId)
  if (room.players.size === 0) {
    clearRoomTimers(room)
    rooms.delete(room.id)
    return { room, wasHost }
  }
  if (wasHost) room.hostId = room.players.keys().next().value as string
  return { room, wasHost }
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
  room.status = "waiting"
  room.text = null
  room.startTime = null
  room.rematchVotes.clear()
  for (const player of room.players.values()) {
    player.wpm = 0
    player.progress = 0
    player.finishTime = null
    player.rank = null
    player.spectator = false
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
    .map(([id, player]) => ({ id, ...player }))
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
