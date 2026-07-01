/**
 * shieldcn
 * components/sponsor-entrance
 *
 * Page "transition in" for the sponsor page. Stages each section (hero, tier
 * rows, stargazers card, CTA) into view on mount using the Storyboard
 * Animation pattern — a single stage integer drives a staggered fade-up.
 * Timings are baked-in literals, tuned for a calm, top-to-bottom cascade.
 */

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 *    0ms   all sections hidden (opacity 0, slid down 16px, blurred)
 *  120ms   stage advances → reveals begin
 *          each <SponsorReveal step={n}> fades up, staggered 110ms by step
 *
 *   step 0  hero                 (120ms)
 *   step 1  OSS Programs tier    (230ms)
 *   step 2  stargazers carousel  (340ms)
 *   step 3  other supporters     (450ms)
 *   step 4  CTA                  (560ms)
 * ───────────────────────────────────────────────────────── */

"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

const TIMING = {
  start: 120, // ms after mount before the cascade begins
}

/* Per-section reveal */
const REVEAL = {
  stagger: 0.11, // seconds between each step
  offsetY: 16, // px each section slides up from
  blur: 6, // px starting blur, burns off on settle
  spring: { type: "spring" as const, stiffness: 320, damping: 30 },
}

export function SponsorReveal({
  step,
  children,
  className,
}: {
  step: number
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? true : false)

  useEffect(() => {
    if (reduce) return
    const t = setTimeout(() => setShown(true), TIMING.start)
    return () => clearTimeout(t)
  }, [reduce])

  // Reduced motion can flip from null (unresolved, matches SSR) to true
  // *after* mount, once Motion's media-query check resolves — so the reduced
  // branch must specify every property the animated branch does (opacity,
  // y, filter), settled at its final value, or those properties freeze at
  // whatever they were mid-entrance instead of resetting.
  const settled = { opacity: 1, y: 0, filter: "blur(0px)" }

  return (
    <motion.div
      className={className}
      initial={reduce ? settled : {
        opacity: 0,
        y: REVEAL.offsetY,
        filter: `blur(${REVEAL.blur}px)`,
      }}
      animate={reduce ? settled : {
        opacity: shown ? 1 : 0,
        y: shown ? 0 : REVEAL.offsetY,
        filter: shown ? "blur(0px)" : `blur(${REVEAL.blur}px)`,
      }}
      transition={reduce ? { duration: 0 } : { ...REVEAL.spring, delay: step * REVEAL.stagger }}
    >
      {children}
    </motion.div>
  )
}
