"use client"

/* ─────────────────────────────────────────────────────────
 * DASHBOARD REVEAL — ENTRANCE STORYBOARD
 *
 * Read top-to-bottom. Each `at` is ms after the content mounts.
 * The shell renders visible by default; this only adds a short,
 * spring-driven settle so sections assemble with intent, not a wait.
 *
 *    0ms   section 1 rises  (y 8 → 0, opacity 0 → 1)
 *   60ms   section 2 rises  (staggered)
 *  120ms   section 3 rises
 *  ...      each subsequent direct child + STAGGER
 *
 * Reduced motion: instant, no transform.
 * ───────────────────────────────────────────────────────── */

import * as React from "react"
import { motion, useReducedMotion, type Variants } from "motion/react"
import { cn } from "@/lib/utils"

const STAGGER = 0.06 // s between sections
const OFFSET_Y = 8 // px each section rises from

const CONTAINER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
}

const ITEM: Variants = {
  hidden: { opacity: 0, y: OFFSET_Y },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.7 },
  },
}

/**
 * The dashboard content column. Renders as a flex column (so `className`
 * carries the page's gap/padding) and staggers each direct child in on mount.
 */
export function DashboardReveal({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  const items = React.Children.toArray(children)

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div variants={CONTAINER} initial="hidden" animate="show" className={cn(className)}>
      {items.map((child, i) => (
        <motion.div key={i} variants={ITEM} className="min-w-0">
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}
