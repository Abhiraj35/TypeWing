"use client"

import { useEffect, useRef } from "react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { useSettings } from "@/components/settings-context"
import { WordItem } from "@/components/word-item"
import { useMultiplayerTyping } from "@/hooks/use-multiplayer-typing"
import { useMultiplayer } from "./multiplayer-provider"
import { useSocket } from "@/components/multiplayer/socket-provider"
import { RaceTrack } from "@/components/multiplayer/race-track"

export function RaceView({ spectator = false }: { spectator?: boolean }) {
  const reduceMotion = useReducedMotion()
  const { fontCssFamily } = useSettings()
  const { socket } = useSocket()
  const { roomState, raceText, raceStartedAt, timeRemaining, isRacing, sendProgress, sendFinished } = useMultiplayer()
  const typing = useMultiplayerTyping(raceText, spectator ? null : raceStartedAt)
  const latest = useRef({ wpm: typing.wpm, progress: typing.progress })
  const sentFinish = useRef<number | null>(null)
  latest.current = { wpm: typing.wpm, progress: typing.progress }

  useEffect(() => {
    if (!isRacing || spectator || typing.finished) return
    const timer = window.setInterval(() => sendProgress(latest.current.wpm, latest.current.progress), 300)
    return () => window.clearInterval(timer)
  }, [isRacing, sendProgress, spectator, typing.finished])

  useEffect(() => {
    if (!typing.finished || spectator || !raceStartedAt || sentFinish.current === raceStartedAt) return
    sentFinish.current = raceStartedAt
    sendFinished(typing.wpm)
  }, [typing.finished, typing.wpm, raceStartedAt, sendFinished, spectator])

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-site flex-col gap-5 px-6 pt-5 pb-10">
      <RaceTrack players={roomState?.players ?? []} currentPlayerId={socket.id} />
      {spectator ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border/80 p-10 text-center">
          <div><p className="font-semibold">You&apos;re watching this race</p><p className="mt-1 text-sm text-muted-foreground">You can join the next round when the race ends.</p></div>
        </div>
      ) : (
        <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-xs sm:p-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Typewing race</p><p className="mt-1 text-sm text-muted-foreground">{typing.finished ? "Finished — waiting for the race to end" : `Words remaining: ${Math.max(0, raceText.length - typing.wordIndex)}`}</p></div>
            <div className="text-right font-mono text-sm"><span className="text-2xl font-semibold text-primary">{typing.wpm}</span><span className="ml-1 text-muted-foreground">wpm</span><p className="mt-1 text-xs text-muted-foreground">{typing.accuracy}% accuracy</p><p className="mt-1 text-xs font-semibold text-foreground">{formatRaceTime(timeRemaining)} left</p></div>
          </div>
          <div onClick={() => typing.inputRef.current?.focus()} className="relative cursor-text select-none">
            <div className="relative overflow-hidden" style={{ fontFamily: fontCssFamily, fontSize: "clamp(1.65rem, 2.3vw, 2.05rem)", height: "calc(5.2em + 0.5rem)" }}>
              <input ref={typing.inputRef} aria-label="Multiplayer typing input" className="absolute opacity-0" onKeyDown={typing.handleKeyDown} value={typing.typed} onChange={() => {}} autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} />
              <span className="sr-only">Current word: {raceText[typing.wordIndex] ?? ""}</span>
              {typing.rowOffset > 0 && <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-linear-to-b from-card to-transparent" />}
              <LayoutGroup id="multiplayer-words"><motion.div className="flex flex-wrap gap-x-3.5 gap-y-2 leading-relaxed" animate={{ y: -typing.rowOffset }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}>
                {raceText.slice(0, Math.min(raceText.length, typing.wordIndex + 30)).map((word, index) => <WordItem key={`${word}-${index}`} word={word} displayInput={index === typing.wordIndex ? typing.typed : index < typing.wordIndex ? typing.wordInputs[index] ?? "" : ""} isActive={index === typing.wordIndex} isPast={index < typing.wordIndex} elemRef={index === typing.wordIndex ? typing.activeWordRef : undefined} />)}
              </motion.div></LayoutGroup>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

function formatRaceTime(milliseconds: number | null): string {
  if (milliseconds === null) return "--:--"
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}
