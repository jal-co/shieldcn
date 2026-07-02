/**
 * shieldcn
 * components/stats/stats-section
 *
 * Entrance choreography for /stats page sections.
 */

"use client"

import { motion, useReducedMotion } from "motion/react"

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 *    0ms   page paints, all sections offset 12px down, hidden
 *   80ms   section 0 (header + overview) springs up + fades in
 *  180ms   section 1 (traffic chart) follows
 *  280ms   section 2 (audience map) follows
 *   ...    each section staggers +100ms as it enters the viewport
 *
 * Charts run their own clip-reveal after their section lands.
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  stagger: 0.1, //   delay between sections (s)
  firstDelay: 0.08, // beat before the first section moves (s)
}

const ENTER = {
  y: 12, //          initial downward offset (px)
  spring: { type: "spring", stiffness: 260, damping: 30 } as const,
}

export function StatsSection({
  index = 0,
  children,
}: {
  /** Position in the entrance sequence — drives the stagger. */
  index?: number
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return <div>{children}</div>

  return (
    <motion.div
      initial={{ opacity: 0, y: ENTER.y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...ENTER.spring,
        delay: TIMING.firstDelay + index * TIMING.stagger,
      }}
    >
      {children}
    </motion.div>
  )
}
