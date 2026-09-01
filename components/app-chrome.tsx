"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Gear, GithubLogo, Info, Note } from "@phosphor-icons/react"
import { getStrictContext } from "@/lib/get-strict-context"
import { cn } from "@/lib/utils"
import { SettingsPanel } from "@/components/settings-panel"

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
    "rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

  return (
    <header className="flex shrink-0 justify-center border-b border-border px-6 py-3">
      <div className="flex w-full max-w-site items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-doto text-4xl font-bold text-primary">
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
        <a
          href="https://github.com/Abhiraj35/TypeWing"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg p-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <GithubLogo size={16} aria-hidden />
          <span className="hidden md:block">Open Source</span>
        </a>
      </div>
    </header>
  )
}
