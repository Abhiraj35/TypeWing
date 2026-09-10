"use client"

import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { ArrowClockwise, Clock, Quotes, TextAa } from "@phosphor-icons/react"
import { ResultsScreen } from "@/components/results-screen"
import { Keyboard } from "@/components/ui/Keyboard"
import { MacKeyboard } from "@/components/ui/mac-keyboard"
import { WordItem } from "@/components/word-item"
import { useSettings } from "@/components/settings-context"
import {
  TIME_OPTIONS,
  WORD_OPTIONS,
  useTypingTest,
  type TimeOption,
  type WordOption,
} from "@/hooks/use-typing-test"
import { KEYBOARD_SOUND_OPTIONS } from "@/lib/settings-data"
import { QUOTE_LENGTHS, type QuoteLength } from "@/lib/quotes"
import type { TestMode } from "@shared/wpm-count"
import { cn } from "@/lib/utils"

export function TypingTest() {
  const reduceMotion = useReducedMotion()
  const {
    fontCssFamily,
    keyboardVisible,
    keyboardStyle,
    keyboardLanguage,
    keyboardSound,
    keyboardSoundVolume,
  } = useSettings()

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
    rowOffset,
  } = useTypingTest()

  const keyboardProps = {
    language: keyboardLanguage,
    soundConfigUrl:
      KEYBOARD_SOUND_OPTIONS.find((o) => o.id === keyboardSound)?.configUrl ?? null,
    volume: keyboardSoundVolume,
    className: cn(started && !finished && "opacity-75 transition-opacity duration-300"),
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-site flex-col px-6 pt-2 pb-8">
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

      <div className="flex flex-1 flex-col items-center justify-between pt-4 sm:pt-6">
        {finished && frozenStats ? (
          <div className="my-auto flex w-full items-center justify-center py-6">
            <ResultsScreen
              stats={frozenStats}
              onRestart={() => onRestart()}
              onNext={() => onNext()}
            />
          </div>
        ) : (
          <>
            <div className="w-full max-w-5xl">
              <div className="rounded-2xl p-6 sm:p-8">
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
                  className="relative mt-6 w-full cursor-text select-none"
                >
                  <div
                    className="relative overflow-hidden"
                    style={{
                      fontFamily: fontCssFamily,
                      fontSize: "clamp(1.75rem, 2.3vw, 2.05rem)",
                      height: "calc(5.2em + 0.5rem)",
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

                    {rowOffset > 0 && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 bg-linear-to-b from-background to-transparent" />
                    )}

                    <LayoutGroup id="words">
                      <motion.div
                        className="flex flex-wrap gap-x-3.5 gap-y-2 leading-relaxed"
                        animate={{
                          y: -rowOffset,
                          opacity: !isFocused ? 0.15 : 1,
                        }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }
                        }
                      >
                        {words.slice(0, Math.min(words.length, wordIndex + 30)).map((word, i) => {
                            const idx = i
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
                          })}
                      </motion.div>
                    </LayoutGroup>
                  </div>

                  {!isFocused && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.focus()}
                      className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center rounded-xl bg-background/60 backdrop-blur-xs"
                      aria-label="Click or press any key to focus"
                    >
                      <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                        Click or press any key to focus
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {keyboardVisible && (
              <div className="mt-auto flex w-full justify-center pt-6 pb-2">
                {keyboardStyle === "mac" ? (
                  <MacKeyboard {...keyboardProps} />
                ) : (
                  <Keyboard {...keyboardProps} />
                )}
              </div>
            )}
          </>
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
  const getTabClass = (active: boolean) =>
    cn(
      "relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer border-b-2",
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
      disabled && "cursor-not-allowed opacity-50",
    )

  const getOptionClass = (active: boolean) =>
    cn(
      "px-2.5 py-1.5 text-sm font-medium transition-colors cursor-pointer border-b-2",
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
      disabled && "cursor-not-allowed opacity-50",
    )

  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      <div className="flex flex-wrap items-center justify-center rounded-xl border border-border/80 bg-card/60 px-2 py-0.5 shadow-xs backdrop-blur-xs">
        {/* Modes */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onModeChange("time")}
            disabled={disabled}
            className={getTabClass(mode === "time")}
          >
            <Clock size={14} aria-hidden />
            time
          </button>
          <button
            type="button"
            onClick={() => onModeChange("words")}
            disabled={disabled}
            className={getTabClass(mode === "words")}
          >
            <TextAa size={14} aria-hidden />
            words
          </button>
          <button
            type="button"
            onClick={() => onModeChange("quotes")}
            disabled={disabled}
            className={getTabClass(mode === "quotes")}
          >
            <Quotes size={14} aria-hidden />
            quotes
          </button>
        </div>

        {/* Divider */}
        <div className="mx-1.5 h-4 w-px bg-border" aria-hidden />

        {/* Options */}
        <div className="flex items-center">
          {mode === "time"
            ? TIME_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onTimeOptionChange(opt)}
                  disabled={disabled}
                  className={getOptionClass(timeOption === opt)}
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
                    className={getOptionClass(wordOption === opt)}
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
                    className={getOptionClass(quoteLength === ql)}
                  >
                    {ql}
                  </button>
                ))}
        </div>

        {/* Divider */}
        <div className="mx-1.5 h-4 w-px bg-border" aria-hidden />

        {/* Integrated Restart Button */}
        <button
          type="button"
          onClick={onRestart}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          title="Restart test"
          aria-label="Restart"
        >
          <ArrowClockwise size={14} aria-hidden />
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
    <div className="flex items-center justify-between text-base tabular-nums text-muted-foreground">
      <span className="w-28" />
      <span className="text-base sm:text-lg font-mono font-medium" aria-label={mode === "time" ? `Time remaining: ${timeLeft} seconds` : undefined}>
        {mode === "time" ? timeLeft : ""}
      </span>
      <div className="flex w-28 items-center justify-end gap-3 text-sm sm:text-base">
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