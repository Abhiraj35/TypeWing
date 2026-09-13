"use client"

import { motion } from "motion/react"
import type { Player } from "@shared/types"
import { cn } from "@/lib/utils"

export function RaceTrack({ players, currentPlayerId }: { players: Player[]; currentPlayerId?: string }) {
  const racers = players.filter((player) => !player.spectator)
  const spectators = players.filter((player) => player.spectator)

  // Server keeps the array sorted by standing (buildLeaderboard), so position
  // is rank. During the race only the top 3 are shown; the rest appear once
  // the race ends (RaceResults).
  const ranked = racers.map((player, index) => ({ player, rank: index + 1 }))
  const podium = ranked.slice(0, 3)
  const you = ranked.find((entry) => entry.player.id === currentPlayerId && entry.rank > 3)
  const hiddenCount = ranked.length - podium.length - (you ? 1 : 0)

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
        {podium.map(({ player, rank }) => (
          <StandingRow key={player.id} player={player} rank={rank} isYou={player.id === currentPlayerId} />
        ))}

        {you && (
          <>
            <div className="flex items-center gap-3 py-0.5">
              <span className="h-px flex-1 bg-border/70" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your position · #{you.rank}</span>
              <span className="h-px flex-1 bg-border/70" />
            </div>
            <StandingRow player={you.player} rank={you.rank} isYou />
          </>
        )}

        {hiddenCount > 0 && (
          <p className="flex items-center gap-3 pt-0.5">
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-xs text-muted-foreground">{hiddenCount} more racers</span>
            <span className="h-px flex-1 bg-border/70" />
          </p>
        )}
      </div>

      {spectators.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Watching: {spectators.map((player) => player.name).join(", ")}</p>}
    </section>
  )
}

function StandingRow({ player, rank, isYou }: { player: Player; rank: number; isYou: boolean }) {
  return (
    <div className={cn("rounded-xl px-2 py-1.5", isYou && "bg-primary/5")}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span
            className={cn(
              "w-4 shrink-0 text-center font-mono text-xs tabular-nums",
              rank === 1 ? "font-bold text-amber-500" : rank <= 3 ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {rank}
          </span>
          <span className="min-w-0 truncate font-medium">
            {player.name}
            {isYou && <span className="ml-1.5 text-xs text-primary">you</span>}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{player.wpm} wpm · {player.progress}%</span>
      </div>
      <div className="ml-6 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${player.progress}%` }} transition={{ duration: 0.25 }} />
      </div>
    </div>
  )
}