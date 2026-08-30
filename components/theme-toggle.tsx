"use client"

import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"

export function ThemeToggle() {
  const mounted = useMounted()
  const { resolvedTheme, setTheme } = useTheme()

  if (!mounted) return null

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-md border border-border bg-card px-4 py-2 text-sm text-card-foreground transition-colors hover:bg-muted"
    >
      Toggle {resolvedTheme === "dark" ? "light" : "dark"}
    </button>
  )
}