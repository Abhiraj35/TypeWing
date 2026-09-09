"use client"

import { createContext, useContext, useMemo, useRef } from "react"
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react"
import {
  CaretDown,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
  CaretUp,
  Command,
  FastForward,
  Globe,
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
import {
  useKeyboardInteraction,
  type KeyboardEventSource,
  type KeyboardInteractionEvent,
} from "@/hooks/use-keyboard-interaction"
import { getKeyboardLayout, QWERTY_LAYOUT, type KeyboardLayout } from "@/lib/keyboard-layouts"
import { cn } from "@/lib/utils"

export interface MacKeyboardProps {
  className?: string
  language?: string
  onKeyEvent?: (event: KeyboardInteractionEvent) => void
  soundConfigUrl?: string | null
  volume?: number
}

interface MacKeyboardContextType {
  layout: KeyboardLayout
  pressedKeys: Set<string>
  pressKey: (keyCode: string, source: KeyboardEventSource) => boolean
  releaseKey: (keyCode: string, source: KeyboardEventSource) => void
}

const MacKeyboardContext = createContext<MacKeyboardContextType | null>(null)

function useMacKeyboard() {
  const context = useContext(MacKeyboardContext)
  if (!context) {
    throw new Error("Mac keyboard keys must be used within MacKeyboard")
  }
  return context
}

export function MacKeyboard({
  className,
  language = "english",
  onKeyEvent,
  soundConfigUrl,
  volume = 50,
}: MacKeyboardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => getKeyboardLayout(language), [language])
  const { pressedKeys, pressKey, releaseKey } = useKeyboardInteraction({
    containerRef,
    onKeyEvent,
    soundConfigUrl,
    volume,
  })

  const contextValue = useMemo(
    () => ({ layout, pressedKeys, pressKey, releaseKey }),
    [layout, pressedKeys, pressKey, releaseKey],
  )

  return (
    <MacKeyboardContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn(
          "inline-block w-fit select-none zoom-[1] sm:zoom-[1.2] md:zoom-[1.5] lg:zoom-[1.75] xl:zoom-[2.0]",
          className,
        )}
      >
        <MacKeypad />
      </div>
    </MacKeyboardContext.Provider>
  )
}

