"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { KeyboardSoundEngine } from "@/lib/keyboard-sound-engine"

export type KeyboardEventSource = "physical" | "pointer"
export type KeyboardEventPhase = "down" | "up"

export interface KeyboardInteractionEvent {
  code: string
  phase: KeyboardEventPhase
  source: KeyboardEventSource
}

const PHYSICAL_MODIFIER_CODES = new Set<string>([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "ShiftLeft",
  "ShiftRight",
])

interface UseKeyboardInteractionOptions {
  containerRef: RefObject<HTMLDivElement | null>
  onKeyEvent?: (event: KeyboardInteractionEvent) => void
  soundConfigUrl?: string | null
  volume?: number
}

export function useKeyboardInteraction({
  containerRef,
  onKeyEvent,
  soundConfigUrl,
  volume = 50,
}: UseKeyboardInteractionOptions) {
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const modifiersDownRef = useRef<Set<string>>(new Set())
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [isVisible, setIsVisible] = useState(true)

  const soundRef = useRef<KeyboardSoundEngine | null>(null)
  if (!soundRef.current) {
    soundRef.current = new KeyboardSoundEngine()
  }

  useEffect(() => {
    void soundRef.current?.load(soundConfigUrl ?? null)
    return () => soundRef.current?.unload()
  }, [soundConfigUrl])

  useEffect(() => {
    soundRef.current?.setVolume(volume)
  }, [volume])

  const emitKeyEvent = useCallback(
    (phase: KeyboardEventPhase, code: string, source: KeyboardEventSource) => {
      onKeyEvent?.({ code, phase, source })
    },
    [onKeyEvent],
  )

  const pressKey = useCallback(
    (keyCode: string, source: KeyboardEventSource): boolean => {
      if (pressedKeysRef.current.has(keyCode)) return false

      const next = new Set(pressedKeysRef.current)
      next.add(keyCode)
      pressedKeysRef.current = next
      setPressedKeys(next)
      emitKeyEvent("down", keyCode, source)
      soundRef.current?.play(keyCode)
      return true
    },
    [emitKeyEvent],
  )

  const releaseKey = useCallback(
    (keyCode: string, source: KeyboardEventSource) => {
      if (!pressedKeysRef.current.has(keyCode)) return

      const next = new Set(pressedKeysRef.current)
      next.delete(keyCode)
      pressedKeysRef.current = next
      setPressedKeys(next)
      emitKeyEvent("up", keyCode, source)
    },
    [emitKeyEvent],
  )

  const releaseAllKeys = useCallback(
    (source: KeyboardEventSource = "physical") => {
      const keysToRelease = Array.from(pressedKeysRef.current)
      if (keysToRelease.length === 0) return

      pressedKeysRef.current = new Set()
      modifiersDownRef.current = new Set()
      setPressedKeys(new Set())

      for (const keyCode of keysToRelease) {
        emitKeyEvent("up", keyCode, source)
      }
    },
    [emitKeyEvent],
  )

  useEffect(() => {
    const handleBlur = () => releaseAllKeys()
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") releaseAllKeys()
    }
    window.addEventListener("blur", handleBlur)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.removeEventListener("blur", handleBlur)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [releaseAllKeys])

  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef])

  useEffect(() => {
    if (!isVisible) {
      releaseAllKeys()
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (PHYSICAL_MODIFIER_CODES.has(event.code)) {
        modifiersDownRef.current.add(event.code)
      }
      if (event.repeat) return
      pressKey(event.code, "physical")
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const code = event.code
      releaseKey(code, "physical")

      if (!PHYSICAL_MODIFIER_CODES.has(code)) return

      const hadTracked = modifiersDownRef.current.delete(code)
      if (!hadTracked || modifiersDownRef.current.size > 0) return

      for (const stuckCode of Array.from(pressedKeysRef.current)) {
        if (!PHYSICAL_MODIFIER_CODES.has(stuckCode)) {
          releaseKey(stuckCode, "physical")
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [isVisible, pressKey, releaseKey, releaseAllKeys])

  return { pressedKeys, pressKey, releaseKey, releaseAllKeys }
}
