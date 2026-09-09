"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { X } from "@phosphor-icons/react"
import {
  ACCENT_COLORS,
  FONT_OPTIONS,
  KEYBOARD_LANGUAGE_OPTIONS,
  KEYBOARD_SOUND_OPTIONS,
  KEYBOARD_STYLE_OPTIONS,
  useSettings,
} from "@/components/settings-context"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const PREVIEW_TEXT = {
  english: "The quick brown fox jumps over the lazy dog.",
  french: "Portez ce vieux whisky au juge blond qui fume.",
  german: "Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich.",
} as const

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const reduceMotion = useReducedMotion()
  const {
    accent,
    setAccent,
    font,
    setFont,
    fontCssFamily,
    keyboardVisible,
    setKeyboardVisible,
    keyboardStyle,
    setKeyboardStyle,
    keyboardLanguage,
    setKeyboardLanguage,
    keyboardSound,
    setKeyboardSound,
    keyboardSoundVolume,
    setKeyboardSoundVolume,
  } = useSettings()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border/80 bg-background shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
              <h2 id="settings-title" className="text-sm font-semibold tracking-wide text-foreground">
                Settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                ref={closeButtonRef}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {/* Accent */}
              <section>
                <SectionLabel>Accent</SectionLabel>
                <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAccent(c.id)}
                      aria-pressed={accent === c.id}
                      title={c.label}
                      className={cn(
                        "min-h-10 w-full rounded-sm transition-all duration-150",
                        accent === c.id
                          ? "opacity-100 outline -outline-offset-2 outline-ring"
                          : "opacity-40 hover:opacity-80",
                      )}
                      style={{ background: c.swatch }}
                    />
                  ))}
                </div>
              </section>

              {/* Font */}
              <section>
                <SectionLabel>Font</SectionLabel>
                <div className="mt-3 flex flex-col gap-1.5">
                  {FONT_OPTIONS.map((f) => {
                    const selected = font === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFont(f.id)}
                        aria-pressed={selected}
                        style={{ fontFamily: f.cssFamily }}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors outline-none",
                          "hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        <span>{f.label}</span>
                        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">
                          {f.tag}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Keyboard */}
              <section>
                <SectionLabel>Keyboard</SectionLabel>
                <button
                  type="button"
                  onClick={() => setKeyboardVisible(!keyboardVisible)}
                  aria-pressed={keyboardVisible}
                  className={cn(
                    "mt-3 flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors outline-none",
                    "border-input bg-background hover:border-primary/50 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    keyboardVisible
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="font-medium">Show on-screen keyboard</span>
                  <span
                    className={cn(
                      "relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors",
                      keyboardVisible
                        ? "bg-primary"
                        : "bg-muted-foreground/30",
                    )}
                    aria-hidden
                  >
                    <span
                      className={cn(
                        "block h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-200",
                        keyboardVisible ? "translate-x-5" : "translate-x-0",
                      )}
                    />
                  </span>
                </button>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {KEYBOARD_STYLE_OPTIONS.map((option) => {
                    const selected = keyboardStyle === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setKeyboardStyle(option.id)}
                        aria-pressed={selected}
                        className={cn(
                          "cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors outline-none",
                          "hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {option.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Keyboard language */}
              <section>
                <SectionLabel>Language</SectionLabel>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {KEYBOARD_LANGUAGE_OPTIONS.map((option) => {
                    const selected = keyboardLanguage === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setKeyboardLanguage(option.id)}
                        aria-pressed={selected}
                        className={cn(
                          "cursor-pointer rounded-lg border py-1.5 text-[11px] font-medium transition-colors outline-none",
                          "hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Keyboard sound */}
              <section>
                <SectionLabel>Sound</SectionLabel>
                <div className="mt-3 flex flex-col gap-1.5">
                  {KEYBOARD_SOUND_OPTIONS.map((option) => {
                    const selected = keyboardSound === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setKeyboardSound(option.id)}
                        aria-pressed={selected}
                        className={cn(
                          "cursor-pointer rounded-lg border px-3 py-2 text-left text-sm transition-colors outline-none",
                          "hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Keyboard sound volume */}
              {keyboardSound !== "off" && (
                <section>
                  <SectionLabel>Volume</SectionLabel>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={keyboardSoundVolume}
                      onChange={(e) => setKeyboardSoundVolume(Number(e.target.value))}
                      aria-label="Sound volume"
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted-foreground/30 accent-primary"
                    />
                    <span className="w-9 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {keyboardSoundVolume}%
                    </span>
                  </div>
                </section>
              )}

              {/* Preview of current typing font */}
              <section>
                <SectionLabel>Preview</SectionLabel>
                <p
                  className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-3 text-lg"
                  style={{ fontFamily: fontCssFamily }}
                >
                  {PREVIEW_TEXT[keyboardLanguage]}
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  )
}
