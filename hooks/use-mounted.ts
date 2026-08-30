import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/**
 * Returns `true` only after the component has hydrated on the client.
 * Use this to gate UI that depends on browser-only state (localStorage,
 * theme, media queries) so SSR markup never differs from the client.
 */
export function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}