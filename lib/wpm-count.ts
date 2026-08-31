// Pure WPM / accuracy counting math. No React, no browser APIs — easy to test.

export type TestMode = "time" | "words"

export interface WpmCounts {
  correctWordChars: number
  correctSpaces: number
  allCorrectChars: number
  incorrectChars: number
  extraChars: number
  missedChars: number
}

interface CountParams {
  targetWords: string[]
  wordInputs: string[]
  typed: string
  wordIndex: number
  mode: TestMode
  final: boolean
}

/**
 * Compare what the user typed against the target words and tally character
 * counts. Follows the MonkeyType-style counting model:
 *  - allCorrectChars: every correctly typed character
 *  - incorrectChars:  typed characters that don't match the target
 *  - extraChars:      characters typed beyond the target word length
 *  - missedChars:     target characters never typed (skipped words)
 *  - correctWordChars / correctSpaces: used for WPM (fully correct words)
 */
export function countWpm({
  targetWords,
  wordInputs,
  typed,
  wordIndex,
  mode,
  final,
}: CountParams): WpmCounts {
  // Invariant: `wordInputs.length === wordIndex` (guards if briefly out of sync).
  const inputWords = [...wordInputs.slice(0, wordIndex), typed]

  let correctWordChars = 0
  let allCorrectChars = 0
  let incorrectChars = 0
  let extraChars = 0
  let missedChars = 0
  let correctSpaces = 0

  const isTimedTest = mode === "time"
  const shouldCountPartialLastWord = !final || (final && isTimedTest)

  for (let i = 0; i < inputWords.length; i++) {
    const inputWord = inputWords[i]!
    const targetWord = targetWords[i]
    if (targetWord === undefined) break

    if (inputWord === targetWord) {
      correctWordChars += targetWord.length
      allCorrectChars += targetWord.length
      if (i < inputWords.length - 1 && !inputWord.endsWith("\n")) correctSpaces++
    } else if (inputWord.length >= targetWord.length) {
      for (let c = 0; c < inputWord.length; c++) {
        if (c < targetWord.length) {
          if (inputWord[c] === targetWord[c]) allCorrectChars++
          else incorrectChars++
        } else {
          extraChars++
        }
      }
    } else {
      let correct = 0
      let incorrect = 0
      let missed = 0
      for (let c = 0; c < targetWord.length; c++) {
        if (c < inputWord.length) {
          if (inputWord[c] === targetWord[c]) correct++
          else incorrect++
        } else {
          missed++
        }
      }
      allCorrectChars += correct
      incorrectChars += incorrect

      if (i === inputWords.length - 1 && shouldCountPartialLastWord) {
        if (incorrect === 0) correctWordChars += correct
      } else {
        missedChars += missed
      }
    }
  }

  return { correctWordChars, correctSpaces, allCorrectChars, incorrectChars, extraChars, missedChars }
}

export function wpmNumeratorFromCounts(c: WpmCounts): number {
  return c.correctWordChars + c.correctSpaces
}

export function accuracyFromCounts(c: WpmCounts): number {
  const denom = c.allCorrectChars + c.incorrectChars + c.extraChars + c.missedChars
  if (denom <= 0) return 100
  return Math.round((c.allCorrectChars / denom) * 100)
}
