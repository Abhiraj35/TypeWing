// Server-safe keyboard layout data (no browser APIs here). Consumers use these
// to map a physical key code to the label(s) shown on the on-screen keyboard
// for a chosen language.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// A single physical key's labels: [normal, shift?]. The shift label is optional
// and, for the current minimal renderer, unused (keys always show "normal").
export type KeyLabel = [normal: string, shift?: string]

// A partial map from physical key code -> labels. Keys absent from a layout
// fall back to the QWERTY English layout so every keyboard row stays complete.
export type KeyboardLayout = Partial<Record<string, KeyLabel>>

export interface LanguageOption {
  id: string
  label: string
  layout: string
}

// The languages we ship a first-class layout for (Feature 6 scope).
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "english", label: "English", layout: "QWERTY" },
  { id: "french", label: "French", layout: "AZERTY" },
  { id: "german", label: "German", layout: "QWERTZ" },
]

// ---------------------------------------------------------------------------
// Key order (physical rows)
// ---------------------------------------------------------------------------

// The rows of a full US-style physical keyboard, top-to-bottom. Each element is
// a physical key code; the renderer walks these rows and pulls the label from
// the active layout (falling back to QWERTY for any code not overridden).
export const KEY_ROWS: string[][] = [
  [
    "Backquote",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
  ],
  [
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",
    "Backslash",
  ],
  [
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyJ",
    "KeyK",
    "KeyL",
    "Semicolon",
    "Quote",
  ],
  ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
]

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

export const QWERTY_LAYOUT: KeyboardLayout = {
  Backquote: ["`", "~"],
  Digit1: ["1", "!"],
  Digit2: ["2", "@"],
  Digit3: ["3", "#"],
  Digit4: ["4", "$"],
  Digit5: ["5", "%"],
  Digit6: ["6", "^"],
  Digit7: ["7", "&"],
  Digit8: ["8", "*"],
  Digit9: ["9", "("],
  Digit0: ["0", ")"],
  Minus: ["-", "_"],
  Equal: ["=", "+"],
  KeyQ: ["Q"],
  KeyW: ["W"],
  KeyE: ["E"],
  KeyR: ["R"],
  KeyT: ["T"],
  KeyY: ["Y"],
  KeyU: ["U"],
  KeyI: ["I"],
  KeyO: ["O"],
  KeyP: ["P"],
  BracketLeft: ["[", "{"],
  BracketRight: ["]", "}"],
  Backslash: ["\\", "|"],
  KeyA: ["A"],
  KeyS: ["S"],
  KeyD: ["D"],
  KeyF: ["F"],
  KeyG: ["G"],
  KeyH: ["H"],
  KeyJ: ["J"],
  KeyK: ["K"],
  KeyL: ["L"],
  Semicolon: [";", ":"],
  Quote: ["'", '"'],
  KeyZ: ["Z"],
  KeyX: ["X"],
  KeyC: ["C"],
  KeyV: ["V"],
  KeyB: ["B"],
  KeyN: ["N"],
  KeyM: ["M"],
  Comma: [",", "<"],
  Period: [".", ">"],
  Slash: ["/", "?"],
}

// French – AZERTY. Note how several physical positions swap letters relative to
// QWERTY (Digit2 -> é, KeyQ -> A, KeyW -> Z, KeyA -> Q, KeyZ -> W, ...).
export const FRENCH_LAYOUT: KeyboardLayout = {
  Backquote: ["²"],
  Digit1: ["&", "1"],
  Digit2: ["é", "2"],
  Digit3: ['"', "3"],
  Digit4: ["'", "4"],
  Digit5: ["(", "5"],
  Digit6: ["-", "6"],
  Digit7: ["è", "7"],
  Digit8: ["_", "8"],
  Digit9: ["ç", "9"],
  Digit0: ["à", "0"],
  Minus: [")", "°"],
  Equal: ["=", "+"],
  KeyQ: ["A"],
  KeyW: ["Z"],
  KeyE: ["E"],
  KeyR: ["R"],
  KeyT: ["T"],
  KeyY: ["Y"],
  KeyU: ["U"],
  KeyI: ["I"],
  KeyO: ["O"],
  KeyP: ["P"],
  BracketLeft: ["^", "¨"],
  BracketRight: ["$", "£"],
  Backslash: ["*", "µ"],
  KeyA: ["Q"],
  KeyS: ["S"],
  KeyD: ["D"],
  KeyF: ["F"],
  KeyG: ["G"],
  KeyH: ["H"],
  KeyJ: ["J"],
  KeyK: ["K"],
  KeyL: ["L"],
  Semicolon: ["M"],
  Quote: ["ù", "%"],
  KeyZ: ["W"],
  KeyX: ["X"],
  KeyC: ["C"],
  KeyV: ["V"],
  KeyB: ["B"],
  KeyN: ["N"],
  KeyM: [",", "?"],
  Comma: [";", "."],
  Period: [":", "/"],
  Slash: ["!", "§"],
}

// German – QWERTZ (Y and Z swapped; umlauts on the home-row / top brackets).
export const GERMAN_LAYOUT: KeyboardLayout = {
  Backquote: ["^", "°"],
  Digit2: ["2", '"'],
  Digit3: ["3", "§"],
  Digit6: ["6", "&"],
  Digit7: ["7", "/"],
  Digit8: ["8", "("],
  Digit9: ["9", ")"],
  Digit0: ["0", "="],
  Minus: ["ß", "?"],
  Equal: ["´", "`"],
  KeyY: ["Z"],
  BracketLeft: ["ü", "Ü"],
  BracketRight: ["+", "*"],
  Backslash: ["#", "'"],
  Semicolon: ["ö", "Ö"],
  Quote: ["ä", "Ä"],
  KeyZ: ["Y"],
  Comma: [",", ";"],
  Period: [".", ":"],
  Slash: ["-", "_"],
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const LANGUAGE_LAYOUTS: Record<string, KeyboardLayout> = {
  english: QWERTY_LAYOUT,
  french: FRENCH_LAYOUT,
  german: GERMAN_LAYOUT,
}

/**
 * Return the keyboard layout for a given language id.
 * Falls back to QWERTY when the language is unknown, so callers never have to
 * handle a missing layout themselves.
 */
export function getKeyboardLayout(language: string): KeyboardLayout {
  return LANGUAGE_LAYOUTS[language] ?? QWERTY_LAYOUT
}
