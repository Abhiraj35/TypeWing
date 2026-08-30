"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { useMountEffect } from "@/hooks/use-mount-effect"
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  type AccentColor,
  type Settings,
  type TypingFont,
} from "@/lib/settings-data"

export type { AccentColor, Settings, TypingFont } from "@/lib/settings-data"
export { ACCENT_COLORS, FONT_OPTIONS } from "@/lib/settings-data"

interface SettingsContextValue {
  accent: AccentColor
  setAccent: (c: AccentColor) => void
  font: TypingFont
  setFont: (f: TypingFont) => void
  fontCssFamily: string
  settingsLoaded: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function loadGoogleFont(family: string) {
  const id = `gf-${family}`
  if (document.getElementById(id)) return
  const link = document.createElement("link")
  link.id = id
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`
  document.head.appendChild(link)
}

function applyAccentToDom(accent: AccentColor) {
  document.documentElement.setAttribute("data-accent", accent)
}

function applyFontToDom(fontId: TypingFont) {
  const option = FONT_OPTIONS.find((f) => f.id === fontId)
  if (!option) return
  if (option.googleFamily) loadGoogleFont(option.googleFamily)
  document.documentElement.style.setProperty("--typing-font", option.cssFamily)
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(DEFAULT_SETTINGS.accent)
  const [font, setFontState] = useState<TypingFont>(DEFAULT_SETTINGS.font)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useMountEffect(() => {
    let saved: Partial<Settings> = {}
    try {
      saved = JSON.parse(localStorage.getItem("tf-settings") ?? "{}")
    } catch {
      saved = {}
    }

    const initialAccent = (saved.accent as AccentColor) ?? DEFAULT_SETTINGS.accent
    setAccentState(initialAccent)
    applyAccentToDom(initialAccent)

    if (saved.font) {
      setFontState(saved.font as TypingFont)
      applyFontToDom(saved.font as TypingFont)
    }

    setSettingsLoaded(true)
  })

  const setAccent = (c: AccentColor) => {
    setAccentState(c)
    applyAccentToDom(c)
    localStorage.setItem("tf-settings", JSON.stringify({ accent: c, font }))
  }

  const setFont = (f: TypingFont) => {
    setFontState(f)
    applyFontToDom(f)
    localStorage.setItem("tf-settings", JSON.stringify({ accent, font: f }))
  }

  const fontCssFamily =
    FONT_OPTIONS.find((f) => f.id === font)?.cssFamily ?? "var(--font-mono)"

  return (
    <SettingsContext.Provider
      value={{
        accent,
        setAccent,
        font,
        setFont,
        fontCssFamily,
        settingsLoaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider")
  return ctx
}
