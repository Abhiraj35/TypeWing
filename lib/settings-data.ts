// Server-safe settings data (no browser APIs here). Consumers use these to
// describe the available options and the default settings shape.

export type AccentColor =
  | "teal"
  | "red"
  | "amber"
  | "purple"
  | "green"
  | "rose"
  | "blue"
  | "orange"
  | "cyan"
  | "pink"
  | "indigo"
  | "lime"
  | "violet"
  | "lightgreen"
  | "sky"
  | "coral"
  | "mint"
  | "gold"
  | "lavender"

export type TypingFont =
  | "geist-mono"
  | "jetbrains-mono"
  | "fira-code"
  | "space-mono"
  | "roboto-mono"
  | "source-code-pro"
  | "space-grotesk"
  | "inter"
  | "poppins"
  | "playfair-display"
  | "caveat"

export interface AccentOption {
  id: AccentColor
  label: string
  swatch: string
}

export interface FontOption {
  id: TypingFont
  label: string
  googleFamily: string | null
  cssFamily: string
  tag: "mono" | "display" | "serif" | "handwriting"
}

export type KeyboardLanguage = "english" | "french" | "german"

export interface Settings {
  accent: AccentColor
  font: TypingFont
  keyboardVisible: boolean
  keyboardLanguage: KeyboardLanguage
}

export const ACCENT_COLORS: AccentOption[] = [
  { id: "teal",       label: "Teal",        swatch: "oklch(0.52 0.105 223.128)" },
  { id: "red",        label: "Red",         swatch: "oklch(0.55 0.22 25)"  },
  { id: "amber",      label: "Amber",       swatch: "oklch(0.65 0.18 75)"  },
  { id: "purple",     label: "Purple",      swatch: "oklch(0.55 0.2 295)"  },
  { id: "green",      label: "Green",       swatch: "oklch(0.55 0.17 145)" },
  { id: "rose",       label: "Rose",        swatch: "oklch(0.57 0.2 355)"  },
  { id: "blue",       label: "Blue",        swatch: "oklch(0.52 0.2 255)"  },
  { id: "orange",     label: "Orange",      swatch: "oklch(0.63 0.2 50)"   },
  { id: "cyan",       label: "Cyan",        swatch: "oklch(0.55 0.14 220)" },
  { id: "pink",       label: "Pink",        swatch: "oklch(0.57 0.22 330)" },
  { id: "indigo",     label: "Indigo",      swatch: "oklch(0.52 0.22 270)" },
  { id: "lime",       label: "Lime",        swatch: "oklch(0.62 0.2 125)"  },
  { id: "violet",     label: "Violet",      swatch: "oklch(0.54 0.25 308)" },
  { id: "lightgreen", label: "Light Green", swatch: "oklch(0.62 0.18 155)" },
  { id: "sky",        label: "Sky",         swatch: "oklch(0.56 0.16 235)" },
  { id: "coral",      label: "Coral",       swatch: "oklch(0.6 0.2 35)"    },
  { id: "mint",       label: "Mint",        swatch: "oklch(0.6 0.13 175)"  },
  { id: "gold",       label: "Gold",        swatch: "oklch(0.65 0.17 90)"  },
  { id: "lavender",   label: "Lavender",    swatch: "oklch(0.58 0.16 285)" },
]

export const FONT_OPTIONS: FontOption[] = [
  // Mono
  { id: "geist-mono",      label: "Geist Mono",      googleFamily: null,                              cssFamily: "var(--font-mono)",   tag: "mono" },
  { id: "jetbrains-mono",  label: "JetBrains Mono",  googleFamily: "JetBrains+Mono:wght@400;500;700",  cssFamily: "'JetBrains Mono'",   tag: "mono" },
  { id: "fira-code",       label: "Fira Code",       googleFamily: "Fira+Code:wght@400;500;700",       cssFamily: "'Fira Code'",        tag: "mono" },
  { id: "space-mono",      label: "Space Mono",      googleFamily: "Space+Mono:wght@400;700",          cssFamily: "'Space Mono'",       tag: "mono" },
  { id: "roboto-mono",     label: "Roboto Mono",     googleFamily: "Roboto+Mono:wght@400;500;700",     cssFamily: "'Roboto Mono'",      tag: "mono" },
  { id: "source-code-pro", label: "Source Code Pro", googleFamily: "Source+Code+Pro:wght@400;500;700", cssFamily: "'Source Code Pro'",   tag: "mono" },
  // Display / Sans
  { id: "space-grotesk",   label: "Space Grotesk",   googleFamily: "Space+Grotesk:wght@400;500;700",   cssFamily: "'Space Grotesk'",     tag: "display" },
  { id: "inter",           label: "Inter",           googleFamily: "Inter:wght@400;500;700",           cssFamily: "'Inter'",             tag: "display" },
  { id: "poppins",         label: "Poppins",         googleFamily: "Poppins:wght@400;500;700",         cssFamily: "'Poppins'",           tag: "display" },
  // Serif
  { id: "playfair-display", label: "Playfair Display", googleFamily: "Playfair+Display:wght@400;500;700", cssFamily: "'Playfair Display'", tag: "serif" },
  // Handwriting
  { id: "caveat",          label: "Caveat",          googleFamily: "Caveat:wght@400;500;700",          cssFamily: "'Caveat'",            tag: "handwriting" },
]

export const DEFAULT_SETTINGS: Settings = {
  accent: "teal",
  font: "geist-mono",
  keyboardVisible: false,
  keyboardLanguage: "english",
}

export const KEYBOARD_LANGUAGE_OPTIONS: { id: KeyboardLanguage; label: string }[] = [
  { id: "english", label: "English" },
  { id: "french", label: "French" },
  { id: "german", label: "German" },
]
