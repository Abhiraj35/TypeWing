"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "motion/react"
import { CaretDown, Monitor, Moon, Sun } from "@phosphor-icons/react"
import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { id: "light" as const, label: "Light", icon: Sun },
  { id: "dark" as const, label: "Dark", icon: Moon },
  { id: "system" as const, label: "System", icon: Monitor },
]

function getThemeIcon(theme: string | undefined) {
  switch (theme) {
    case "dark":
      return Moon
    case "light":
      return Sun
    default:
      return Monitor
  }
}

export function ThemeSwitcher({className}: {className?: string}) {
  const mounted = useMounted()
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("mousedown", onClickOutside)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("mousedown", onClickOutside)
    }
  }, [open, close])

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-lg p-1.5 text-muted-foreground"
        aria-label="Theme"
      >
        <Monitor size={16} aria-hidden />
      </button>
    )
  }

  const Icon = getThemeIcon(resolvedTheme)

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Theme: ${theme}`}
        className={cn(
          "flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer",
          open && "text-foreground",
        )}
      >
        <Icon size={16} aria-hidden weight="duotone" />
        <CaretDown
          size={10}
          aria-hidden
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            role="menu"
            aria-label="Select theme"
            className="absolute top-full right-0 z-50 mt-1.5 min-w-35 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
          >
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setTheme(opt.id)
                    close()
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none cursor-pointer",
                    "hover:bg-muted/50 focus-visible:bg-muted/50",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  <opt.icon size={14} aria-hidden weight={active ? "fill" : "regular"} />
                  {opt.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
