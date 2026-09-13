import type { Room } from "./room-manager"
import { generateWords } from "@shared/words"
import { MAX_POSSIBLE_WPM } from "./constants"

export function getRandomText(wordCount: number): string[] {
  return generateWords(wordCount)
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function plausibleWpm(room: Room, progress: number, wpm: number): boolean {
  if (!finiteNumber(wpm) || wpm < 0 || wpm > MAX_POSSIBLE_WPM) return false
  if (!room.startTime || progress <= 0) return wpm <= MAX_POSSIBLE_WPM
  const elapsedMinutes = Math.max((Date.now() - room.startTime) / 60_000, 1 / 60_000)
  const totalChars = (room.text ?? []).join(" ").length
  const elapsedChars = (totalChars * progress) / 100
  const expectedWpm = elapsedChars / 5 / elapsedMinutes
  return wpm <= Math.max(40, expectedWpm * 1.6 + 25)
}

function progressWithinElapsedTime(room: Room, progress: number): boolean {
  if (!room.startTime) return true
  const totalChars = (room.text ?? []).join(" ").length
  if (totalChars === 0) return progress <= 0
  const elapsedMinutes = Math.max((Date.now() - room.startTime) / 60_000, 0)
  const maxChars = elapsedMinutes * MAX_POSSIBLE_WPM * 5
  const maxProgress = Math.min(100, (maxChars / totalChars) * 100)
  return progress <= maxProgress
}

export function validateProgress(player: { progress: number }, newProgress: unknown, newWpm: unknown, room: Room): boolean {
  if (!finiteNumber(newProgress) || !finiteNumber(newWpm)) return false
  if (newProgress < 0 || newProgress > 100) return false
  if (newProgress < player.progress - 5) return false
  if (!progressWithinElapsedTime(room, newProgress)) return false
  return plausibleWpm(room, newProgress, newWpm)
}

export function validateFinishWpm(finalWpm: unknown, room: Room): boolean {
  return finiteNumber(finalWpm) && finalWpm >= 0 && finalWpm <= MAX_POSSIBLE_WPM && progressWithinElapsedTime(room, 100) && plausibleWpm(room, 100, finalWpm)
}