function MacKeypad() {
  const { layout } = useMacKeyboard()

  function labels(keyCode: string): [string, string?] | undefined {
    return layout[keyCode] ?? QWERTY_LAYOUT[keyCode]
  }

  return (
    <div className="h-full w-fit rounded-2xl bg-neutral-200/90 p-1.5 shadow-xl ring-1 ring-black/5 dark:bg-neutral-900/90 dark:ring-white/10 dark:shadow-2xl">
      <Row>
        <Key
          keyCode="Escape"
          containerClassName="rounded-tl-xl"
          className="w-10 rounded-tl-lg"
          childrenClassName="items-start justify-end pb-[2px] pl-[4px]"
        >
          <span>esc</span>
        </Key>
        <Key keyCode="F1">
          <SunDim size={6} />
          <span className="mt-1">F1</span>
        </Key>
        <Key keyCode="F2">
          <Sun size={6} />
          <span className="mt-1">F2</span>
        </Key>
        <Key keyCode="F3">
          <SquaresFour size={6} />
          <span className="mt-1">F3</span>
        </Key>
        <Key keyCode="F4">
          <MagnifyingGlass size={6} />
          <span className="mt-1">F4</span>
        </Key>
        <Key keyCode="F5">
          <Microphone size={6} />
          <span className="mt-1">F5</span>
        </Key>
        <Key keyCode="F6">
          <Moon size={6} />
          <span className="mt-1">F6</span>
        </Key>
        <Key keyCode="F7">
          <SkipBack size={6} />
          <span className="mt-1">F7</span>
        </Key>
        <Key keyCode="F8">
          <CaretDoubleRight size={6} />
          <span className="mt-1">F8</span>
        </Key>
        <Key keyCode="F9">
          <FastForward size={6} />
          <span className="mt-1">F9</span>
        </Key>
        <Key keyCode="F10">
          <SpeakerNone size={6} />
          <span className="mt-1">F10</span>
        </Key>
        <Key keyCode="F11">
          <SpeakerLow size={6} />
          <span className="mt-1">F11</span>
        </Key>
        <Key keyCode="F12">
          <SpeakerHigh size={6} />
          <span className="mt-1">F12</span>
        </Key>
        <Key containerClassName="rounded-tr-xl" className="rounded-tr-lg">
          <div className="h-4 w-4 rounded-full bg-linear-to-b from-neutral-300 via-neutral-200 to-neutral-300 p-px dark:from-neutral-600 dark:via-neutral-700 dark:to-neutral-600">
            <div className="h-full w-full rounded-full bg-neutral-100 dark:bg-neutral-800" />
          </div>
        </Key>
      </Row>

      <Row>
        <DualKey keyCode="Backquote" labels={labels("Backquote")} />
        <DualKey keyCode="Digit1" labels={labels("Digit1")} />
        <DualKey keyCode="Digit2" labels={labels("Digit2")} />
        <DualKey keyCode="Digit3" labels={labels("Digit3")} />
        <DualKey keyCode="Digit4" labels={labels("Digit4")} />
        <DualKey keyCode="Digit5" labels={labels("Digit5")} />
        <DualKey keyCode="Digit6" labels={labels("Digit6")} />
        <DualKey keyCode="Digit7" labels={labels("Digit7")} />
        <DualKey keyCode="Digit8" labels={labels("Digit8")} />
        <DualKey keyCode="Digit9" labels={labels("Digit9")} />
        <DualKey keyCode="Digit0" labels={labels("Digit0")} />
        <DualKey keyCode="Minus" labels={labels("Minus")} />
        <DualKey keyCode="Equal" labels={labels("Equal")} />
        <Key
          keyCode="Backspace"
          className="w-10"
          childrenClassName="items-end justify-end pr-[4px] pb-[2px]"
        >
          <span>delete</span>
        </Key>
      </Row>

      <Row>
        <Key
          keyCode="Tab"
          className="w-10"
          childrenClassName="items-start justify-end pb-[2px] pl-[4px]"
        >
          <span>tab</span>
        </Key>
        <DualKey keyCode="KeyQ" labels={labels("KeyQ")} />
        <DualKey keyCode="KeyW" labels={labels("KeyW")} />
        <DualKey keyCode="KeyE" labels={labels("KeyE")} />
        <DualKey keyCode="KeyR" labels={labels("KeyR")} />
        <DualKey keyCode="KeyT" labels={labels("KeyT")} />
        <DualKey keyCode="KeyY" labels={labels("KeyY")} />
        <DualKey keyCode="KeyU" labels={labels("KeyU")} />
        <DualKey keyCode="KeyI" labels={labels("KeyI")} />
        <DualKey keyCode="KeyO" labels={labels("KeyO")} />
        <DualKey keyCode="KeyP" labels={labels("KeyP")} />
        <DualKey keyCode="BracketLeft" labels={labels("BracketLeft")} />
        <DualKey keyCode="BracketRight" labels={labels("BracketRight")} />
        <DualKey keyCode="Backslash" labels={labels("Backslash")} />
      </Row>

      <Row>
        <Key
          keyCode="CapsLock"
          className="w-[2.8rem]"
          childrenClassName="items-start justify-end pb-[2px] pl-[4px]"
        >
          <span>caps lock</span>
        </Key>
        <DualKey keyCode="KeyA" labels={labels("KeyA")} />
        <DualKey keyCode="KeyS" labels={labels("KeyS")} />
        <DualKey keyCode="KeyD" labels={labels("KeyD")} />
        <DualKey keyCode="KeyF" labels={labels("KeyF")} />
        <DualKey keyCode="KeyG" labels={labels("KeyG")} />
        <DualKey keyCode="KeyH" labels={labels("KeyH")} />
        <DualKey keyCode="KeyJ" labels={labels("KeyJ")} />
        <DualKey keyCode="KeyK" labels={labels("KeyK")} />
        <DualKey keyCode="KeyL" labels={labels("KeyL")} />
        <DualKey keyCode="Semicolon" labels={labels("Semicolon")} />
        <DualKey keyCode="Quote" labels={labels("Quote")} />
        <Key
          keyCode="Enter"
          className="w-[2.85rem]"
          childrenClassName="items-end justify-end pr-[4px] pb-[2px]"
        >
          <span>return</span>
        </Key>
      </Row>

      <Row>
        <Key
          keyCode="ShiftLeft"
          className="w-[3.65rem]"
          childrenClassName="items-start justify-end pb-[2px] pl-[4px]"
        >
          <span>shift</span>
        </Key>
        <DualKey keyCode="KeyZ" labels={labels("KeyZ")} />
        <DualKey keyCode="KeyX" labels={labels("KeyX")} />
        <DualKey keyCode="KeyC" labels={labels("KeyC")} />
        <DualKey keyCode="KeyV" labels={labels("KeyV")} />
        <DualKey keyCode="KeyB" labels={labels("KeyB")} />
        <DualKey keyCode="KeyN" labels={labels("KeyN")} />
        <DualKey keyCode="KeyM" labels={labels("KeyM")} />
        <DualKey keyCode="Comma" labels={labels("Comma")} />
        <DualKey keyCode="Period" labels={labels("Period")} />
        <DualKey keyCode="Slash" labels={labels("Slash")} />
        <Key
          keyCode="ShiftRight"
          className="w-[3.65rem]"
          childrenClassName="items-end justify-end pr-[4px] pb-[2px]"
        >
          <span>shift</span>
        </Key>
      </Row>

      <Row>
        <ModifierKey keyCode="Fn" containerClassName="rounded-bl-xl" className="rounded-bl-lg">
          <span>fn</span>
          <Globe size={6} />
        </ModifierKey>
        <ModifierKey keyCode="ControlLeft">
          <CaretUp size={6} />
          <span>control</span>
        </ModifierKey>
        <ModifierKey keyCode="AltLeft">
          <OptionGlyph className="h-1.5 w-1.5" />
          <span>option</span>
        </ModifierKey>
        <ModifierKey keyCode="MetaLeft" className="w-8">
          <Command size={6} />
          <span>command</span>
        </ModifierKey>
        <Key keyCode="Space" className="w-[8.2rem]" />
        <ModifierKey keyCode="MetaRight" className="w-8">
          <Command size={6} />
          <span>command</span>
        </ModifierKey>
        <ModifierKey keyCode="AltRight">
          <OptionGlyph className="h-1.5 w-1.5" />
          <span>option</span>
        </ModifierKey>
        <div className="flex h-6 w-[4.9rem] items-center justify-end rounded-lg p-0.5">
          <Key keyCode="ArrowLeft" className="h-6 w-6">
            <CaretLeft size={6} weight="fill" />
          </Key>
          <div className="flex flex-col">
            <Key keyCode="ArrowUp" className="h-3 w-6">
              <CaretUp size={6} weight="fill" />
            </Key>
            <Key keyCode="ArrowDown" className="h-3 w-6">
              <CaretDown size={6} weight="fill" />
            </Key>
          </div>
          <Key
            keyCode="ArrowRight"
            containerClassName="rounded-br-xl"
            className="h-6 w-6 rounded-br-lg"
          >
            <CaretRight size={6} weight="fill" />
          </Key>
        </div>
      </Row>
    </div>
  )
}

