"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gear, GithubLogo, Info, Note } from "@phosphor-icons/react"
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
      {children}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppChromeProvider>
  )
}

function SiteHeader() {
  const pathname = usePathname()
  const { setSettingsOpen } = useAppChrome()

  const iconButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

  return (
      <header className="site-header flex shrink-0 justify-center px-6 py-4">
      <div className="flex w-full max-w-site items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="TypeWing home" className="font-doto text-4xl font-bold text-primary">
            TypeWing
          </Link>
          <div className="flex items-center gap-0.5">
            <Link
              href="/about"
              prefetch
              className={cn(
                iconButtonClass,
                pathname === "/about" && "text-foreground",
              )}
              aria-current={pathname === "/about" ? "page" : undefined}
              aria-label="About TypeWing"
            >
              <Info size={16} aria-hidden />
            </Link>
            <Link
              href="/changelog"
              prefetch
              className={cn(
                iconButtonClass,
                pathname === "/changelog" && "text-foreground",
              )}
              aria-current={pathname === "/changelog" ? "page" : undefined}
              aria-label="Changelog"
            >
              <Note size={16} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={cn(iconButtonClass, "cursor-pointer")}
              aria-label="Settings"
            >
              <Gear size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="h-9 rounded-lg border border-border/70 bg-background px-1 flex items-center justify-center shadow-sm transition-colors hover:border-border hover:bg-muted/50" />
          <a
            href="https://github.com/Abhiraj35/TypeWing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="GitHub repository"
          >
            <GithubLogo size={16} aria-hidden />
          </a>
        </div>
      </div>
    </header>
  )
}
