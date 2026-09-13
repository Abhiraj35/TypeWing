"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { accuracyFromCounts, countWpm, wpmNumeratorFromCounts } from "@shared/wpm-count"

export function useMultiplayerTyping(words: string[], startedAt: number | null) {
  const [typed, setTyped] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [wordInputs, setWordInputs] = useState<string[]>([])
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [rowOffset, setRowOffset] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeWordRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef<number | null>(null)
  const seenStartRef = useRef<number | null>(null)

  const syncRowOffset = useCallback(() => {
    requestAnimationFrame(() => {
      const word = activeWordRef.current
      if (!word) return
      const lineHeight = word.offsetHeight + 4
      const row = Math.round(word.offsetTop / lineHeight)
      setRowOffset(Math.max(0, row - 1) * lineHeight)
    })
  }, [])

  useEffect(() => {
    if (!startedAt || startedAt === seenStartRef.current || words.length === 0) return
    seenStartRef.current = startedAt
    setTyped("")
    setWordIndex(0)
    setWordInputs([])
    setFinished(false)
    setStarted(true)
    setElapsedSec(0)
    setRowOffset(0)
    startRef.current = startedAt
    inputRef.current?.focus()
  }, [startedAt, words.length])

  useEffect(() => {
    if (!started || finished || !startRef.current) return
    const timer = window.setInterval(() => setElapsedSec((Date.now() - startRef.current!) / 1000), 100)
    return () => window.clearInterval(timer)
  }, [started, finished])

  const stats = useMemo(() => {
    const counts = countWpm({ targetWords: words, wordInputs, typed, wordIndex, mode: "words", final: finished, trailingSpace: !finished })
    const elapsedMin = Math.max(elapsedSec / 60, 1 / 60)
    return {
      wpm: Math.round(wpmNumeratorFromCounts(counts) / 5 / elapsedMin),
      accuracy: accuracyFromCounts(counts),
      progress: words.length === 0 ? 0 : Math.min(100, Math.round(((wordIndex + Math.min(typed.length / Math.max(words[wordIndex]?.length ?? 1, 1), 1)) / words.length) * 100)),
    }
  }, [words, wordInputs, typed, wordIndex, finished, elapsedSec])

  const finish = useCallback((nextInputs: string[], nextTyped: string, nextIndex: number) => {
    setWordInputs(nextInputs)
    setTyped(nextTyped)
    setWordIndex(nextIndex)
    setFinished(true)
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || finished || !startedAt) return
    if (event.key.length > 1 && event.key !== "Backspace" && event.key !== " ") return
    const currentWord = words[wordIndex]
    if (!currentWord) return

    if (event.key === " ") {
      event.preventDefault()
      if (!typed) return
      const nextInputs = [...wordInputs, typed]
      const nextIndex = wordIndex + 1
      if (nextIndex >= words.length) finish(nextInputs, "", nextIndex)
      else {
        setWordInputs(nextInputs)
        setWordIndex(nextIndex)
        setTyped("")
        syncRowOffset()
      }
      return
    }

    if (event.key === "Backspace") {
      if (typed.length === 0 && wordIndex > 0) {
        const previous = wordInputs[wordIndex - 1] ?? ""
        setWordInputs((inputs) => inputs.slice(0, -1))
        setWordIndex((index) => index - 1)
        setTyped(previous)
        syncRowOffset()
      } else setTyped((value) => value.slice(0, -1))
      return
    }

    if (event.key.length === 1) {
      const nextTyped = typed + event.key
      if (wordIndex === words.length - 1 && nextTyped.length >= currentWord.length) {
        finish([...wordInputs, nextTyped], "", wordIndex + 1)
      } else setTyped(nextTyped)
    }
  }, [finished, startedAt, words, wordIndex, typed, wordInputs, finish, syncRowOffset])

  useEffect(() => {
    if (!startedAt) {
      setStarted(false)
      setFinished(false)
      setTyped("")
      setWordInputs([])
      setWordIndex(0)
      setElapsedSec(0)
      setRowOffset(0)
      seenStartRef.current = null
      startRef.current = null
    }
  }, [startedAt])

  return { typed, wordIndex, wordInputs, started, finished, rowOffset, inputRef, activeWordRef, handleKeyDown, ...stats }
}
