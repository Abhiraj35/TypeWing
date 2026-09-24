"use client"

import { WifiSlash } from "@phosphor-icons/react"
import { useSocket } from "./socket-provider"

/**
 * Shown whenever the socket drops: the seat is held server side for the grace
 * window, so this reads as "reconnecting" rather than elimination.
 */
export function ConnectionBanner() {
  const { connected } = useSocket()
  if (connected) return null
  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-500 backdrop-blur-md"
    >
      <WifiSlash size={16} weight="bold" className="shrink-0" />
      <span>Connection lost — your seat is held and we&apos;re reconnecting.</span>
    </div>
  )
}