import express from "express"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { Server } from "socket.io"
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types"
import { COUNTDOWN_MS } from "./constants"
import { isRateLimited, clearSocketRateLimits } from "./rate-limiter"
import {
  allRooms,
  buildLeaderboard,
  cleanupStaleRooms,
  createRoom,
  findRoomForPlayer,
  getRoom,
  joinRoom,
  removePlayer,
  resetForRematch,
  scheduleFinishedCleanup,
  serializeRoom,
  validateUsername,
  type Room,
} from "./room-manager"
import { getRandomText, validateFinishWpm, validateProgress } from "./game-logic"

const app = express()
app.get("/health", (_request, response) => response.json({ ok: true }))

const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 10_000,
  pingInterval: 5_000,
})

function emitRoomState(room: Room): void {
  io.to(room.id).emit("room:state", serializeRoom(room))
}

function emitError(socketId: string, message: string): void {
  io.to(socketId).emit("error", message)
}

function endGame(room: Room): void {
  if (room.status === "finished") return
  room.status = "finished"
  if (room.gameTimer) clearTimeout(room.gameTimer)
  if (room.countdownTimer) clearTimeout(room.countdownTimer)
  room.gameTimer = null
  room.countdownTimer = null

  const ordered = [...room.players.entries()].sort(([, a], [, b]) => {
    if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime
    if (a.finishTime !== null) return -1
    if (b.finishTime !== null) return 1
    if (b.progress !== a.progress) return b.progress - a.progress
    return b.wpm - a.wpm
  })
  ordered.forEach(([, player], index) => {
    if (player.rank === null) player.rank = index + 1
  })

  const finalLeaderboard = buildLeaderboard(room)
  io.to(room.id).emit("room:state", serializeRoom(room))
  io.to(room.id).emit("game:end", { finalLeaderboard })
  scheduleFinishedCleanup(room, () => undefined)
}

function rateLimited(socketId: string, event: string, limit: number, windowMs: number): boolean {
  if (!isRateLimited(socketId, event, limit, windowMs)) return false
  emitError(socketId, "Too many requests. Please slow down.")
  return true
}

io.on("connection", (socket) => {
  socket.on("room:create", (data) => {
    if (rateLimited(socket.id, "room:create", 3, 60_000)) return
    if (findRoomForPlayer(socket.id)) return emitError(socket.id, "You are already in a room.")
    const username = validateUsername(data?.username)
    if (!username) return emitError(socket.id, "Enter a username to create a room.")
    const ip = socket.handshake.address || "unknown"
    const room = createRoom(socket.id, username, data?.config, ip)
    if (!room) return emitError(socket.id, "This connection has reached its room limit.")
    void socket.join(room.id)
    socket.emit("room:created", { roomId: room.id })
    emitRoomState(room)
  })

  socket.on("room:join", (data) => {
    if (rateLimited(socket.id, "room:join", 5, 10_000)) return
    if (findRoomForPlayer(socket.id)) return emitError(socket.id, "You are already in a room.")
    const username = validateUsername(data?.username)
    const roomId = typeof data?.roomId === "string" ? data.roomId.trim().toUpperCase() : ""
    if (!username || !/^[A-Z2-9]{6}$/.test(roomId)) return emitError(socket.id, "Enter a valid six-character room code.")
    const result = joinRoom(roomId, socket.id, username)
    if (!result) return emitError(socket.id, "That room is full, finished, or no longer available.")
    void socket.join(result.room.id)
    emitRoomState(result.room)
  })

  socket.on("game:startRequest", (data) => {
    if (rateLimited(socket.id, "game:startRequest", 2, 5_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    if (!room || room.hostId !== socket.id) return emitError(socket.id, "Only the host can start the race.")
    if (room.status !== "waiting") return
    const activePlayers = [...room.players.values()].filter((player) => !player.spectator)
    if (activePlayers.length < 2) return emitError(socket.id, "At least two players are needed to start.")

    room.status = "countdown"
    room.text = getRandomText(room.config.wordCount)
    room.startTime = null
    const startAt = Date.now() + COUNTDOWN_MS
    emitRoomState(room)
    io.to(room.id).emit("game:countdown", { text: room.text, startAt })
    room.countdownTimer = setTimeout(() => {
      if (room.status !== "countdown") return
      room.status = "racing"
      room.startTime = Date.now()
      const endsAt = room.startTime + room.config.timeLimit * 1000
      io.to(room.id).emit("room:state", serializeRoom(room))
      io.to(room.id).emit("game:go", { startAt: room.startTime, endsAt })
      room.gameTimer = setTimeout(() => endGame(room), room.config.timeLimit * 1000)
      room.gameTimer.unref?.()
    }, COUNTDOWN_MS)
    room.countdownTimer.unref?.()
  })

  socket.on("player:progress", (data) => {
    if (rateLimited(socket.id, "player:progress", 5, 1_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    const player = room?.players.get(socket.id)
    if (!room || !player || player.spectator || player.finishTime !== null || room.status !== "racing") return
    if (!validateProgress(player, data?.progress, data?.wpm, room)) return
    player.progress = data.progress
    player.wpm = data.wpm
    io.to(room.id).emit("leaderboard:update", { players: buildLeaderboard(room) })
  })

  socket.on("player:finished", (data) => {
    if (rateLimited(socket.id, "player:finished", 2, 5_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    const player = room?.players.get(socket.id)
    if (!room || !player || player.spectator || room.status !== "racing" || player.finishTime !== null) return
    if (!validateFinishWpm(data?.finalWpm, room)) return
    player.finishTime = Date.now()
    player.wpm = data.finalWpm
    player.progress = 100
    player.rank = [...room.players.values()].filter((item) => item.finishTime !== null).length
    io.to(room.id).emit("player:ranked", { playerId: socket.id, rank: player.rank })
    io.to(room.id).emit("leaderboard:update", { players: buildLeaderboard(room) })
    // Finished players are frozen, but the race remains open until the
    // server-owned time limit expires so every result is finalized together.
  })

  socket.on("game:rematchRequest", (data) => {
    if (rateLimited(socket.id, "game:rematchRequest", 3, 10_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    if (!room || room.status !== "finished" || !room.players.has(socket.id)) return
    room.rematchVotes.add(socket.id)
    const needed = Math.max(1, Math.ceil(room.players.size / 2))
    io.to(room.id).emit("game:rematchVote", { votes: room.rematchVotes.size, needed })
    if (room.rematchVotes.size < needed) return
    resetForRematch(room)
    io.to(room.id).emit("game:rematchStart")
    emitRoomState(room)
  })

  socket.on("disconnect", () => {
    const result = removePlayer(socket.id)
    clearSocketRateLimits(socket.id)
    if (!result) return
    const room = result.room
    if (room.players.size === 0) return
    if (result.wasHost) io.to(room.id).emit("room:newHost", { hostId: room.hostId })
    if (room.status === "countdown" || room.status === "racing") {
      const racers = [...room.players.values()].filter((player) => !player.spectator)
      if (racers.length < 2) endGame(room)
    }
    emitRoomState(room)
  })
})

const cleanupInterval = setInterval(() => {
  for (const roomId of cleanupStaleRooms()) io.to(roomId).emit("error", "Room expired due to inactivity.")
}, 60_000)
cleanupInterval.unref?.()

const port = Number(process.env.PORT || 3001)
httpServer.listen(port, () => {
  const address = httpServer.address() as AddressInfo | null
  console.log(`TypeWing multiplayer server listening on ${address?.port ?? port}`)
})

export { app, httpServer, io, endGame }
