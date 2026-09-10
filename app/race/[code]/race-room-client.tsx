"use client"

import { useState } from "react"
import { CountdownOverlay } from "@/components/multiplayer/countdown-overlay"
import { RaceResults } from "@/components/multiplayer/race-results"
import { RaceView } from "@/components/multiplayer/race-view"
import { RoomLobby } from "@/components/multiplayer/room-lobby"
import { useMultiplayer } from "@/components/multiplayer/multiplayer-provider"
import { useSocket } from "@/components/multiplayer/socket-provider"

export function RaceRoomClient({ code: rawCode }: { code: string }) {
  const code = rawCode.toUpperCase()
  const { roomState, countdown, raceText, finalLeaderboard, error, joinRoom } = useMultiplayer()
  const { socket } = useSocket()
  const [username, setUsername] = useState("")
  const matchingRoom = roomState?.roomId === code ? roomState : null
  const isSpectator = matchingRoom?.players.find((player) => player.id === socket.id)?.spectator ?? false

  if (!matchingRoom) return <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-site items-center justify-center px-6 py-10"><form onSubmit={(event) => { event.preventDefault(); joinRoom(code, username) }} className="w-full max-w-md rounded-3xl border border-border/70 bg-card/75 p-7 shadow-xl shadow-primary/5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Join race</p><h1 className="mt-2 text-3xl font-semibold">Room {code}</h1><p className="mt-2 text-sm text-muted-foreground">Choose a name to enter this room.</p><input value={username} onChange={(event) => setUsername(event.target.value)} className="field mt-6" placeholder="Your name" maxLength={20} required /><button className="button-primary mt-4">Join room</button>{error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}</form></main>
  if (countdown !== null) return <><CountdownOverlay count={countdown} words={raceText} /><RaceView spectator={isSpectator} /></>
  if (matchingRoom.status === "waiting") return <RoomLobby room={matchingRoom} />
  if (matchingRoom.status === "finished") return <RaceResults players={finalLeaderboard ?? matchingRoom.players} />
  return <RaceView spectator={isSpectator} />
}
