"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react"
import {
  ArrowLineLeft,
  CaretDown,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
  CaretUp,
  Command,
  FastForward,
  FrameCorners,
  Lightbulb,
  MagnifyingGlass,
  Microphone,
  Moon,
  SkipBack,
  SpeakerHigh,
  SpeakerLow,
  SpeakerNone,
  SquaresFour,
  Sun,
  SunDim,
} from "@phosphor-icons/react"
import { getKeyboardLayout, QWERTY_LAYOUT, type KeyboardLayout } from "@/lib/keyboard-layouts"
import { cn } from "@/lib/utils"

export interface KeyboardInteractionEvent {
  code: string
  phase: "down" | "up"
  source: "physical" | "pointer"
}

export interface KeyboardProps {
  className?: string
  language?: string
  onKeyEvent?: (event: KeyboardInteractionEvent) => void
}

export function Keyboard({ className, language = "english", onKeyEvent }: KeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => getKeyboardLayout(language), [language])

  return (
    <KeyboardProvider
      containerRef={containerRef}
      onKeyEvent={onKeyEvent}
      layout={layout}
    >
      <div
        ref={containerRef}
        className={cn("inline-block select-none zoom-[0.55] sm:zoom-[0.7] md:zoom-[0.75] lg:zoom-[0.9] xl:zoom-[1.1]", className)}
      >
        <KeyboardKeys />
      </div>
    </KeyboardProvider>
  )
}

export default Keyboard

// -----------------------------------------------------------------------------
// Internal keyboard context
// -----------------------------------------------------------------------------

interface KeyboardContextType {
  layout: KeyboardLayout
  pressedKeys: Set<string>
  triggerPointer: () => void
  pressKey: (keyCode: string, source: KeyboardEventSource) => boolean
  releaseKey: (keyCode: string, source: KeyboardEventSource) => void
  releaseAllKeys: (source?: KeyboardEventSource) => void
}

type KeyboardEventSource = "physical" | "pointer"

const KeyboardContext = createContext<KeyboardContextType | null>(null)

// OS/browsers often skip keyup for the letter key after Meta/Cmd chords; we track
// modifiers to clear orphaned keys (mirrors the reference).
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

function useKeyboardContext() {
  const context = useContext(KeyboardContext)
  if (!context) {
    throw new Error("Keyboard components must be used within KeyboardProvider")
  }
  return context
}

interface KeyboardProviderProps {
  children: ReactNode
  containerRef: React.RefObject<HTMLDivElement | null>
  layout: KeyboardLayout
  onKeyEvent?: (event: KeyboardInteractionEvent) => void
}

function KeyboardProvider({ children, containerRef, layout, onKeyEvent }: KeyboardProviderProps) {
  const pressedKeysRef = useRef<Set<string>>(new Set())
  const modifiersDownRef = useRef<Set<string>>(new Set())
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [isVisible, setIsVisible] = useState(true)

  const emitKeyEvent = useCallback(
    (phase: KeyboardEventPhase, code: string, source: KeyboardEventSource) => {
      onKeyEvent?.({ code, phase, source })
    },
    [onKeyEvent],
  )

  const pressKey = useCallback(
    (keyCode: string, source: KeyboardEventSource): boolean => {
      if (pressedKeysRef.current.has(keyCode)) return false

      const apply = () => {
        const next = new Set(pressedKeysRef.current)
        next.add(keyCode)
        pressedKeysRef.current = next
        setPressedKeys(next)
        emitKeyEvent("down", keyCode, source)
      }

      if (source === "pointer") {
        apply()
      } else {
        apply()
      }
      return true
    },
    [emitKeyEvent],
  )

  const releaseKey = useCallback(
    (keyCode: string, source: KeyboardEventSource) => {
      if (!pressedKeysRef.current.has(keyCode)) return

      const apply = () => {
        const next = new Set(pressedKeysRef.current)
        next.delete(keyCode)
        pressedKeysRef.current = next
        setPressedKeys(next)
        emitKeyEvent("up", keyCode, source)
      }

      apply()
    },
    [emitKeyEvent],
  )

  const releaseAllKeys = useCallback((source: KeyboardEventSource = "physical") => {
    const keysToRelease = Array.from(pressedKeysRef.current)
    if (keysToRelease.length === 0) return

    pressedKeysRef.current = new Set()
    modifiersDownRef.current = new Set()
    setPressedKeys(new Set())

    for (const keyCode of keysToRelease) {
      emitKeyEvent("up", keyCode, source)
    }
  }, [emitKeyEvent])

  // Release all pressed keys on blur / tab hidden, to avoid sticking highlights.
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

  // Stop tracking physical keys once the keyboard is scrolled out of view.
  useEffect(() => {
    const element = containerRef.current
    if (!element || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, { threshold: 0.1 })

    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef])

  // Listen to physical key presses so on-screen keys light up as the user types.
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
  }, [isVisible, pressKey, releaseKey])

  return (
    <KeyboardContext.Provider
      value={{ layout, pressedKeys, triggerPointer: () => {}, pressKey, releaseKey, releaseAllKeys }}
    >
      {children}
    </KeyboardContext.Provider>
  )
}

