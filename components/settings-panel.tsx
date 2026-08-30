"use client"

import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "motion/react"
import { X } from "@phosphor-icons/react"
import {
  ACCENT_COLORS,
  FONT_OPTIONS,
  useSettings,
} from "@/components/settings-context"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
}

const THEME_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { accent, setAccent, font, setFont, fontCssFamily } = useSettings()
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-background shadow-2xl sm:w-100"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Settings
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close settings"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-4 py-5">
              {/* Theme */}
              <section>
                <SectionLabel>Theme</SectionLabel>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {THEME_OPTIONS.map((t) => {
                    const selected =
                      t.id === "system"
                        ? resolvedTheme === undefined
                        : resolvedTheme === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id)}
                        aria-pressed={selected}
                        className={cn(
                          "cursor-pointer rounded-lg border py-1.5 text-[11px] font-medium transition-colors outline-none",
                          "hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Accent */}
              <section>
                <SectionLabel>Accent</SectionLabel>
                <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAccent(c.id)}
                      aria-pressed={accent === c.id}
                      title={c.label}
                      className={cn(
                        "h-7 w-full rounded-sm transition-all duration-150",
                        accent === c.id
                          ? "opacity-100 outline -outline-offset-2 outline-ring"
                          : "opacity-40 hover:opacity-80",
                      )}
                      style={{ background: c.swatch }}
                    />
                  ))}
                </div>
              </section>

              {/* Font */}
              <section>
                <SectionLabel>Font</SectionLabel>
                <div className="mt-3 flex flex-col gap-1.5">
                  {FONT_OPTIONS.map((f) => {
                    const selected = font === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFont(f.id)}
                        aria-pressed={selected}
                        style={{ fontFamily: f.cssFamily }}
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors outline-none",
                          "hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        <span>{f.label}</span>
                        <span className="text-[10px] font-medium tracking-widest text-muted-foreground/60 uppercase">
                          {f.tag}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Preview of current typing font */}
              <section>
                <SectionLabel>Preview</SectionLabel>
                <p
                  className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-3 text-lg"
                  style={{ fontFamily: fontCssFamily }}
                >
                  The quick brown fox jumps over the lazy dog.
                </p>
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  )
}
