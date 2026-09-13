interface RateEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateEntry>()

export function isRateLimited(socketId: string, event: string, limit: number, windowMs: number): boolean {
  const key = `${socketId}:${event}`
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > limit
}

export function clearSocketRateLimits(socketId: string): void {
  for (const key of buckets.keys()) {
    if (key.startsWith(`${socketId}:`)) buckets.delete(key)
  }
}

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key)
  }
}, 60_000)
cleanupTimer.unref?.()
