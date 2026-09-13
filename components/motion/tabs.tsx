"use client"
// beui.dev/components/motion/tabs

import {
  motion,
  MotionConfig,
  useReducedMotion,
  type Transition,
} from "motion/react"
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { EASE_OUT } from "@/lib/ease"
import { cn } from "@/lib/utils"

type Variant = "pill" | "underline" | "segment"

type Ctx = {
  value: string
  setValue: (v: string) => void
  layoutId: string
  variant: Variant
  /**
   * Stack panels instead of hiding them: inactive panels keep their layout
   * space (visibility:hidden) so the container height never changes on switch.
   * Pair with a CSS grid wrapper that places panels in the same cell.
   */
  stack: boolean
}

const TabsCtx = createContext<Ctx | null>(null)

function useTabs() {
  const ctx = useContext(TabsCtx)
  if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>")
  return ctx
}

// Weighty spring for the active-tab indicator: a touch of overshoot so it
// settles with life instead of snapping.
const transition: Transition = {
  type: "spring",
  stiffness: 170,
  damping: 24,
  mass: 1.2,
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = "pill",
  stack = false,
  children,
  className,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  variant?: Variant
  stack?: boolean
  children: ReactNode
  className?: string
}) {
  const [internal, setInternal] = useState(defaultValue ?? "")
  const layoutId = useId()
  const reduce = useReducedMotion()
  const controlled = value !== undefined
  const current = controlled ? value : internal
  const setValue = useCallback(
    (v: string) => {
      if (!controlled) setInternal(v)
      onValueChange?.(v)
    },
    [controlled, onValueChange]
  )
  const contextValue = useMemo(
    () => ({ value: current, setValue, layoutId, variant, stack }),
    [current, layoutId, setValue, variant, stack]
  )
  return (
    <MotionConfig transition={reduce ? { duration: 0 } : transition}>
      <TabsCtx.Provider value={contextValue}>
        {/* layoutRoot: the indicator's layoutId measures in page coordinates, so
            inside fixed/scrolled containers it would replay scroll offsets as
            movement. The pill only ever travels within the list, so scoping
            projection to the Tabs wrapper is always correct. */}
        <motion.div layoutRoot className={className}>
          {children}
        </motion.div>
      </TabsCtx.Provider>
    </MotionConfig>
  )
}

const listClasses: Record<Variant, string> = {
  pill: "inline-flex items-center gap-1 rounded-full bg-card p-1",
  underline: "inline-flex items-center gap-1 border-b border-border",
  segment: "inline-flex items-center gap-0 rounded-lg bg-card p-0.5",
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { variant } = useTabs()
  return (
    <div role="tablist" className={cn(listClasses[variant], className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
  indicatorClassName,
}: {
  value: string
  children: ReactNode
  className?: string
  indicatorClassName?: string
}) {
  const { value: current, setValue, layoutId, variant } = useTabs()
  const active = current === value

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return
    const list = event.currentTarget.closest("[role='tablist']")
    const tabs = list ? Array.from(list.querySelectorAll<HTMLElement>("[role='tab']")) : []
    if (tabs.length === 0) return
    const index = tabs.indexOf(event.currentTarget)
    let next = index
    if (key === "ArrowRight") next = (index + 1) % tabs.length
    else if (key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length
    else if (key === "Home") next = 0
    else next = tabs.length - 1
    event.preventDefault()
    const nextValue = tabs[next].getAttribute("data-tab")
    if (nextValue != null) setValue(nextValue)
    tabs[next].focus()
  }

  const tabProps = {
    "data-tab": value,
    tabIndex: active ? 0 : -1,
    onKeyDown: handleKeyDown,
  }

  if (variant === "underline") {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        {...tabProps}
        onClick={() => setValue(value)}
        className={cn(
          "relative isolate -mb-px inline-flex min-h-[44px] items-center px-3 pt-1 pb-2.5 text-sm font-medium transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        {children}
        {active ? (
          <motion.span
            layoutId={layoutId}
            layout="position"
            className={cn(
              "absolute right-0 -bottom-px left-0 h-px bg-primary",
              indicatorClassName
            )}
          />
        ) : null}
      </button>
    )
  }

  const radius = variant === "pill" ? "rounded-full" : "rounded-md"

  return (
    <div className="relative">
      {active ? (
        <motion.span
          layoutId={layoutId}
          layout="position"
          style={{ borderRadius: variant === "pill" ? 9999 : 8 }}
          className={cn(
            "absolute inset-0 bg-primary",
            radius,
            indicatorClassName
          )}
        />
      ) : null}
      <button
        type="button"
        role="tab"
        aria-selected={active}
        {...tabProps}
        onClick={() => setValue(value)}
        className={cn(
          "relative z-10 inline-flex w-full items-center justify-center bg-transparent px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none",
          "transition-colors",
          active
            ? "text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
          radius,
          className
        )}
      >
        {children}
      </button>
    </div>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { value: current, stack } = useTabs()
  const reduce = useReducedMotion()
  const active = current === value
  // Inactive panels stay mounted but hidden, so their content (e.g. source
  // code) is present in the server-rendered HTML for crawlers and assistive
  // tech, instead of being dropped from the DOM.
  if (!active) {
    if (stack) {
      // Keeps its size so the stacked layout never shifts; invisible + inert
      // so it stays out of sight, the tab order and the a11y tree.
      return (
        <div
          aria-hidden
          inert
          className={cn("pointer-events-none invisible", className)}
        >
          {children}
        </div>
      )
    }
    return (
      <div hidden className={className}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: reduce ? 0 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      className={cn("mt-4", className)}
    >
      {children}
    </motion.div>
  )
}