// -----------------------------------------------------------------------------
// UI rendering
// -----------------------------------------------------------------------------

function KeyboardKeys() {
  const { layout } = useKeyboardContext()

  function label(keyCode: string): [string, string?] | undefined {
    return layout[keyCode] ?? QWERTY_LAYOUT[keyCode]
  }

  return (
    <div className="w-fit rounded-[16px] border-2 border-black bg-black/70 p-3 dark:border-white/20 dark:bg-white/20">
      <div className="rounded-[5px] rounded-t-[8px] border border-black bg-black/80 dark:border-zinc-500 dark:bg-zinc-700">
        <div className="-space-y-1 -translate-y-1 overflow-hidden rounded-[5px]">
          <Row>
            <Key keyCode="Escape">esc</Key>
            <Key keyCode="F1"><Icon><SunDim size={10} /></Icon><span>F1</span></Key>
            <Key keyCode="F2"><Icon><Sun size={10} /></Icon><span>F2</span></Key>
            <Key keyCode="F3"><Icon><SquaresFour size={10} /></Icon><span>F3</span></Key>
            <Key keyCode="F4"><Icon><MagnifyingGlass size={10} /></Icon><span>F4</span></Key>
            <Key keyCode="F5"><Icon><Microphone size={10} /></Icon><span>F5</span></Key>
            <Key keyCode="F6"><Icon><Moon size={10} /></Icon><span>F6</span></Key>
            <Key keyCode="F7"><Icon><SkipBack size={10} /></Icon><span>F7</span></Key>
            <Key keyCode="F8"><Icon><CaretDoubleRight size={10} /></Icon><span>F8</span></Key>
            <Key keyCode="F9"><Icon><FastForward size={10} /></Icon><span>F9</span></Key>
            <Key keyCode="F10"><Icon><SpeakerNone size={10} /></Icon><span>F10</span></Key>
            <Key keyCode="F11"><Icon><SpeakerLow size={10} /></Icon><span>F11</span></Key>
            <Key keyCode="F12"><Icon><SpeakerHigh size={10} /></Icon><span>F12</span></Key>
            <Key keyCode="F13"><Icon><FrameCorners size={10} /></Icon></Key>
            <Key keyCode="Delete">del</Key>
            <Key keyCode="F14"><Icon><Lightbulb size={12} /></Icon></Key>
          </Row>

          <Row>
            <DualKey keyCode="Backquote" labels={label("Backquote")} />
            <DualKey keyCode="Digit1" labels={label("Digit1")} />
            <DualKey keyCode="Digit2" labels={label("Digit2")} />
            <DualKey keyCode="Digit3" labels={label("Digit3")} />
            <DualKey keyCode="Digit4" labels={label("Digit4")} />
            <DualKey keyCode="Digit5" labels={label("Digit5")} />
            <DualKey keyCode="Digit6" labels={label("Digit6")} />
            <DualKey keyCode="Digit7" labels={label("Digit7")} />
            <DualKey keyCode="Digit8" labels={label("Digit8")} />
            <DualKey keyCode="Digit9" labels={label("Digit9")} />
            <DualKey keyCode="Digit0" labels={label("Digit0")} />
            <DualKey keyCode="Minus" labels={label("Minus")} />
            <DualKey keyCode="Equal" labels={label("Equal")} />
            <Key keyCode="Backspace" width={100}><Icon><ArrowLineLeft size={12} /></Icon></Key>
            <Key keyCode="PageUp">pgup</Key>
          </Row>

          <Row>
            <Key keyCode="Tab" width={75}>tab</Key>
            <DualKey keyCode="KeyQ" labels={label("KeyQ")} />
            <DualKey keyCode="KeyW" labels={label("KeyW")} />
            <DualKey keyCode="KeyE" labels={label("KeyE")} />
            <DualKey keyCode="KeyR" labels={label("KeyR")} />
            <DualKey keyCode="KeyT" labels={label("KeyT")} />
            <DualKey keyCode="KeyY" labels={label("KeyY")} />
            <DualKey keyCode="KeyU" labels={label("KeyU")} />
            <DualKey keyCode="KeyI" labels={label("KeyI")} />
            <DualKey keyCode="KeyO" labels={label("KeyO")} />
            <DualKey keyCode="KeyP" labels={label("KeyP")} />
            <DualKey keyCode="BracketLeft" labels={label("BracketLeft")} />
            <DualKey keyCode="BracketRight" labels={label("BracketRight")} />
            <DualKey keyCode="Backslash" labels={label("Backslash")} width={75} />
            <Key keyCode="PageDown">pgdn</Key>
          </Row>

          <Row>
            <Key keyCode="CapsLock" width={100}>caps lock</Key>
            <DualKey keyCode="KeyA" labels={label("KeyA")} />
            <DualKey keyCode="KeyS" labels={label("KeyS")} />
            <DualKey keyCode="KeyD" labels={label("KeyD")} />
            <DualKey keyCode="KeyF" labels={label("KeyF")} />
            <DualKey keyCode="KeyG" labels={label("KeyG")} />
            <DualKey keyCode="KeyH" labels={label("KeyH")} />
            <DualKey keyCode="KeyJ" labels={label("KeyJ")} />
            <DualKey keyCode="KeyK" labels={label("KeyK")} />
            <DualKey keyCode="KeyL" labels={label("KeyL")} />
            <DualKey keyCode="Semicolon" labels={label("Semicolon")} />
            <DualKey keyCode="Quote" labels={label("Quote")} />
            <Key keyCode="Enter" width={100}>return</Key>
            <Key keyCode="Home">home</Key>
          </Row>

          <Row>
            <Key keyCode="ShiftLeft" width={123}>shift</Key>
            <DualKey keyCode="KeyZ" labels={label("KeyZ")} />
            <DualKey keyCode="KeyX" labels={label("KeyX")} />
            <DualKey keyCode="KeyC" labels={label("KeyC")} />
            <DualKey keyCode="KeyV" labels={label("KeyV")} />
            <DualKey keyCode="KeyB" labels={label("KeyB")} />
            <DualKey keyCode="KeyN" labels={label("KeyN")} />
            <DualKey keyCode="KeyM" labels={label("KeyM")} />
            <DualKey keyCode="Comma" labels={label("Comma")} />
            <DualKey keyCode="Period" labels={label("Period")} />
            <DualKey keyCode="Slash" labels={label("Slash")} />
            <Key keyCode="ShiftRight" width={77}>shift</Key>
            <Key keyCode="ArrowUp"><Icon><CaretUp size={12} /></Icon></Key>
            <Key keyCode="End">end</Key>
          </Row>

          <Row>
            <Key keyCode="ControlLeft" width={62}>ctrl</Key>
            <Key keyCode="AltLeft" width={62}>option</Key>
            <Key keyCode="MetaLeft" width={62}><Icon><Command size={12} /></Icon></Key>
            <Key keyCode="Space" width={314} />
            <Key keyCode="MetaRight"><Icon><Command size={12} /></Icon></Key>
            <Key keyCode="Fn">fn</Key>
            <Key keyCode="ControlRight">ctrl</Key>
            <Key keyCode="ArrowLeft"><Icon><CaretLeft size={12} /></Icon></Key>
            <Key keyCode="ArrowDown"><Icon><CaretDown size={12} /></Icon></Key>
            <Key keyCode="ArrowRight"><Icon><CaretRight size={12} /></Icon></Key>
          </Row>
        </div>
      </div>
    </div>
  )
}