function DualKey({
  keyCode,
  labels,
}: {
  keyCode: string
  labels?: [string, string?]
}) {
  if (!labels) return <Key keyCode={keyCode} />
  const [normal, shift] = labels
  if (shift) {
    return (
      <Key keyCode={keyCode}>
        <span>{shift}</span>
        <span>{normal}</span>
      </Key>
    )
  }
  return <Key keyCode={keyCode}>{normal}</Key>
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mb-0.5 flex w-full shrink-0 gap-0.5 last:mb-0">{children}</div>
}

const KEY_SURFACE =
  "flex h-6 w-6 cursor-pointer touch-none items-center justify-center rounded-[3.5px] bg-neutral-100 text-neutral-700 shadow-[0px_0px_1px_0px_rgba(0,0,0,0.5),0px_1px_1px_0px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,1)_inset] transition-transform duration-75 active:scale-[0.98] dark:bg-neutral-700 dark:text-neutral-200 dark:shadow-[0px_0px_1px_0px_rgba(0,0,0,0.8),0px_1px_1px_0px_rgba(0,0,0,0.35),0px_1px_0px_0px_rgba(255,255,255,0.12)_inset]"

const KEY_PRESSED =
  "scale-[0.98] bg-neutral-100/80 shadow-[0px_0px_1px_0px_rgba(0,0,0,0.5),0px_1px_1px_0px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.5)_inset] dark:bg-neutral-600 dark:shadow-[0px_0px_1px_0px_rgba(0,0,0,0.8),0px_1px_1px_0px_rgba(0,0,0,0.35),0px_1px_0px_0px_rgba(255,255,255,0.06)_inset]"

function useKeyPointer(keyCode?: string) {
  const { pressedKeys, pressKey, releaseKey } = useMacKeyboard()
  const isPressed = keyCode ? pressedKeys.has(keyCode) : false
  const pointerSessionActiveRef = useRef(false)

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

  return { isPressed, handlePointerDown, handlePointerRelease }
}

function Key({
  className,
  childrenClassName,
  containerClassName,
  children,
  keyCode,
}: {
  className?: string
  childrenClassName?: string
  containerClassName?: string
  children?: ReactNode
  keyCode?: string
}) {
  const { isPressed, handlePointerDown, handlePointerRelease } = useKeyPointer(keyCode)

  return (
    <div className={cn("rounded-lg p-[0.5px]", containerClassName)}>
      <button
        type="button"
        aria-label={keyCode}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        className={cn(KEY_SURFACE, isPressed && KEY_PRESSED, className)}
      >
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center text-[5px] leading-none",
            childrenClassName,
          )}
        >
          {children}
        </div>
      </button>
    </div>
  )
}

function ModifierKey({
  className,
  containerClassName,
  children,
  keyCode,
}: {
  className?: string
  containerClassName?: string
  children?: ReactNode
  keyCode?: string
}) {
  const { isPressed, handlePointerDown, handlePointerRelease } = useKeyPointer(keyCode)

  return (
    <div className={cn("rounded-lg p-[0.5px]", containerClassName)}>
      <button
        type="button"
        aria-label={keyCode}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        className={cn(KEY_SURFACE, isPressed && KEY_PRESSED, className)}
      >
        <div className="flex h-full w-full flex-col items-start justify-between p-1 text-[5px] leading-none">
          {children}
        </div>
      </button>
    </div>
  )
}

function OptionGlyph({ className }: { className?: string }) {
  return (
    <svg
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <rect stroke="currentColor" strokeWidth={2} x="18" y="5" width="10" height="2" />
      <polygon
        stroke="currentColor"
        strokeWidth={2}
        points="10.6,5 4,5 4,7 9.4,7 18.4,27 28,27 28,25 19.6,25"
      />
    </svg>
  )
}
