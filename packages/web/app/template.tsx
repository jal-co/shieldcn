/**
 * shieldcn
 * app/template
 *
 * Enter-only page transition. Next re-mounts template.tsx on every navigation,
 * so a one-shot fade + tiny rise plays per route without AnimatePresence or a
 * leaving hook. Respects prefers-reduced-motion (no movement, instant).
 */

"use client"

import { motion, useReducedMotion, type Transition } from "motion/react"

// Enter fade — fast + subtle so it never delays perceived content load.
const ENTER = {
  offsetY: 8, //   px the content rises from
  spring: { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 },
}

export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : ENTER.offsetY }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : (ENTER.spring as Transition)}
    >
      {children}
    </motion.div>
  )
}
