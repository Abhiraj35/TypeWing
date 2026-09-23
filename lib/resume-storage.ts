export interface StoredSeat {
  playerId: string
  resumeToken: string
}

const PREFIX = "tw:resume:"

// sessionStorage survives a refresh and dies with the tab, which matches the
// one-token-per-tab seat model.

export function storeSeat(roomCode: string, seat: StoredSeat): void {
  try {
    window.sessionStorage.setItem(PREFIX + roomCode, JSON.stringify(seat))
  } catch {
    // Storage unavailable (private mode, quota); the race still runs live.
  }
}

export function getSeat(roomCode: string): StoredSeat | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + roomCode)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSeat
    if (typeof parsed?.playerId !== "string" || typeof parsed?.resumeToken !== "string") return null
    return parsed
  } catch {
    return null
  }
}

export function clearSeat(roomCode: string): void {
  try {
    window.sessionStorage.removeItem(PREFIX + roomCode)
  } catch {
    // Ignore; clearing is best effort.
  }
}