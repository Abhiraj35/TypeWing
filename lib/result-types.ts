export interface WpmSnapshot {
  second: number
  wpm: number
  raw: number
  errors: number
}

export interface ResultStats {
  wpm: number
  accuracy: number
  raw: number
  correctChars: number
  incorrectChars: number
  extraChars: number
  missedChars: number
  consistency: number
  elapsedSeconds: number
  correctedErrors: number
  mode: string
  modeDetail: string
  wpmHistory: WpmSnapshot[]
  wordInputs?: string[]
  targetWords?: string[]
  wordTimingsMs?: number[]
}
