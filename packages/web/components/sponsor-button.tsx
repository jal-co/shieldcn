/**
 * shieldcn
 * components/sponsor-button
 *
 * Navbar "Sponsor" CTA — a GitHub-Sponsors-style button with a rose heart that
 * fills and double-beats on hover, plus a soft rose wash + ring. Idle it reads
 * as a quiet ghost link; on hover it warms up.
 */

"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { motion, type Variants } from "motion/react"
import { cn } from "@/lib/utils"

const MotionLink = motion.create(Link)

// Hovering the whole button drives the "beat" variant on the heart.
const HEART: Variants = {
  rest: { scale: 1 },
  beat: {
    // double-beat: up, settle, up again, rest
    scale: [1, 1.25, 1.05, 1.2, 1],
    transition: { duration: 0.6, times: [0, 0.2, 0.4, 0.6, 1], ease: "easeInOut" },
  },
}

export function SponsorButton({ className }: { className?: string }) {
  return (
    <MotionLink
      href="/sponsor"
      initial="rest"
      animate="rest"
      whileHover="beat"
      className={cn(
        "group relative inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium",
        "text-rose-600 dark:text-rose-400",
        "ring-1 ring-inset ring-transparent transition-colors duration-200",
        "hover:bg-rose-500/10 hover:ring-rose-500/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50",
        className,
      )}
    >
      <motion.span className="inline-flex" variants={HEART}>
        <Heart className="size-3.5 fill-rose-500 stroke-rose-500" />
      </motion.span>
      Sponsor
    </MotionLink>
  )
}
