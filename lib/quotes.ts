// Quotes data pipeline for Feature 5. Mirrors the zenkey reference API so the
// hook and controls stay thin. Works fully offline (local JSON, matches the
// Feature 3 decision to avoid fetching word/quote pools).

import rawQuotes from "@/data/quotes.json"

export type QuoteLength = "short" | "medium" | "long"

export const QUOTE_LENGTHS: QuoteLength[] = ["short", "medium", "long"]

const BOUNDS: Record<QuoteLength, [number, number]> = {
  short: [40, 130],
  medium: [131, 199],
  long: [200, 600],
}

interface Quote {
  text: string
  from: string
}

export function getQuote(length: QuoteLength): { words: string[]; author: string } {
  const [min, max] = BOUNDS[length]
  const pool = (rawQuotes as Quote[]).filter((q) => q.text.length >= min && q.text.length <= max)
  const quote = pool[Math.floor(Math.random() * pool.length)]!
  return { words: quote.text.split(" "), author: quote.from }
}