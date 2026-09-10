"use client"

import { motion } from "motion/react"
import type { Player } from "@shared/types"
import { cn } from "@/lib/utils"

export function RaceTrack({ players, currentPlayerId }: { players: Player[]; currentPlayerId?: string }) {
  const racers = players.filter((player) => !player.spectator)
  const spectators = players.filter((player) => player.spectator)
  return (
    <section aria-label="Live race standings" className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-xs sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live race</p>
          <h2 className="mt-1 text-lg font-semibold">Current standings</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{racers.length} racing</span>
      </div>
      <div className="space-y-3">
        {racers.map((player) => (
          <div key={player.id} className={cn("rounded-xl px-2 py-1.5", player.id === currentPlayerId && "bg-primary/5")}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">
                {player.name}{player.id === currentPlayerId && <span className="ml-1.5 text-xs text-primary">you</span>}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{player.wpm} wpm · {player.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${player.progress}%` }} transition={{ duration: 0.25 }} />
            </div>
          </div>
        ))}
      </div>
      {spectators.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Watching: {spectators.map((player) => player.name).join(", ")}</p>}
    </section>
  )
}
