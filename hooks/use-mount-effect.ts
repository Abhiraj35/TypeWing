import { useEffect } from "react"

/**
 * Escape hatch for one-time external sync on mount.
 * Good for: DOM integration (focus, scroll), browser API subscriptions,
 * loading browser-only state (localStorage, media queries).
 *
 * Wraps useEffect with an empty dependency array to make intent explicit.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, [])
}
