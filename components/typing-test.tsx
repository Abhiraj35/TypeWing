"use client"

import { useEffect, useRef } from "react"
import { ArrowClockwise, CaretRight, Clock, TextAa } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { WordItem } from "@/components/word-item"
import { useSettings } from "@/components/settings-context"
import {
  TIME_OPTIONS,
  WORD_OPTIONS,
  useTypingTest,
  type TimeOption,
  type WordOption,
} from "@/hooks/use-typing-test"
import type { TestMode } from "@/lib/wpm-count"
import { cn } from "@/lib/utils"

export function TypingTest() {
  const { fontCssFamily } = useSettings()

  const {
    mode,
    timeOption,
    wordOption,
    words,
    typed,
    wordIndex,
    wordInputs,
    started,
    finished,
    timeLeft,
    wpm,
    accuracy,
    frozenStats,
    inputRef,
    activeWordRef,
    handleKeyDown,
    handleFocus,
    onRestart,
    onModeChange,
    onTimeOptionChange,
    onWordOptionChange,
  } = useTypingTest()

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const targetRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  // Smoothly scroll the word viewport so the active word stays vertically
  // centered. Re-centring absorbs any layout reflow (e.g. overtyping a word)
  // into gentle motion instead of a sudden jump.
  useEffect(() => {
    const container = scrollRef.current
    const active = activeWordRef.current
    if (!container || !active || finished) return

    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll <= 0) return

    const target = active.offsetTop - container.clientHeight / 2 + active.offsetHeight / 2
    targetRef.current = Math.max(0, Math.min(target, maxScroll))

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const startTop = container.scrollTop
    const delta = targetRef.current - startTop
    const duration = 260
    const startMs = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - startMs) / duration)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      container.scrollTop = startTop + delta * eased
      if (t < 1 && container.scrollTop !== targetRef.current) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [wordIndex, typed, finished, activeWordRef])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-site flex-col px-6 py-8">
      <ModeSelector
        mode={mode}
        timeOption={timeOption}
        wordOption={wordOption}
        onModeChange={onModeChange}
        onTimeOptionChange={onTimeOptionChange}
        onWordOptionChange={onWordOptionChange}
        onRestart={() => onRestart()}
        disabled={started}
      />

      <div className="flex flex-1 flex-col items-center justify-center">
        {finished && frozenStats ? (
          <ResultsPanel stats={frozenStats} onRestart={() => onRestart()} />
        ) : (
          <div className="w-full">
            <TestMeta
              started={started}
              mode={mode}
              timeLeft={timeLeft}
              finished={finished}
              wpm={wpm}
              accuracy={accuracy}
            />

            <div
              onClick={handleFocus}
              className="mt-6 w-full cursor-text select-none"
            >
              <div
                ref={scrollRef}
                className="relative flex flex-wrap gap-x-2.5 gap-y-1 leading-relaxed overflow-hidden"
                style={{
                  fontFamily: fontCssFamily,
                  height: "5em",
                }}
              >
                <input
                  ref={inputRef}
                  aria-label="Typing test input"
                  aria-describedby="active-word-instruction"
                  className="absolute opacity-0"
                  onKeyDown={handleKeyDown}
                  value={typed}
                  onChange={() => {}}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <span id="active-word-instruction" className="sr-only">
                  Current word: {words[wordIndex] ?? ""}
                </span>

                {(() => {
                  const start = 0
                  const end = Math.min(words.length, wordIndex + 30)
                  return words.slice(start, end).map((word, i) => {
                    const idx = start + i
                    const isActive = idx === wordIndex
                    const isPast = idx < wordIndex
                    const displayInput = isActive ? typed : isPast ? wordInputs[idx] ?? "" : ""
                    const hasError = isPast && wordInputs[idx] !== word
                    return (
                      <WordItem
                        key={`${word}-${idx}`}
                        word={word}
                        displayInput={displayInput}
                        isActive={isActive}
                        isPast={isPast}
                        hasError={hasError}
                        elemRef={isActive ? activeWordRef : undefined}
                      />
                    )
                  })
                })()}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onRestart()}
                aria-label="Restart test"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowClockwise size={14} aria-hidden />
                Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ---- Mode / option selector ------------------------------------------------------

function ModeSelector({
  mode,
  timeOption,
  wordOption,
  onModeChange,
  onTimeOptionChange,
  onWordOptionChange,
  onRestart,
  disabled,
}: {
  mode: TestMode
  timeOption: TimeOption
  wordOption: WordOption
  onModeChange: (m: TestMode) => void
  onTimeOptionChange: (t: TimeOption) => void
  onWordOptionChange: (w: WordOption) => void
  onRestart: () => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => onModeChange("time")}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
            mode === "time"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Clock size={14} aria-hidden />
          time
        </button>
        <button
          type="button"
          onClick={() => onModeChange("words")}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
            mode === "words"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <TextAa size={14} aria-hidden />
          words
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {(mode === "time" ? TIME_OPTIONS : WORD_OPTIONS).map((opt) => {
          const selected = mode === "time" ? timeOption === opt : wordOption === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                mode === "time" ? onTimeOptionChange(opt as TimeOption) : onWordOptionChange(opt as WordOption)
              }
              disabled={disabled}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Restart"
      >
        <CaretRight size={14} aria-hidden />
      </button>
    </div>
  )
}

// ---- Metadata row (timer / wpm / accuracy) ---------------------------------------

function TestMeta({
  started,
  mode,
  timeLeft,
  finished,
  wpm,
  accuracy,
}: {
  started: boolean
  mode: TestMode
  timeLeft: number
  finished: boolean
  wpm: number
  accuracy: number
}) {
  return (
    <div className="flex items-center justify-between text-sm tabular-nums text-muted-foreground">
      <span className="w-24" />
      <span className="text-sm font-mono">
        {mode === "time" ? timeLeft : ""}
      </span>
      <div className="flex w-24 items-center justify-end gap-3">
        {started && !finished && (
          <>
            <span>{wpm} wpm</span>
            <span>{accuracy}%</span>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Inline results (full results screen lands in Feature 4) ----------------------

function ResultsPanel({
  stats,
  onRestart,
}: {
  stats: NonNullable<ReturnType<typeof useTypingTest>["frozenStats"]>
  onRestart: () => void
}) {
  const items = [
    { label: "wpm", value: stats.wpm },
    { label: "acc", value: `${stats.accuracy}%` },
    { label: "raw", value: stats.raw },
    { label: "consistency", value: `${stats.consistency}%` },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md"
    >
      <div className="grid grid-cols-4 gap-4 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-3xl font-semibold tabular-nums">{item.value}</p>
            <p className="mt-1 text-[11px] tracking-widest text-muted-foreground uppercase">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowClockwise size={14} aria-hidden />
          Restart
        </button>
      </div>
    </motion.div>
  )
}