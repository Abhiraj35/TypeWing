const STORAGE_KEY = "kb-personal-best"

interface StoredBest {
  key: string
  wpm: number
  accuracy: number
  timestamp: number
}

interface PersonalBestResult {
  isNewPb: boolean
  previousBest: number | null
  currentBest: number
}

function loadBests(): Record<string, StoredBest> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, StoredBest>) : {}
  } catch {
    return {}
  }
}

export function saveIfPersonalBest(
  mode: string,
  modeDetail: string,
  wpm: number,
  accuracy: number,
): PersonalBestResult {
  const key = `${mode}:${modeDetail}`
  const bests = loadBests()

  const previous = bests[key]?.wpm ?? null
  const existingEntry = bests[key]
  const isNewPb =
    wpm > 0 &&
    (previous === null || wpm > previous)

  if (isNewPb) {
    bests[key] = {
      key,
      wpm,
      accuracy,
      timestamp: Date.now(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bests))
    } catch {
      // ignore quota / privacy errors
    }
  }

  return {
    isNewPb,
    previousBest: existingEntry ? existingEntry.wpm : previous,
    currentBest: bests[key]?.wpm ?? wpm,
  }
}

/** Read-only lookup used to draw a personal-best reference line on the chart. */
export function getPersonalBest(mode: string, modeDetail: string): number | null {
  return loadBests()[`${mode}:${modeDetail}`]?.wpm ?? null
}
