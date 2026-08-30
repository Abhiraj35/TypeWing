// Curated pool of common English words used to build typing tests.
// Defined here (not fetched) so the game works fully offline for Feature 3.

const COMMON_WORDS: string[] = [
  "the", "of", "and", "to", "in", "for", "on", "with", "at", "by",
  "from", "as", "that", "this", "it", "was", "are", "be", "have", "has",
  "is", "but", "not", "they", "you", "we", "he", "she", "his", "her",
  "their", "there", "which", "one", "or", "all", "can", "will", "if", "then",
  "when", "who", "what", "where", "why", "how", "so", "just", "also", "would",
  "could", "should", "may", "might", "must", "do", "does", "did", "done", "get",
  "got", "make", "made", "take", "took", "use", "used", "find", "found", "give",
  "gave", "come", "came", "see", "saw", "know", "knew", "think", "thought", "say",
  "said", "tell", "told", "ask", "asked", "feel", "felt", "try", "tried", "work",
  "time", "way", "day", "year", "thing", "world", "life", "hand", "part", "child",
  "eye", "woman", "man", "place", "case", "week", "company", "system", "program",
  "question", "water", "food", "money", "friend", "family", "school", "city",
  "state", "country", "group", "number", "room", "word", "point", "home", "car",
  "light", "night", "morning", "afternoon", "evening", "story", "music", "book",
  "game", "team", "game", "right", "left", "good", "great", "small", "large",
  "better", "best", "new", "old", "first", "last", "long", "short", "high", "low",
  "big", "little", "different", "many", "much", "most", "more", "less", "few",
  "enough", "early", "late", "always", "never", "often", "sometimes", "really",
  "very", "quite", "too", "also", "still", "yet", "already", "soon", "again",
  "back", "here", "there", "far", "near", "important", "beautiful", "happy", "sad",
  "easy", "hard", "fast", "slow", "strong", "weak", "light", "dark", "clean",
  "dirty", "full", "empty", "open", "close", "start", "stop", "begin", "end",
  "play", "run", "walk", "sit", "stand", "jump", "swim", "fly", "write", "read",
  "learn", "teach", "build", "grow", "help", "show", "watch", "listen", "speak",
  "move", "change", "stay", "wait", "turn", "put", "set", "send", "bring", "hold",
]

// Fisher–Yates shuffle (in place), returning a new array.
function shuffle(words: string[]): string[] {
  const out = [...words]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Generate `count` random words for a typing test. Avoids repeating the same
 * word back-to-back by shuffling a deck and picking without replacement.
 */
export function generateWords(count: number): string[] {
  const unique = [...new Set(COMMON_WORDS)]
  const out: string[] = []
  let deck = shuffle(unique)
  let i = 0

  while (out.length < count) {
    if (i >= deck.length) {
      const prev = out[out.length - 1]
      deck = shuffle(unique)
      i = 0
      if (prev !== undefined && deck[0] === prev && deck.length > 1) {
        const swapIdx = 1 + Math.floor(Math.random() * (deck.length - 1))
        ;[deck[0], deck[swapIdx]] = [deck[swapIdx], deck[0]]
      }
    }
    out.push(deck[i]!)
    i += 1
  }

  return out
}
