"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { useMountEffect } from "@/hooks/use-mount-effect"
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  type AccentColor,
  type KeyboardLanguage,
  type Settings,
  type TypingFont,
} from "@/lib/settings-data"

export type {
  AccentColor,
  KeyboardLanguage,
  Settings,
  TypingFont,
} from "@/lib/settings-data"
export {
  ACCENT_COLORS,
  FONT_OPTIONS,
  KEYBOARD_LANGUAGE_OPTIONS,
} from "@/lib/settings-data"

interface SettingsContextValue {
  accent: AccentColor
  setAccent: (c: AccentColor) => void
  font: TypingFont
  setFont: (f: TypingFont) => void
  fontCssFamily: string
  keyboardVisible: boolean
  setKeyboardVisible: (visible: boolean) => void
  keyboardLanguage: KeyboardLanguage
  setKeyboardLanguage: (lang: KeyboardLanguage) => void
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
  const [keyboardVisible, setKeyboardVisibleState] = useState<boolean>(
    DEFAULT_SETTINGS.keyboardVisible,
  )
  const [keyboardLanguage, setKeyboardLanguageState] = useState<KeyboardLanguage>(
    DEFAULT_SETTINGS.keyboardLanguage,
  )
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const settingsRef = useRef<Settings>({
    accent: DEFAULT_SETTINGS.accent,
    font: DEFAULT_SETTINGS.font,
    keyboardVisible: DEFAULT_SETTINGS.keyboardVisible,
    keyboardLanguage: DEFAULT_SETTINGS.keyboardLanguage,
  })

  // Persist the current snapshot of settings to localStorage.
  const persist = useCallback((next: Partial<Settings>) => {
    settingsRef.current = { ...settingsRef.current, ...next }
    try {
      localStorage.setItem("tf-settings", JSON.stringify(settingsRef.current))
    } catch {
      // ignore quota / privacy errors
    }
  }, [])

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

    const initialFont = (saved.font as TypingFont) ?? DEFAULT_SETTINGS.font
    setFontState(initialFont)
    applyFontToDom(initialFont)

    const initialVisible =
      typeof saved.keyboardVisible === "boolean"
        ? saved.keyboardVisible
        : DEFAULT_SETTINGS.keyboardVisible
    setKeyboardVisibleState(initialVisible)

    const initialLanguage = (
      saved.keyboardLanguage === "french" ||
      saved.keyboardLanguage === "german" ||
      saved.keyboardLanguage === "english"
        ? saved.keyboardLanguage
        : DEFAULT_SETTINGS.keyboardLanguage
    ) as KeyboardLanguage
    setKeyboardLanguageState(initialLanguage)

    settingsRef.current = {
      accent: initialAccent,
      font: initialFont,
      keyboardVisible: initialVisible,
      keyboardLanguage: initialLanguage,
    }

    setSettingsLoaded(true)
  })

  const setAccent = (c: AccentColor) => {
    setAccentState(c)
    applyAccentToDom(c)
    persist({ accent: c })
  }

  const setFont = (f: TypingFont) => {
    setFontState(f)
    applyFontToDom(f)
    persist({ font: f })
  }

  const setKeyboardVisible = (visible: boolean) => {
    setKeyboardVisibleState(visible)
    persist({ keyboardVisible: visible })
  }

  const setKeyboardLanguage = (lang: KeyboardLanguage) => {
    setKeyboardLanguageState(lang)
    persist({ keyboardLanguage: lang })
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
        keyboardVisible,
        setKeyboardVisible,
        keyboardLanguage,
        setKeyboardLanguage,
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
