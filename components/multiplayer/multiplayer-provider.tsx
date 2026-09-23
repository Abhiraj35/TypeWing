"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { ConnectionState, Player, RoomConfig, RoomState } from "@shared/types"
import { clearSeat, getSeat, storeSeat } from "@/lib/resume-storage"
import { useSocket } from "@/components/multiplayer/socket-provider"

interface MultiplayerContextValue {
  connected: boolean
  roomId: string | null
  roomState: RoomState | null
  countdown: number | null
  raceText: string[]
  isRacing: boolean
  raceStartedAt: number | null
  timeRemaining: number | null
  lastRaceStartedAt: number | null
  finalLeaderboard: Player[] | null
  rematchVotes: { votes: number; needed: number } | null
  myPlayerId: string | null
  resumeProgress: number | null
  error: string | null
  createRoom: (username: string, config: RoomConfig) => void
  joinRoom: (roomId: string, username: string) => void
  startGame: () => void
  sendProgress: (wpm: number, progress: number) => void
  sendFinished: (finalWpm: number) => void
  requestRematch: () => void
  leaveRoom: () => void
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null)

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const { socket, connected } = useSocket()
  const router = useRouter()
  const pathname = usePathname()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [raceText, setRaceText] = useState<string[]>([])
  const [isRacing, setIsRacing] = useState(false)
  const [raceStartedAt, setRaceStartedAt] = useState<number | null>(null)
  const [raceEndsAt, setRaceEndsAt] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [lastRaceStartedAt, setLastRaceStartedAt] = useState<number | null>(null)
  const [finalLeaderboard, setFinalLeaderboard] = useState<Player[] | null>(null)
  const [rematchVotes, setRematchVotes] = useState<{ votes: number; needed: number } | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [resumeProgress, setResumeProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const roomIdRef = useRef<string | null>(null)
  const pendingResumeRef = useRef<string | null>(null)
  const boundRoomRef = useRef<string | null>(null)

  useEffect(() => {
    const onCreated = ({ roomId: createdRoomId }: { roomId: string }) => {
      roomIdRef.current = createdRoomId
      setRoomId(createdRoomId)
      router.push(`/race/${createdRoomId}`)
    }
    const onState = (state: RoomState) => {
      roomIdRef.current = state.roomId
      setRoomId(state.roomId)
      setRoomState(state)
      if (pendingResumeRef.current === state.roomId) pendingResumeRef.current = null
      if (pathname === "/race") router.push(`/race/${state.roomId}`)
    }
    const onNewHost = ({ hostId }: { hostId: string }) => {
      setRoomState((previous) => previous ? { ...previous, hostId } : previous)
    }
    const onSeat = ({ playerId, resumeToken }: { playerId: string; resumeToken: string }) => {
      setMyPlayerId(playerId)
      setResumeProgress(null)
      const roomCode = roomIdRef.current
      boundRoomRef.current = roomCode
      if (roomCode) storeSeat(roomCode, { playerId, resumeToken })
    }
    const onSeatResumed = ({ playerId, progress }: { playerId: string; progress: number }) => {
      setMyPlayerId(playerId)
      setResumeProgress(progress)
      boundRoomRef.current = pendingResumeRef.current
    }
    const onPlayerConnection = ({ playerId, connectionState }: { playerId: string; connectionState: ConnectionState }) => {
      setRoomState((previous) => previous ? {
        ...previous,
        players: previous.players.map((player) => player.playerId === playerId ? { ...player, connectionState } : player),
      } : previous)
    }
    const onCountdown = ({ text, startAt }: { text: string[]; startAt: number }) => {
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current)
      setRaceText(text)
      setIsRacing(false)
      setRaceStartedAt(null)
      countdownTimerRef.current = null
      const update = () => {
        const remaining = Math.max(0, Math.ceil((startAt - Date.now()) / 1000))
        setCountdown(remaining)
        if (remaining === 0 && countdownTimerRef.current !== null) {
          window.clearInterval(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
      }
      update()
      countdownTimerRef.current = window.setInterval(update, 80)
    }
    const onGo = ({ startAt, endsAt }: { startAt: number; endsAt: number }) => {
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
      setCountdown(null)
      setIsRacing(true)
      setRaceStartedAt(startAt)
      setLastRaceStartedAt(startAt)
      setRaceEndsAt(endsAt)
      setTimeRemaining(Math.max(0, endsAt - Date.now()))
    }
    const onLeaderboard = ({ players }: { players: Player[] }) => {
      setRoomState((previous) => previous ? { ...previous, players } : previous)
    }
    const onRanked = ({ playerId, rank }: { playerId: string; rank: number }) => {
      setRoomState((previous) => previous ? {
        ...previous,
        players: previous.players.map((player) => player.playerId === playerId ? { ...player, rank } : player),
      } : previous)
    }
    const onEnd = ({ finalLeaderboard: leaderboard }: { finalLeaderboard: Player[] }) => {
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
      setFinalLeaderboard(leaderboard)
      setIsRacing(false)
      setRaceStartedAt(null)
      setRaceEndsAt(null)
      setTimeRemaining(0)
      setCountdown(null)
      setRoomState((previous) => previous ? { ...previous, status: "finished", players: leaderboard } : previous)
    }
    const onVote = (vote: { votes: number; needed: number }) => setRematchVotes(vote)
    const onRematchStart = () => {
      if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
      setFinalLeaderboard(null)
      setRematchVotes(null)
      setRaceText([])
      setCountdown(null)
      setIsRacing(false)
      setRaceStartedAt(null)
      setRaceEndsAt(null)
      setTimeRemaining(null)
      setResumeProgress(null)
    }
    const onError = (message: string) => {
      if (pendingResumeRef.current && !message.includes("Too many requests")) {
        clearSeat(pendingResumeRef.current)
        pendingResumeRef.current = null
      }
      setError(message)
      window.setTimeout(() => setError(null), 5000)
    }
    const onDisconnect = () => {
      // The seat is held server side for the grace window and resumes by token
      // on the next connect, so local state is kept for an in-place resume.
    }

    socket.on("room:created", onCreated)
    socket.on("room:state", onState)
    socket.on("room:newHost", onNewHost)
    socket.on("player:seat", onSeat)
    socket.on("player:seatResumed", onSeatResumed)
    socket.on("player:connection", onPlayerConnection)
    socket.on("game:countdown", onCountdown)
    socket.on("game:go", onGo)
    socket.on("leaderboard:update", onLeaderboard)
    socket.on("player:ranked", onRanked)
    socket.on("game:end", onEnd)
    socket.on("game:rematchVote", onVote)
    socket.on("game:rematchStart", onRematchStart)
    socket.on("error", onError)
    socket.on("disconnect", onDisconnect)
    return () => {
      socket.off("room:created", onCreated)
      socket.off("room:state", onState)
      socket.off("room:newHost", onNewHost)
      socket.off("player:seat", onSeat)
      socket.off("player:seatResumed", onSeatResumed)
      socket.off("player:connection", onPlayerConnection)
      socket.off("game:countdown", onCountdown)
      socket.off("game:go", onGo)
      socket.off("leaderboard:update", onLeaderboard)
      socket.off("player:ranked", onRanked)
      socket.off("game:end", onEnd)
      socket.off("game:rematchVote", onVote)
      socket.off("game:rematchStart", onRematchStart)
      socket.off("error", onError)
      socket.off("disconnect", onDisconnect)
    }
  }, [pathname, router, socket])

  // On a transport drop, the seat identity still applies to the next socket:
  // clear the bound marker so the next connect emits room:resume again.
  useEffect(() => {
    if (!connected) boundRoomRef.current = null
  }, [connected])

  useEffect(() => {
    if (!connected) return
    const match = /^\/race\/([A-Z2-9]{6})$/i.exec(pathname)
    if (!match) return
    const code = match[1].toUpperCase()
    if (boundRoomRef.current === code) return
    const stored = getSeat(code)
    if (!stored) return
    pendingResumeRef.current = code
    socket.emit("room:resume", { roomId: code, resumeToken: stored.resumeToken })
  }, [connected, pathname, socket])

  useEffect(() => {
    if (!isRacing || !raceEndsAt) return
    const update = () => setTimeRemaining(Math.max(0, raceEndsAt - Date.now()))
    update()
    const timer = window.setInterval(update, 100)
    return () => window.clearInterval(timer)
  }, [isRacing, raceEndsAt])

  const createRoom = useCallback((username: string, config: RoomConfig) => {
    socket.emit("room:create", { username, config })
  }, [socket])
  const joinRoom = useCallback((requestedRoomId: string, username: string) => {
    const normalizedRoomId = requestedRoomId.trim().toUpperCase()
    roomIdRef.current = normalizedRoomId
    setRoomId(normalizedRoomId)
    socket.emit("room:join", { roomId: normalizedRoomId, username })
  }, [socket])
  const startGame = useCallback(() => {
    if (roomId) socket.emit("game:startRequest", { roomId })
  }, [roomId, socket])
  const sendProgress = useCallback((wpm: number, progress: number) => {
    if (roomId) socket.emit("player:progress", { roomId, wpm, progress })
  }, [roomId, socket])
  const sendFinished = useCallback((finalWpm: number) => {
    if (roomId) socket.emit("player:finished", { roomId, finalWpm })
  }, [roomId, socket])
  const requestRematch = useCallback(() => {
    if (roomId) socket.emit("game:rematchRequest", { roomId })
  }, [roomId, socket])
  const leaveRoom = useCallback(() => {
    const code = roomIdRef.current
    if (code) clearSeat(code)
    roomIdRef.current = null
    pendingResumeRef.current = null
    boundRoomRef.current = null
    setMyPlayerId(null)
    setResumeProgress(null)
    setRoomId(null)
    setRoomState(null)
    setCountdown(null)
    setRaceText([])
    setIsRacing(false)
    setRaceStartedAt(null)
    setRaceEndsAt(null)
    setTimeRemaining(null)
    setFinalLeaderboard(null)
    setRematchVotes(null)
    socket.disconnect()
    socket.connect()
    router.push("/race")
  }, [router, socket])

  const value = useMemo(() => ({
    connected, roomId, roomState, countdown, raceText, isRacing, raceStartedAt, timeRemaining, lastRaceStartedAt, finalLeaderboard,
    rematchVotes, myPlayerId, resumeProgress, error, createRoom, joinRoom, startGame, sendProgress, sendFinished, requestRematch, leaveRoom,
  }), [connected, roomId, roomState, countdown, raceText, isRacing, raceStartedAt, timeRemaining, lastRaceStartedAt, finalLeaderboard, rematchVotes, myPlayerId, resumeProgress, error,
    createRoom, joinRoom, startGame, sendProgress, sendFinished, requestRematch, leaveRoom])

  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>
}

export function useMultiplayer(): MultiplayerContextValue {
  const context = useContext(MultiplayerContext)
  if (!context) throw new Error("useMultiplayer must be used within MultiplayerProvider")
  return context
}