type KeyboardEventPhase = "down" | "up"

function Row({ children }: { children: ReactNode }) {
  return <div className="flex">{children}</div>
}

function Icon({ children }: { children: ReactNode }) {
  return <span className="flex items-center justify-center">{children}</span>
}

/** Renders a key with one or two labels (shift on top, normal on bottom). */
function DualKey({ keyCode, labels, width }: { keyCode: string; labels?: [string, string?]; width?: number }) {
  if (!labels) return <Key keyCode={keyCode} width={width} />
  const [normal, shift] = labels
  if (shift) {
    return (
      <Key keyCode={keyCode} width={width}>
        <span>{shift}</span>
        <span>{normal}</span>
      </Key>
    )
  }
  return (
    <Key keyCode={keyCode} width={width}>
      {normal}
    </Key>
  )
}

type KeyVariantSlot = "accent" | "dark" | "light"

interface KeyVariantDefinition {
  bg: string
  text: string
}

const KEYCAP_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif'

// Accent keys reuse TypeWing's --primary so the keyboard follows the app accent.
const KEYBOARD_VARIANTS: Record<KeyVariantSlot, KeyVariantDefinition> = {
  accent: { bg: "var(--primary)", text: "var(--primary-foreground)" },
  dark: { bg: "#3a3a3a", text: "rgba(255,255,255,0.82)" },
  light: { bg: "#e8e8e8", text: "rgba(0,0,0,0.78)" },
}

