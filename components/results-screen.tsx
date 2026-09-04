"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { motion } from "motion/react"
import {
  ArrowClockwise,
  CaretRight,
  Target,
} from "@phosphor-icons/react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { saveIfPersonalBest } from "@/lib/personal-best"
import { isInvalidTestResult } from "@/lib/validate-result"
import type { ResultStats, WpmSnapshot } from "@/lib/result-types"
import { cn } from "@/lib/utils"

interface ResultsScreenProps {
  stats: ResultStats
  onRestart: () => void
  onNext: () => void
}

// ---- Animated counter -------------------------------------------------------

function AnimatedNumber({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState<number | null>(null)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  if (display === null) return <span className="tabular-nums">0</span>
  return <span className="tabular-nums">{display}</span>
}

// ---- WPM / raw line chart ---------------------------------------------------

interface ChartDatum {
  second: number
  wpm: number
  raw: number
}

function WpmChart({ history }: { history: WpmSnapshot[] }) {
  const data: ChartDatum[] = useMemo(
    () =>
      history.map((d) => ({
        second: d.second,
        wpm: d.wpm,
        raw: d.raw,
      })),
    [history],
  )

  const { maxRaw } = useMemo(
    () => ({
      maxRaw: Math.max(...data.map((d) => d.raw), 10),
    }),
    [data],
  )

  const secondTicks = useMemo(() => {
    const seconds = data.map((d) => d.second)
    if (seconds.length === 0) return [0]
    const hi = Math.max(...seconds)
    const step = Math.max(1, Math.ceil(hi / 8))
    const ticks: number[] = []
    for (let t = 1; t <= hi; t += step) ticks.push(t)
    if (ticks[ticks.length - 1] !== hi) ticks.push(hi)
    return ticks
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Not enough data to plot — finish a longer test.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.06}
          />
          <XAxis
            dataKey="second"
            type="number"
            domain={[0, "dataMax"]}
            ticks={secondTicks}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.35 }}
            tickFormatter={(v: number) => `${Math.round(v)}`}
          />
          <YAxis
            domain={[0, Math.ceil(maxRaw * 1.2)]}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.35 }}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.15, strokeWidth: 1 }}
            content={({ active, payload, label }) => (
              <ChartHoverCard
                active={active ?? false}
                payload={payload ?? []}
                label={label ?? 0}
              />
            )}
          />
          <Line
            dataKey="raw"
            type="monotone"
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="wpm"
            type="monotone"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartHoverCard({
  active,
  payload,
  label,
}: {
  active: boolean
  payload: ReadonlyArray<{ payload?: unknown; dataKey?: unknown }>
  label: number | string
}) {
  if (!active || payload.length === 0) return null
  const point = payload[0]?.payload as ChartDatum | undefined
  if (!point) return null

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-foreground">{label}s</p>
      <div className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
          wpm <span className="font-semibold text-foreground">{point.wpm}</span>
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-muted-foreground/40 align-middle" />
          raw <span className="font-semibold text-foreground">{point.raw}</span>
        </span>
      </div>
    </div>
  )
}

// ---- Stat tile --------------------------------------------------------------

function Stat({
  label,
  value,
  suffix = "",
  highlight = false,
  hint,
}: {
  label: string
  value: number | string
  suffix?: string
  highlight?: boolean
  hint?: ReactNode
}) {
  const numeric = typeof value === "number"
  return (
    <div className="flex flex-col items-center text-center">
      <p
        className={cn(
          "flex items-baseline gap-0.5 text-3xl font-semibold",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {numeric ? <AnimatedNumber value={value as number} /> : value}
        {suffix && (
          <span className="text-lg font-medium text-muted-foreground">{suffix}</span>
        )}
      </p>
      <p className="mt-1 text-[11px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>
      )}
    </div>
  )
}

// ---- ResultsScreen ----------------------------------------------------------

export function ResultsScreen({ stats, onRestart, onNext }: ResultsScreenProps) {
  const invalid = isInvalidTestResult(stats)
  const { mode, modeDetail } = stats

  // Record personal best once per mount (event context — safe to touch storage).
  const [pb] = useState(() =>
    invalid ? null : saveIfPersonalBest(mode, modeDetail, stats.wpm, stats.accuracy),
  )

  const language = useMemo(() => {
    const value = (stats as { language?: string }).language
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : null
  }, [stats])

  // Keyboard shortcuts: Enter = next test, Cmd/Ctrl+Enter = restart.
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onRestart()
      } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener("keydown", handle)
    return () => window.removeEventListener("keydown", handle)
  }, [onNext, onRestart])

  if (invalid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-full flex-col items-center gap-4 px-2 text-center"
      >
        <p className="font-mono text-3xl font-bold text-muted-foreground">
          invalid result
        </p>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          No keystrokes were recorded, so scores can&apos;t be calculated. This
          usually happens if the timer ran out before you typed, focus was lost,
          or the test ended right after it started.
        </p>
        <ShortcutButtons onRestart={onRestart} onNext={onNext} />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-2xl"
    >
      <div className="flex flex-col items-center gap-3 px-2 text-center">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          {mode} {modeDetail}
          {language ? ` · ${language}` : ""}
        </p>
        {stats.author && (
          <p className="-mt-1 text-sm text-muted-foreground">— {stats.author}</p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-5xl font-bold tabular-nums text-primary">
            <AnimatedNumber value={stats.wpm} />
          </span>
          <span className="mb-1 text-xl font-medium text-muted-foreground">wpm</span>
        </div>

        <div className="grid w-full grid-cols-3 gap-4">
          <Stat label="acc" value={stats.accuracy} suffix="%" />
          <Stat label="raw" value={stats.raw} />
          <Stat label="consistency" value={stats.consistency} suffix="%" />
        </div>

        {pb?.isNewPb && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
          >
            <Target size={13} weight="fill" aria-hidden />
            new personal best
          </motion.p>
        )}

        <div className="mt-2 w-full">
          <WpmChart history={stats.wpmHistory} />
        </div>

        <ShortcutButtons onRestart={onRestart} onNext={onNext} />
      </div>
    </motion.div>
  )
}

function ShortcutButtons({
  onRestart,
  onNext,
}: {
  onRestart: () => void
  onNext: () => void
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CaretRight size={14} aria-hidden />
        Next test
        <kbd className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px]">
          Enter
        </kbd>
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowClockwise size={14} aria-hidden />
        Restart
        <kbd className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px]">
          ⌘↵
        </kbd>
      </button>
    </div>
  )
}
