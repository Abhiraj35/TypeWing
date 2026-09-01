"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMountEffect } from "@/hooks/use-mount-effect"
import { generateWords } from "@/lib/words"
import { accuracyFromCounts, countWpm, wpmNumeratorFromCounts, type TestMode } from "@/lib/wpm-count"
import type { ResultStats, WpmSnapshot } from "@/lib/result-types"

export type TimeOption = 15 | 30 | 60
export type WordOption = 10 | 25 | 50

export const TIME_OPTIONS: TimeOption[] = [15, 30, 60]
export const WORD_OPTIONS: WordOption[] = [10, 25, 50]

const MODE_KEY = "kb-mode"
const TIME_KEY = "kb-time"
const WORD_KEY = "kb-word"

// Enough words that a time test never runs out mid-session.
const POOL_SIZE = 400

interface UseTypingTestProps {
  onTypingActiveChange?: (active: boolean) => void
  onFinished?: (finished: boolean) => void
}

export function useTypingTest({
  onTypingActiveChange,
  onFinished,
}: UseTypingTestProps = {}) {
  const [mode, setMode] = useState<TestMode>("time")
  const [timeOption, setTimeOption] = useState<TimeOption>(30)
  const [wordOption, setWordOption] = useState<WordOption>(25)

  const [words, setWords] = useState<string[]>([])

  const [typed, setTyped] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [wordInputs, setWordInputs] = useState<string[]>([])
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [wpmHistory, setWpmHistory] = useState<WpmSnapshot[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const activeWordRef = useRef<HTMLDivElement | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [frozenStats, setFrozenStats] = useState<ResultStats | null>(null)

  // Cumulative counters (refs so they don't trigger re-renders on every keystroke).
  const correctCharsRef = useRef(0)
  const allTypedRef = useRef(0)
  const errorsThisSecondRef = useRef(0)
  const correctedErrorsRef = useRef(0)

  // ---- WPM / accuracy helpers ------------------------------------------------

  const buildResultStats = useCallback(
    (snapWordInputs: string[] = wordInputs, snapTyped: string = typed, snapWordIndex: number = wordIndex): ResultStats => {
      const elapsed = startTime ? (Date.now() - startTime) / 1000 : elapsedSec
      const elapsedMin = elapsed / 60 || 1 / 60
      const counts = countWpm({
        targetWords: words,
        wordInputs: snapWordInputs,
        typed: snapTyped,
        wordIndex: snapWordIndex,
        mode,
        final: true,
      })
      const wpmValues = wpmHistory.map((s) => s.wpm).filter((v) => v > 0)
      let consistency = 100
      if (wpmValues.length > 1) {
        const mean = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length
        const variance = wpmValues.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmValues.length
        consistency = Math.max(0, Math.round(100 - (Math.sqrt(variance) / (mean || 1)) * 100))
      }
      const computedWpm = Math.round(wpmNumeratorFromCounts(counts) / 5 / elapsedMin)
      const computedRaw = Math.max(Math.round(allTypedRef.current / 5 / elapsedMin), computedWpm)

      return {
        wpm: computedWpm,
        accuracy: accuracyFromCounts(counts),
        raw: computedRaw,
        correctChars: counts.correctWordChars,
        incorrectChars: counts.incorrectChars,
        extraChars: counts.extraChars,
        missedChars: counts.missedChars,
        consistency,
        elapsedSeconds: Math.round(elapsed),
        correctedErrors: correctedErrorsRef.current,
        mode,
        modeDetail: mode === "time" ? String(timeOption) : String(wordOption),
        wpmHistory,
        wordInputs: snapWordInputs,
        targetWords: words,
      }
    },
    [wordInputs, typed, wordIndex, startTime, elapsedSec, words, mode, timeOption, wordOption, wpmHistory],
  )

  const finishTestRef = useRef<() => void>(() => {})

  const finishTest = useCallback(
    (finalStats?: ResultStats) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setFrozenStats(finalStats ?? buildResultStats())
      setFinished(true)
      onFinished?.(true)
      onTypingActiveChange?.(false)
    },
    [buildResultStats, onFinished, onTypingActiveChange],
  )

  // Always point the timer at the latest finishTest so it reads the freshest
  // state (wordInputs/typed/wordIndex) when the time-mode interval fires.
  useEffect(() => {
    finishTestRef.current = finishTest
  }, [finishTest])

  // ---- Restart (with optional overrides) ---------------------------------------

  const resetTestWith = useCallback(
    (overrides?: { mode?: TestMode; timeOption?: TimeOption; wordOption?: WordOption }) => {
      const m = overrides?.mode ?? mode
      const to = overrides?.timeOption ?? timeOption
      const wo = overrides?.wordOption ?? wordOption

      const count = m === "time" ? POOL_SIZE : wo
      setWords(generateWords(count))

      setTyped("")
      setWordIndex(0)
      setWordInputs([])
      setStarted(false)
      setFinished(false)
      setStartTime(null)
      setWpmHistory([])
      setTimeLeft(to)

      correctCharsRef.current = 0
      allTypedRef.current = 0
      errorsThisSecondRef.current = 0
      correctedErrorsRef.current = 0
      setElapsedSec(0)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setFrozenStats(null)

      onFinished?.(false)
      onTypingActiveChange?.(false)
      inputRef.current?.focus()
    },
    [mode, timeOption, wordOption, onFinished, onTypingActiveChange],
  )

  const resetTest = useCallback((overrides?: { mode?: TestMode; timeOption?: TimeOption; wordOption?: WordOption }) => {
    resetTestWith(overrides)
  }, [resetTestWith])

  // Advance to a fresh test (keeps mode/options, generates a new word set).
  const nextTest = useCallback(() => {
    resetTestWith()
  }, [resetTestWith])

  // ---- Initial words + stored preferences on mount -----------------------------

  useMountEffect(() => {
    let storedMode: TestMode | null = null
    let storedTime: TimeOption | null = null
    let storedWord: WordOption | null = null
    try {
      storedMode = localStorage.getItem(MODE_KEY) as TestMode | null
      storedTime = Number(localStorage.getItem(TIME_KEY)) as TimeOption | null
      storedWord = Number(localStorage.getItem(WORD_KEY)) as WordOption | null
    } catch {
      // ignore quota / privacy errors
    }

    const m: TestMode = storedMode === "words" ? "words" : "time"
    const to: TimeOption = [15, 30, 60].includes(storedTime as TimeOption) ? (storedTime as TimeOption) : 30
    const wo: WordOption = [10, 25, 50].includes(storedWord as WordOption) ? (storedWord as WordOption) : 25

    setMode(m)
    setTimeOption(to)
    setWordOption(wo)
    setWords(generateWords(m === "time" ? POOL_SIZE : wo))
    setTimeLeft(to)
  })

  // ---- Inline WPM / accuracy for live display -----------------------------------

  const liveStats = useMemo(() => {
    if (!started || finished) return { wpm: 0, accuracy: 100 }
    const counts = countWpm({
      targetWords: words,
      wordInputs,
      typed,
      wordIndex,
      mode,
      final: false,
    })
    const elapsedMin = elapsedSec / 60
    const wpm = elapsedMin > 0 ? Math.round(wpmNumeratorFromCounts(counts) / 5 / elapsedMin) : 0
    return { wpm, accuracy: accuracyFromCounts(counts) }
  }, [started, finished, words, wordInputs, typed, wordIndex, mode, elapsedSec])

  // ---- Keyboard handling ---------------------------------------------------------

  const startTest = useCallback(() => {
    setStarted(true)
    setStartTime(Date.now())
    onTypingActiveChange?.(true)

    const startedAt = Date.now()
    let lastWpmSek = 0
    timerRef.current = setInterval(() => {
      const sek = (Date.now() - startedAt) / 1000
      setElapsedSec(sek)

      // WPM history snapshot once per second (only meaningful for time mode).
      if (mode === "time" && Math.floor(sek) > lastWpmSek) {
        lastWpmSek = Math.floor(sek)
        const elapsedMin = sek / 60
        const snapWpm = elapsedMin > 0 ? Math.round(correctCharsRef.current / 5 / elapsedMin) : 0
        const snapRaw = elapsedMin > 0 ? Math.max(Math.round(allTypedRef.current / 5 / elapsedMin), snapWpm) : 0
        setWpmHistory((prev) => [...prev, { second: lastWpmSek, wpm: snapWpm, raw: snapRaw, errors: errorsThisSecondRef.current }])
        errorsThisSecondRef.current = 0
      }

      if (mode === "time") {
        if (sek >= timeOption) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          setTimeLeft(0)
          finishTestRef.current()
        } else {
          setTimeLeft(Math.ceil(timeOption - sek))
        }
      }
    }, 250)
  }, [timeOption, mode, onTypingActiveChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (finished) return
      if (e.key.length > 1 && e.key !== "Backspace") return

      const currentWord = words[wordIndex]
      if (currentWord === undefined) return

      if (!started) {
        if (e.key === "Backspace" && typed.length === 0) return
        startTest()
      }

      // Space advances to the next word (and counts toward "correct spaces" stats).
      if (e.key === " ") {
        e.preventDefault()
        if (typed.length === 0) return

        allTypedRef.current += 1
        for (let i = 0; i < Math.min(typed.length, currentWord.length); i++) {
          if (typed[i] !== currentWord[i]) errorsThisSecondRef.current++
        }
        if (typed.length > currentWord.length) errorsThisSecondRef.current++

        const nextInputs = [...wordInputs, typed]
        const nextIndex = wordIndex + 1

        if (mode === "words" && nextIndex >= words.length) {
          setWordInputs(nextInputs)
          finishTest(buildResultStats(nextInputs, "", nextIndex))
          return
        }

        setWordInputs(nextInputs)
        setWordIndex(nextIndex)
        setTyped("")
        return
      }

      // Backspace: within the current word, or step back to the previous word.
      if (e.key === "Backspace") {
        if (typed.length === 0 && wordIndex > 0) {
          const prevInput = wordInputs[wordIndex - 1]
          setWordIndex((prev) => prev - 1)
          setTyped(prevInput)
          setWordInputs((prev) => prev.slice(0, -1))
        } else if (typed.length > 0) {
          const lastIdx = typed.length - 1
          const isWrong = lastIdx >= currentWord.length || typed[lastIdx] !== currentWord[lastIdx]
          if (isWrong) correctedErrorsRef.current += 1
          else if (correctCharsRef.current > 0) correctCharsRef.current -= 1
          setTyped((prev) => prev.slice(0, -1))
        }
        return
      }

      // Printable character.
      if (e.key.length === 1) {
        allTypedRef.current += 1
        const nextTyped = typed + e.key
        setTyped(nextTyped)

        // Tally correctly typed characters for live per-second WPM.
        const charIdx = typed.length
        if (charIdx < currentWord.length && e.key === currentWord[charIdx]) correctCharsRef.current += 1

        // For word mode: finishing the last word completes the test.
        if (mode === "words" && wordIndex === words.length - 1 && nextTyped === currentWord) {
          for (let i = 0; i < Math.min(nextTyped.length, currentWord.length); i++) {
            if (nextTyped[i] !== currentWord[i]) errorsThisSecondRef.current++
          }
          if (nextTyped.length > currentWord.length) errorsThisSecondRef.current++
          const nextInputs = [...wordInputs, nextTyped]
          setWordInputs(nextInputs)
          finishTest(buildResultStats(nextInputs, "", wordIndex + 1))
        }
      }
    },
    [
      finished, started, words, wordIndex, typed, wordInputs, mode,
      startTest, finishTest, buildResultStats,
    ],
  )

  // ---- Mode / option changes (persist + reset) ----------------------------------

  const onModeChange = useCallback(
    (m: TestMode) => {
      setMode(m)
      try {
        localStorage.setItem(MODE_KEY, m)
      } catch {
        /* ignore */
      }
      resetTest({ mode: m })
    },
    [resetTest],
  )

  const onTimeOptionChange = useCallback(
    (t: TimeOption) => {
      setTimeOption(t)
      try {
        localStorage.setItem(TIME_KEY, String(t))
      } catch {
        /* ignore */
      }
      resetTest({ timeOption: t })
    },
    [resetTest],
  )

  const onWordOptionChange = useCallback(
    (w: WordOption) => {
      setWordOption(w)
      try {
        localStorage.setItem(WORD_KEY, String(w))
      } catch {
        /* ignore */
      }
      resetTest({ wordOption: w })
    },
    [resetTest],
  )

  // Re-focus the hidden input when clicking anywhere on the words container.
  const handleFocus = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return {
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
    wpm: liveStats.wpm,
    accuracy: liveStats.accuracy,
    frozenStats,
    inputRef,
    activeWordRef,
    handleKeyDown,
    handleFocus,
    onRestart: resetTest,
    onNext: nextTest,
    onModeChange,
    onTimeOptionChange,
    onWordOptionChange,
  } as const
}

export type UseTypingTestReturn = ReturnType<typeof useTypingTest>