const DEFAULT_KEY_VARIANT_SLOT: KeyVariantSlot = "light"

const DARK_KEYS: string[] = [
  "F5", "F6", "F7", "F8", "F9", "F13", "Delete", "F14",
  "Backspace", "PageUp", "Tab", "Backslash", "PageDown",
  "CapsLock", "Enter", "Home", "ShiftLeft", "ShiftRight", "End",
  "ControlLeft", "AltLeft", "MetaLeft", "MetaRight", "Fn", "ControlRight",
]

const ACCENT_KEYS: string[] = ["Escape"]

const KEY_VARIANT_OVERRIDES: Record<string, KeyVariantSlot> = {
  ...Object.fromEntries(ACCENT_KEYS.map((k) => [k, "accent"])),
  ...Object.fromEntries(DARK_KEYS.map((k) => [k, "dark"])),
}

function resolveKeyVariant(keyCode?: string): KeyVariantSlot {
  if (!keyCode) return DEFAULT_KEY_VARIANT_SLOT
  return KEY_VARIANT_OVERRIDES[keyCode] ?? DEFAULT_KEY_VARIANT_SLOT
}

function toRgba(color: string, alpha: number): string {
  if (!color.startsWith("#")) return color
  const value = color.slice(1)
  const hex =
    value.length === 3 ? value.split("").map((c) => `${c}${c}`).join("") : value
  if (hex.length !== 6) return color
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

interface KeyProps {
  width?: number
  children?: ReactNode
  className?: string
  keyCode?: string
}

function Key({ width = 50, children, className, keyCode }: KeyProps) {
  const { pressedKeys, pressKey, releaseKey } = useKeyboardContext()
  const isPressed = keyCode ? pressedKeys.has(keyCode) : false
  const pointerSessionActiveRef = useRef(false)
  const visuallyPressed = isPressed
  const keyVariant = KEYBOARD_VARIANTS[resolveKeyVariant(keyCode)]

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!keyCode || event.button !== 0) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore capture failures
    }
    if (pressKey(keyCode, "pointer")) {
      pointerSessionActiveRef.current = true
    }
  }

  const handlePointerRelease = () => {
    if (!keyCode || !pointerSessionActiveRef.current) return
    pointerSessionActiveRef.current = false
    releaseKey(keyCode, "pointer")
  }

  return (
    <button
      type="button"
      aria-label={keyCode}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      className="flex cursor-pointer touch-none appearance-none items-end border-0 bg-transparent p-0 text-left outline-none"
      style={{ height: 50, width }}
    >
      <div
        className={cn(
          "relative flex h-12.5 items-start justify-center overflow-hidden rounded-lg rounded-t-[12px] border border-black/40 transition-all duration-100",
          visuallyPressed && "h-11.25",
        )}
        style={{ width: `${width}px`, backgroundColor: toRgba(keyVariant.bg, 0.8) }}
      >
        <div
          className={cn(
            "relative z-10 flex h-9.25 flex-col items-center justify-between gap-0.5 whitespace-nowrap p-1 text-[4.5px] leading-none font-medium transition-all duration-100 select-none sm:text-[9px]",
            className,
          )}
          style={{
            width: `${width - 13}px`,
            backgroundColor: keyVariant.bg,
            color: keyVariant.text,
            fontFamily: KEYCAP_FONT_FAMILY,
            WebkitTextSizeAdjust: "100%",
            textSizeAdjust: "100%",
          }}
        >
          {children}
        </div>

        <div
          className={cn(
            "absolute right-0 bottom-0 z-0 h-px w-8 translate-x-3.5 rotate-70 bg-black/30 transition-all duration-100",
            visuallyPressed && "rotate-60",
          )}
        />
        <div
          className={cn(
            "absolute bottom-0 left-0 z-0 h-px w-8 -translate-x-3.5 rotate-[-70deg] bg-black/30 transition-all duration-100",
            visuallyPressed && "rotate-[-60deg]",
          )}
        />
      </div>
    </button>
  )
}
