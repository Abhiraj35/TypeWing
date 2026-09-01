import type { ResultStats } from "@/lib/result-types"

export function isInvalidTestResult(stats: ResultStats): boolean {
  const hasInput =
    (stats.wordInputs?.length ?? 0) > 0 ||
    (stats.correctChars ?? 0) > 0 ||
    (stats.incorrectChars ?? 0) > 0
  return !hasInput
}
