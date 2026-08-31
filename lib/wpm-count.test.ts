import assert from "node:assert/strict"
import test from "node:test"

import { accuracyFromCounts } from "./wpm-count"

test("accuracyFromCounts includes extra typed characters in the denominator", () => {
  const counts = {
    correctWordChars: 1,
    correctSpaces: 0,
    allCorrectChars: 1,
    incorrectChars: 0,
    extraChars: 1,
    missedChars: 0,
  }

  assert.equal(accuracyFromCounts(counts), 50)
})
