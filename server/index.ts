import express from "express"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { Server } from "socket.io"
import type { ClientToServerEvents, ServerToClientEvents } from "@shared/types"
import { COUNTDOWN_MS, SEAT_GRACE_MS } from "./constants"
import { isRateLimited, clearSocketRateLimits } from "./rate-limiter"
import {
  buildLeaderboard,
  cleanupStaleRooms,
  createRoom,
  findPlayerBySocketId,
  findRoomForPlayer,
  findSeatByToken,
  getRoom,
  joinRoom,
  migrateHost,
  removeIfAbandoned,
  resetForRematch,
  scheduleFinishedCleanup,
  seatDisconnected,
  serializeRoom,
  validateUsername,
  type InternalPlayer,
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

function anyRacerLiveOrInGrace(room: Room): boolean {
  for (const player of room.players.values()) {
    if (!player.spectator && player.connectionState !== "dropped") return true
  }
  return false
}

function rateLimited(socketId: string, event: string, limit: number, windowMs: number): boolean {
  if (!isRateLimited(socketId, event, limit, windowMs)) return false
  emitError(socketId, "Too many requests. Please slow down.")
  return true
}

// A held seat's grace window ran out: mark it dropped, migrate the host if it
// was theirs, end the race when no racer stays live or in grace, and drop dead
// rooms so abandoned lobbies and results screens do not linger.
function onSeatExpired(room: Room, player: InternalPlayer): void {
  io.to(room.id).emit("player:connection", {
    playerId: player.playerId,
    connectionState: "dropped",
  })
  if (room.hostId === player.playerId && migrateHost(room)) {
    io.to(room.id).emit("room:newHost", { hostId: room.hostId })
  }
  if (room.status === "countdown" || room.status === "racing") {
    if (!anyRacerLiveOrInGrace(room)) endGame(room)
    else emitRoomState(room)
    return
  }
  if (removeIfAbandoned(room)) return
  emitRoomState(room)
}

io.on("connection", (socket) => {
  socket.on("room:create", async (data) => {
    if (rateLimited(socket.id, "room:create", 3, 60_000)) return
    if (findRoomForPlayer(socket.id)) return emitError(socket.id, "You are already in a room.")
    const username = validateUsername(data?.username)
    if (!username) return emitError(socket.id, "Enter a username to create a room.")
    const ip = socket.handshake.address || "unknown"
    const created = createRoom(socket.id, username, data?.config, ip)
    if (!created) return emitError(socket.id, "This connection has reached its room limit.")
    await socket.join(created.room.id)
    socket.emit("room:created", { roomId: created.room.id })
    socket.emit("player:seat", { playerId: created.playerId, resumeToken: created.resumeToken })
    emitRoomState(created.room)
  })

  socket.on("room:join", async (data) => {
    if (rateLimited(socket.id, "room:join", 5, 10_000)) return
    if (findRoomForPlayer(socket.id)) return emitError(socket.id, "You are already in a room.")
    const username = validateUsername(data?.username)
    const roomId = typeof data?.roomId === "string" ? data.roomId.trim().toUpperCase() : ""
    if (!username || !/^[A-Z2-9]{6}$/.test(roomId)) return emitError(socket.id, "Enter a valid six-character room code.")
    const result = joinRoom(roomId, socket.id, username)
    if (!result) return emitError(socket.id, "That room is full, finished, or no longer available.")
    await socket.join(result.room.id)
    socket.emit("player:seat", { playerId: result.playerId, resumeToken: result.resumeToken })
    emitRoomState(result.room)
    if (result.room.status === "countdown" && result.room.text && result.room.countdownStartAt !== null) {
      socket.emit("game:countdown", { text: result.room.text, startAt: result.room.countdownStartAt })
    } else if (result.room.status === "racing" && result.room.text && result.room.startTime !== null) {
      socket.emit("game:countdown", { text: result.room.text, startAt: result.room.startTime })
      socket.emit("game:go", {
        startAt: result.room.startTime,
        endsAt: result.room.startTime + result.room.config.timeLimit * 1000,
      })
    }
  })

  socket.on("room:resume", async (data) => {
    if (rateLimited(socket.id, "room:resume", 6, 10_000)) return
    const roomId = typeof data?.roomId === "string" ? data.roomId.trim().toUpperCase() : ""
    const resumeToken = typeof data?.resumeToken === "string" ? data.resumeToken : ""
    if (!/^[A-Z2-9]{6}$/.test(roomId) || resumeToken.length === 0) {
      return emitError(socket.id, "This seat could not be resumed.")
    }
    const room = getRoom(roomId)
    if (!room) return emitError(socket.id, "That room is gone.")
    const player = findSeatByToken(room, resumeToken)
    if (!player) return emitError(socket.id, "This seat could not be resumed.")
    if (player.connectionState === "dropped") return emitError(socket.id, "Your seat expired.")
    if (player.socketId !== socket.id) {
      // A second live resume replaces the older connection and kicks it out
      // of the room so only one socket is bound to the seat.
      const previous = player.socketId ? io.sockets.sockets.get(player.socketId) : undefined
      await previous?.leave(room.id)
      player.socketId = socket.id
      player.connectionState = "connected"
      player.seatExpiresAt = null
      if (player.seatExpiryTimer) {
        clearTimeout(player.seatExpiryTimer)
        player.seatExpiryTimer = null
      }
      await socket.join(room.id)
      socket.emit("player:seatResumed", { playerId: player.playerId, progress: player.progress, wpm: player.wpm })
      io.to(room.id).emit("player:connection", { playerId: player.playerId, connectionState: "connected" })
    }
    // Same-socket re-resumes (harmless replay) and fresh resumes both replay
    // the room snapshot so the seat re-renders in place.
    emitRoomState(room)
    if (room.status === "countdown" && room.text && room.countdownStartAt !== null) {
      socket.emit("game:countdown", { text: room.text, startAt: room.countdownStartAt })
    } else if (room.status === "racing" && room.text && room.startTime !== null) {
      socket.emit("game:countdown", { text: room.text, startAt: room.startTime })
      socket.emit("game:go", {
        startAt: room.startTime,
        endsAt: room.startTime + room.config.timeLimit * 1000,
      })
    }
  })

  socket.on("game:startRequest", (data) => {
    if (rateLimited(socket.id, "game:startRequest", 2, 5_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    const host = room ? findPlayerBySocketId(room, socket.id) : undefined
    if (!room || !host || room.hostId !== host.playerId) return emitError(socket.id, "Only the host can start the race.")
    if (room.status !== "waiting") return
    const activePlayers = [...room.players.values()].filter(
      (player) => !player.spectator && player.connectionState !== "dropped",
    )
    if (activePlayers.length < 2) return emitError(socket.id, "At least two players are needed to start.")

    room.status = "countdown"
    room.text = getRandomText(room.config.wordCount)
    room.startTime = null
    const startAt = Date.now() + COUNTDOWN_MS
    room.countdownStartAt = startAt
    emitRoomState(room)
    io.to(room.id).emit("game:countdown", { text: room.text, startAt })
    room.countdownTimer = setTimeout(() => {
      if (room.status !== "countdown") return
      room.status = "racing"
      room.countdownStartAt = null
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
    const player = room ? findPlayerBySocketId(room, socket.id) : undefined
    if (!room || !player || player.connectionState !== "connected" || player.spectator || player.finishTime !== null || room.status !== "racing") return
    if (!validateProgress(player, data?.progress, data?.wpm, room)) return
    player.progress = data.progress
    player.wpm = data.wpm
    io.to(room.id).emit("leaderboard:update", { players: buildLeaderboard(room) })
  })

  socket.on("player:finished", (data) => {
    if (rateLimited(socket.id, "player:finished", 2, 5_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    const player = room ? findPlayerBySocketId(room, socket.id) : undefined
    if (!room || !player || player.connectionState !== "connected" || player.spectator || room.status !== "racing" || player.finishTime !== null) return
    if (!validateFinishWpm(data?.finalWpm, room)) return
    player.finishTime = Date.now()
    player.wpm = data.finalWpm
    player.progress = 100
    player.rank = [...room.players.values()].filter((item) => item.finishTime !== null).length
    io.to(room.id).emit("player:ranked", { playerId: player.playerId, rank: player.rank })
    io.to(room.id).emit("leaderboard:update", { players: buildLeaderboard(room) })
    // Finished players are frozen, but the race remains open until the
    // server-owned time limit expires so every result is finalized together.
  })

  socket.on("game:rematchRequest", (data) => {
    if (rateLimited(socket.id, "game:rematchRequest", 3, 10_000)) return
    const room = typeof data?.roomId === "string" ? getRoom(data.roomId) : undefined
    const player = room ? findPlayerBySocketId(room, socket.id) : undefined
    if (!room || room.status !== "finished" || !player || player.connectionState === "dropped") return
    room.rematchVotes.add(player.playerId)
    const votableSeats = [...room.players.values()].filter((seat) => seat.connectionState === "connected").length
    const needed = Math.max(1, Math.floor(votableSeats / 2) + 1)
    io.to(room.id).emit("game:rematchVote", { votes: room.rematchVotes.size, needed })
    if (room.rematchVotes.size < needed) return
    resetForRematch(room)
    io.to(room.id).emit("game:rematchStart")
    emitRoomState(room)
  })

  socket.on("disconnect", () => {
    // The seat is held for SEAT_GRACE_MS and flips to reconnecting instead of
    // leaving the room; the client resumes it by token on its next connect.
    const result = seatDisconnected(socket.id, SEAT_GRACE_MS, onSeatExpired)
    clearSocketRateLimits(socket.id)
    if (!result) return
    const { room, player } = result
    io.to(room.id).emit("player:connection", { playerId: player.playerId, connectionState: "reconnecting" })
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
  console.log(`Typewing multiplayer server listening on ${address?.port ?? port}`)
})

export { app, httpServer, io, endGame }