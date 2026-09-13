"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gear, Info, UsersThree } from "@phosphor-icons/react"
import { getStrictContext } from "@/lib/get-strict-context"
import { cn } from "@/lib/utils"
import { SettingsPanel } from "@/components/settings-panel"
import { ThemeSwitcher } from "@/components/theme-toggle"

interface AppChromeContextValue {
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

const [AppChromeProvider, useAppChrome] = getStrictContext<AppChromeContextValue>(
  "AppChrome",
)

export function AppChrome({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <AppChromeProvider value={{ settingsOpen, setSettingsOpen }}>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm text-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppChromeProvider>
  )
}

function SiteHeader() {
  const pathname = usePathname()
  const { setSettingsOpen } = useAppChrome()

  const iconButtonClass =
    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

  return (
    <header className="flex shrink-0 justify-center px-6 py-4 shadow-[0_1px_0_var(--color-border)]">
      <div className="flex w-full max-w-site items-center justify-between">
        <Link
          href="/"
          aria-label="Typewing home"
          className="font-(family-name:--font-geist-pixel-circle) text-3xl sm:text-4xl tracking-tight text-primary transition-opacity hover:opacity-90"
        >
          Typewing
        </Link>

        <nav aria-label="Site navigation" className="flex items-center gap-1 sm:gap-1.5">
          <Link
            href="/race"
            prefetch
            className={cn(
              iconButtonClass,
              "relative",
              pathname.startsWith("/race") && "bg-muted text-foreground",
            )}
            aria-current={pathname.startsWith("/race") ? "page" : undefined}
            aria-label="Multiplayer (beta)"
            title="Multiplayer (beta)"
          >
            <UsersThree size={17} aria-hidden />
            <span className="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={cn(iconButtonClass, "cursor-pointer")}
            aria-label="Settings"
            title="Settings"
          >
            <Gear size={17} aria-hidden />
          </button>
          <Link
            href="/about"
            prefetch
            className={cn(
              iconButtonClass,
              pathname === "/about" && "bg-muted text-foreground",
            )}
            aria-current={pathname === "/about" ? "page" : undefined}
            aria-label="About Typewing"
            title="About Typewing"
          >
            <Info size={17} aria-hidden />
          </Link>

          <ThemeSwitcher className="mr-1 flex h-9 items-center justify-center rounded-lg border border-border/70 bg-background px-1 shadow-xs transition-colors hover:border-border hover:bg-muted/50" />
        </nav>
      </div>
    </header>
  )
}
