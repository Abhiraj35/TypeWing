// Browser-only keyboard sound engine. Translates mechvibes scancode configs
// into per-key sprite slices and plays them via Web Audio.

/**
 * Mechvibes scancode -> DOM KeyboardEvent.code.
 * Matches the authoritative mechvibes table (scancodes 1-58 map the main ANSI
 * block; the extended/navigation scancodes 574xx are listed but their packs
 * rarely define the smaller stabilizer keys, so they're optional).
 */
const SCANCODE_TO_CODE: Record<string, string> = {
  "1": "Escape",
  "2": "Digit1",
  "3": "Digit2",
  "4": "Digit3",
  "5": "Digit4",
  "6": "Digit5",
  "7": "Digit6",
  "8": "Digit7",
  "9": "Digit8",
  "10": "Digit9",
  "11": "Digit0",
  "12": "Minus",
  "13": "Equal",
  "14": "Backspace",
  "15": "Tab",
  "16": "KeyQ",
  "17": "KeyW",
  "18": "KeyE",
  "19": "KeyR",
  "20": "KeyT",
  "21": "KeyY",
  "22": "KeyU",
  "23": "KeyI",
  "24": "KeyO",
  "25": "KeyP",
  "26": "BracketLeft",
  "27": "BracketRight",
  "28": "Enter",
  "29": "ControlLeft",
  "30": "KeyA",
  "31": "KeyS",
  "32": "KeyD",
  "33": "KeyF",
  "34": "KeyG",
  "35": "KeyH",
  "36": "KeyJ",
  "37": "KeyK",
  "38": "KeyL",
  "39": "Semicolon",
  "40": "Quote",
  "41": "Backquote",
  "42": "ShiftLeft",
  "43": "Backslash",
  "44": "KeyZ",
  "45": "KeyX",
  "46": "KeyC",
  "47": "KeyV",
  "48": "KeyB",
  "49": "KeyN",
  "50": "KeyM",
  "51": "Comma",
  "52": "Period",
  "53": "Slash",
  "54": "ShiftRight",
  "56": "AltLeft",
  "57": "Space",
  "58": "CapsLock",
  "59": "F1",
  "60": "F2",
  "61": "F3",
  "62": "F4",
  "63": "F5",
  "64": "F6",
  "65": "F7",
  "66": "F8",
  "67": "F9",
  "68": "F10",
  "87": "F11",
  "88": "F12",
  "57416": "ArrowUp",
  "57419": "ArrowLeft",
  "57421": "ArrowRight",
  "57424": "ArrowDown",
  "3613": "ControlRight",
  "3640": "AltRight",
  "3655": "Home",
  "3657": "PageUp",
  "3663": "End",
  "3665": "PageDown",
  "3667": "Delete",
  "3675": "MetaLeft",
  "3676": "MetaRight",
}

interface MechvibesConfig {
  key_define_type?: "single" | "multi"
  sound?: string
  defines: Record<string, [number, number] | string>
}

type KeyDef =
  | { kind: "sprite"; start: number; duration: number }
  | { kind: "sample"; url: string }

const FALLBACK_CODE = "Space"

export class KeyboardSoundEngine {
  private ctx: AudioContext | null = null
  private defs = new Map<string, KeyDef>()
  private spriteBuffer: AudioBuffer | null = null
  private sampleCache = new Map<string, AudioBuffer>()
  private failedSamples = new Set<string>()
  /** Incremented per load call; in-flight results are discarded when stale. */
  private generation = 0
  private loaded = false
  private volume = 1

  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
    }
    return this.ctx
  }

  async load(configUrl: string | null): Promise<void> {
    const gen = ++this.generation
    this.unload()
    if (!configUrl) return
    const ctx = this.ensureCtx()
    if (!ctx) return

    try {
      const res = await fetch(configUrl)
      if (gen !== this.generation) return
      if (!res.ok) throw new Error(`config ${res.status}`)
      const config = (await res.json()) as MechvibesConfig
      if (gen !== this.generation) return
      const base = configUrl.slice(0, configUrl.lastIndexOf("/"))

      if (config.key_define_type === "multi") {
        for (const [scancode, file] of Object.entries(config.defines)) {
          if (typeof file !== "string") continue
          const code = SCANCODE_TO_CODE[scancode]
          if (code) this.defs.set(code, { kind: "sample", url: `${base}/${file}` })
        }
      } else if (config.sound) {
        const spriteUrl = `${base}/${config.sound}`
        const raw = await (await fetch(spriteUrl)).arrayBuffer()
        if (gen !== this.generation) return
        this.spriteBuffer = await ctx.decodeAudioData(raw.slice(0))
        if (gen !== this.generation) return
        for (const [scancode, offsets] of Object.entries(config.defines)) {
          if (!Array.isArray(offsets) || offsets.length < 2) continue
          const [start, duration] = offsets
          if (start < 0 || duration <= 0) continue
          const code = SCANCODE_TO_CODE[scancode]
          if (code) this.defs.set(code, { kind: "sprite", start, duration })
        }
      }
      this.loaded = true
    } catch (error) {
      if (gen === this.generation) {
        console.error("[typewing] Failed to load sound pack", error)
      }
    }
  }

  private async decodeSample(url: string): Promise<AudioBuffer | null> {
    const ctx = this.ensureCtx()
    if (!ctx) return null
    if (this.failedSamples.has(url)) return null
    let buf = this.sampleCache.get(url)
    if (buf) return buf
    const res = await fetch(url)
    if (!res.ok) {
      this.failedSamples.add(url)
      throw new Error(`Failed to fetch ${url} (${res.status})`)
    }
    const raw = await res.arrayBuffer()
    try {
      buf = await ctx.decodeAudioData(raw.slice(0))
    } catch (error) {
      this.failedSamples.add(url)
      throw error
    }
    this.sampleCache.set(url, buf)
    return buf
  }

  setVolume(v: number): void {
    this.volume = v / 100
  }

  play(code: string): void {
    if (!this.loaded) return
    const ctx = this.ensureCtx()
    if (!ctx) return
    if (ctx.state === "suspended") void ctx.resume()

    // Mechvibes packs record only a press sound.
    const def = this.defs.get(code) ?? this.defs.get(FALLBACK_CODE)
    if (!def) return

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = this.volume
    source.connect(gain)
    gain.connect(ctx.destination)

    if (def.kind === "sprite") {
      if (!this.spriteBuffer) return
      source.buffer = this.spriteBuffer
      source.start(0, def.start / 1000, def.duration / 1000)
    } else {
      void this.decodeSample(def.url)
        .then((buf) => {
          if (buf) {
            source.buffer = buf
            source.start()
          }
        })
        .catch((error) => {
          console.error("[typewing] Failed to decode sample", error)
        })
    }
  }

  unload(): void {
    this.defs.clear()
    this.spriteBuffer = null
    this.sampleCache.clear()
    this.failedSamples.clear()
    this.loaded = false
  }

  dispose(): void {
    this.generation += 1
    this.unload()
    const ctx = this.ctx
    this.ctx = null
    if (ctx) void ctx.close().catch(() => undefined)
  }
}
