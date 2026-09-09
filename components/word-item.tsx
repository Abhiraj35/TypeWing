"use client"

import { memo, type RefObject } from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

export interface WordItemProps {
  word: string
  /** Live `typed` for the active word; finalized input for past; "" for future. */
  displayInput: string
  isActive: boolean
  isPast: boolean
  elemRef?: RefObject<HTMLDivElement | null>
}

export const WordItem = memo(function WordItem({
  word,
  displayInput,
  isActive,
  isPast,
  elemRef,
}: WordItemProps) {
  const reduceMotion = useReducedMotion()
  const cursorAtEnd = isActive && displayInput.length >= word.length
  const cursorTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 700, damping: 38, mass: 0.6 }

  return (
    <div ref={isActive ? elemRef : undefined} className="relative whitespace-nowrap">
      {word.split("").map((char, cIdx) => {
        let color = "text-foreground"
        if (isPast || isActive) {
          if (cIdx < displayInput.length) {
            // Typed letters fade to dim; wrong letters stay red for feedback.
            color = displayInput[cIdx] === char ? "text-muted-foreground/40" : "text-destructive"
          } else if (isPast) {
            // An incomplete past word still needs an error indicator.
            color = displayInput !== word ? "text-destructive" : "text-muted-foreground/40"
          }
        }
        const isLastChar = cIdx === word.length - 1

        return (
          <span key={cIdx} className="relative inline-block">
            {/* Cursor before this char. Stable layoutId → motion FLIP-animates the
                cursor smoothly when wordIndex changes (spacebar press). */}
            {isActive && !cursorAtEnd && cIdx === displayInput.length && (
              <motion.span
                layoutId="cursor-active"
                className="typing-cursor absolute top-0.5 -left-px h-[1.2em] w-[3px] rounded-xs bg-primary"
                transition={cursorTransition}
              />
            )}
            {isActive && isLastChar && cursorAtEnd && !(displayInput.length > word.length) && (
              <motion.span
                layoutId="cursor-active"
                className="typing-cursor absolute top-0.5 -right-px h-[1.2em] w-[3px] rounded-xs bg-primary"
                transition={cursorTransition}
              />
            )}
            <span className={cn("transition-colors duration-60", color)}>{char}</span>
          </span>
        )
      })}

      {(isActive || isPast) &&
        displayInput.length > word.length &&
        displayInput.slice(word.length).split("").map((extra, eIdx) => (
          <span key={`extra-${eIdx}`} className="relative inline-block text-destructive/60">
            {eIdx === displayInput.length - word.length - 1 && isActive && (
              <motion.span
                layoutId="cursor-active"
                className="typing-cursor absolute top-0.5 -right-px h-[1.2em] w-[3px] rounded-xs bg-primary"
                transition={cursorTransition}
              />
            )}
            {extra}
          </span>
        ))}
    </div>
  )
})
