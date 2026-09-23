"use client"

import { SignOut, Trophy } from "@phosphor-icons/react"
import type { Player } from "@shared/types"
import { useMultiplayer } from "./multiplayer-provider"
import { cn } from "@/lib/utils"

export function RaceResults({ players }: { players: Player[] }) {
  const { requestRematch, rematchVotes, lastRaceStartedAt, leaveRoom } = useMultiplayer()
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-site items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-border/70 bg-card/75 p-6 shadow-xl shadow-primary/5 sm:p-9">
        <div className="text-center">
          <Trophy size={32} className="mx-auto text-primary" weight="duotone" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Race complete</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Well typed.</h1>
        </div>

        <div className="mt-8 space-y-2">
          {players.map((player) => {
            const dropped = player.connectionState === "dropped"
            const finished = player.finishTime !== null
            const elapsed = player.finishTime && lastRaceStartedAt
              ? `${Math.max(0, (player.finishTime - lastRaceStartedAt) / 1000).toFixed(1)}s`
              : null
            return (
              <div
                key={player.playerId}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3",
                  dropped && "opacity-75",
                )}
              >
                <span className={cn("w-7 text-center font-mono text-sm", finished ? "text-muted-foreground" : "text-muted-foreground/60")}>
                  {player.rank ?? "—"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {player.name}
                  {dropped && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">dropped</span>}
                  {player.spectator && <span className="ml-2 text-xs text-muted-foreground">spectator</span>}
                </span>
                <span className="text-right">
                  {dropped ? (
                    <span className="flex items-center justify-end gap-1.5 font-mono text-xs font-semibold text-muted-foreground">
                      DNF · {player.progress}%
                    </span>
                  ) : (
                    <>
                      <span className="block font-mono text-sm font-semibold">{player.wpm} wpm</span>
                      <span className="block text-xs text-muted-foreground">{elapsed ?? "—"}</span>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={requestRematch}
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Rematch
          </button>
          <button
            type="button"
            onClick={leaveRoom}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SignOut size={15} />
            Leave room
          </button>
          {rematchVotes && <p className="text-xs text-muted-foreground">{rematchVotes.votes}/{rematchVotes.needed} players voted for a rematch</p>}
        </div>
      </div>
    </main>
  )
}