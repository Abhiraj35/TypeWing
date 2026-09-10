"use client"

import { useState } from "react"
import { Check, Copy, Play, UsersThree } from "@phosphor-icons/react"
import type { RoomState } from "@shared/types"
import { useMultiplayer } from "./multiplayer-provider"
import { useSocket } from "@/components/multiplayer/socket-provider"

export function RoomLobby({ room }: { room: RoomState }) {
  const { socket } = useSocket()
  const { startGame } = useMultiplayer()
  const [copied, setCopied] = useState(false)
  const isHost = room.hostId === socket.id
  const activePlayers = room.players.filter((player) => !player.spectator)
  const copyCode = async () => {
    await navigator.clipboard?.writeText(room.roomId)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-site items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-border/70 bg-card/75 p-6 shadow-xl shadow-primary/5 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Waiting room</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Ready when you are.</h1><p className="mt-2 text-sm text-muted-foreground">Share the code, then start the race when everyone has joined.</p></div><button type="button" onClick={copyCode} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm font-semibold tracking-[0.2em] transition-colors hover:bg-muted" aria-label="Copy room code">{room.roomId}<span className="ml-1 tracking-normal text-muted-foreground">{copied ? <Check size={15} /> : <Copy size={15} />}</span></button></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3"><Info label="Words" value={String(room.config.wordCount)} /><Info label="Players" value={`${activePlayers.length}/${room.config.maxPlayers}`} /><Info label="Time limit" value={`${room.config.timeLimit}s`} /></div>
        <div className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Players</h2><span className="text-xs text-muted-foreground">{room.players.length} connected</span></div><div className="space-y-2">{room.players.map((player) => <div key={player.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3"><span className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full bg-emerald-500" />{player.name}{player.id === room.hostId && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">host</span>}</span>{player.spectator && <span className="text-xs text-muted-foreground">watching</span>}</div>)}</div></div>
        {isHost ? <button type="button" onClick={startGame} disabled={activePlayers.length < 2} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"><Play size={16} weight="fill" />{activePlayers.length < 2 ? "Waiting for another player" : "Start race"}</button> : <div className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground"><UsersThree size={17} />Waiting for the host to start</div>}
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/60 bg-background/50 px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg font-semibold">{value}</p></div> }
