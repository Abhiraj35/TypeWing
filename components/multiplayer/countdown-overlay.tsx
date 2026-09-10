"use client"

import { motion } from "motion/react"

export function CountdownOverlay({ count, words }: { count: number; words: string[] }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 px-6 backdrop-blur-md">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Get ready</p>
        <motion.p key={count} initial={{ opacity: 0, scale: 0.65 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 font-mono text-8xl font-bold tracking-tight text-foreground">
          {count > 0 ? count : "GO"}
        </motion.p>
        <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">{words.join(" ")}</p>
      </div>
    </div>
  )
}
