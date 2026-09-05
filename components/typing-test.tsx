"use client"

import { useEffect, useRef } from "react"
import { ArrowClockwise, CaretRight, Clock, CursorClick, Quotes, TextAa } from "@phosphor-icons/react"
import { ResultsScreen } from "@/components/results-screen"
import { Keyboard } from "@/components/ui/Keyboard"
import { WordItem } from "@/components/word-item"
import { useSettings } from "@/components/settings-context"
import {
  TIME_OPTIONS,
  WORD_OPTIONS,
  useTypingTest,
  type TimeOption,
  type WordOption,
} from "@/hooks/use-typing-test"
import { QUOTE_LENGTHS, type QuoteLength } from "@/lib/quotes"
import type { TestMode } from "@/lib/wpm-count"
import { cn } from "@/lib/utils"

export function TypingTest() {
  const { fontCssFamily, keyboardVisible, keyboardLanguage } = useSettings()

  const {
    mode,
    timeOption,
    wordOption,
    quoteLength,
    quoteAuthor,
    words,
    typed,
    wordIndex,
    wordInputs,
    started,
    finished,
    isFocused,
    timeLeft,
    wpm,
    accuracy,
    frozenStats,
    inputRef,
    activeWordRef,
    handleKeyDown,
    handleFocus,
    handleInputBlur,
    handleInputFocus,
    onRestart,
    onNext,
    onModeChange,
    onTimeOptionChange,
    onWordOptionChange,
    onQuoteLengthChange,
  } = useTypingTest()

  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Keep the active word on screen without constant motion. Instead of
  // re-centering the whole text block on every keystroke (which made the words
  // drift up/down), only scroll when the active word leaves the visible box,
  // and only as far as needed to bring it back - like monkeytype.
  useEffect(() => {
    const container = scrollRef.current
    const active = activeWordRef.current
    if (!container || !active || finished) return

    const maxScroll = container.scrollHeight - container.clientHeight
    if (maxScroll <= 0) return

    const rowBottom = active.offsetTop + active.offsetHeight
    const viewBottom = container.scrollTop + container.clientHeight

    if (rowBottom > viewBottom) {
      container.scrollTo({
        top: Math.min(rowBottom - container.clientHeight, maxScroll),
        behavior: "smooth",
      })
    } else if (active.offsetTop < container.scrollTop) {
      container.scrollTo({ top: active.offsetTop, behavior: "smooth" })
    }
  }, [wordIndex, typed, finished, activeWordRef])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-site flex-col px-6 py-8">
      <ModeSelector
        mode={mode}
        timeOption={timeOption}
        wordOption={wordOption}
        quoteLength={quoteLength}
        quoteAuthor={quoteAuthor}
        onModeChange={onModeChange}
        onTimeOptionChange={onTimeOptionChange}
        onWordOptionChange={onWordOptionChange}
        onQuoteLengthChange={onQuoteLengthChange}
        onRestart={() => onRestart()}
        disabled={started}
      />

      <div className="flex flex-1 flex-col items-center justify-center">
        {finished && frozenStats ? (
          <ResultsScreen
            stats={frozenStats}
            onRestart={() => onRestart()}
            onNext={() => onNext()}
          />
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
                  fontSize: "1.5rem",
                  height: "calc(4.875em + 0.5rem)",
                }}
              >
                <input
                  ref={inputRef}
                  aria-label="Typing test input"
                  aria-describedby="active-word-instruction"
                  className="absolute opacity-0"
                  onKeyDown={handleKeyDown}
                  onBlur={handleInputBlur}
                  onFocus={handleInputFocus}
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
                    return (
                      <WordItem
                        key={`${word}-${idx}`}
                        word={word}
                        displayInput={displayInput}
                        isActive={isActive}
                        isPast={isPast}
                        elemRef={isActive ? activeWordRef : undefined}
                      />
                    )
                  })
                })()}

                {!isFocused && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-background/60 backdrop-blur-sm"
                    aria-label="Click to start"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      <CursorClick size={16} aria-hidden />
                      Click to start
                    </span>
                  </button>
                )}
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

            {keyboardVisible && (
              <div className="mt-8 flex max-w-full justify-center overflow-x-auto">
                <Keyboard
                  language={keyboardLanguage}
                  className={cn(started && !finished && "opacity-75 transition-opacity duration-300")}
                />
              </div>
            )}
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
  quoteLength,
  quoteAuthor,
  onModeChange,
  onTimeOptionChange,
  onWordOptionChange,
  onQuoteLengthChange,
  onRestart,
  disabled,
}: {
  mode: TestMode
  timeOption: TimeOption
  wordOption: WordOption
  quoteLength: QuoteLength
  quoteAuthor: string | null
  onModeChange: (m: TestMode) => void
  onTimeOptionChange: (t: TimeOption) => void
  onWordOptionChange: (w: WordOption) => void
  onQuoteLengthChange: (q: QuoteLength) => void
  onRestart: () => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-center gap-2">
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
          <button
            type="button"
            onClick={() => onModeChange("quotes")}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
              mode === "quotes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <Quotes size={14} aria-hidden />
            quotes
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {mode === "time"
            ? TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onTimeOptionChange(opt)}
                  disabled={disabled}
                  className={cn(
                    "rounded-md px-3 py-1.5 transition-colors",
                    timeOption === opt
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {opt}
                </button>
              ))
            : mode === "words"
              ? WORD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onWordOptionChange(opt)}
                    disabled={disabled}
                    className={cn(
                      "rounded-md px-3 py-1.5 transition-colors",
                      wordOption === opt
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {opt}
                  </button>
                ))
              : QUOTE_LENGTHS.map((ql) => (
                  <button
                    key={ql}
                    type="button"
                    onClick={() => onQuoteLengthChange(ql)}
                    disabled={disabled}
                    className={cn(
                      "rounded-md px-3 py-1.5 transition-colors",
                      quoteLength === ql
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {ql}
                  </button>
                ))}
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

      {mode === "quotes" && quoteAuthor && (
        <span className="text-xs text-muted-foreground">— {quoteAuthor}</span>
      )}
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