/**
 * shieldcn
 * components/site-announcement
 *
 * The hero "New" pill. Wraps the shared Announcement primitive with a little
 * pizzazz: once the HeroEntrance reveal has settled, a diagonal sheen sweeps
 * across the pill on a loop, and the arrow nudges right on hover.
 *
 * Built with the Storyboard Animation pattern: a single `stage` integer gates
 * the sheen, every timing + motion value is a named constant. The SHEEN values
 * were tuned and baked in as static literals.
 */

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each value is ms after mount. HeroEntrance owns the
 * pill's opacity/scale reveal; this only waits for it to settle, then loops.
 *
 *    0ms   waiting (HeroEntrance is sliding the pill in)
 *  700ms   sheen sweep arms and begins its forever loop
 *   ∞      sheen re-sweeps (sheen.secs on, sheen.gapSecs off)
 *  hover   arrow nudges right (group-hover, CSS)
 * ───────────────────────────────────────────────────────── */

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion, type Transition } from "motion/react"
import {
  Announcement,
  AnnouncementBadge,
  AnnouncementContent,
} from "@/components/shadcncraft/pro-application/announcement"

// ---------------------------------------------------------------------------
// TIMING — single source of truth for the staged entrance (ms after mount).
// ---------------------------------------------------------------------------

const TIMING = {
  sheenArm: 700, //   sheen begins after the HeroEntrance reveal settles
}

// ---------------------------------------------------------------------------
// SHEEN — the diagonal light sweep across the pill (tuned, baked-in literals).
// ---------------------------------------------------------------------------

const SHEEN = {
  from: -150, //         % start x offset (off the left edge)
  to: 200, //            % end x offset (off the right edge)
  width: 49, //          % width of the moving highlight band
  secs: 2.9, //          seconds per sweep
  gapSecs: 3.1, //       pause between sweeps
  intensity: 0.1, //     primary-tint strength at the band centre (0–1)
}

// ---------------------------------------------------------------------------
// ARROW — the trailing chevron that reacts to hover (CSS, group-hover).
// ---------------------------------------------------------------------------

const ARROW = {
  nudge: "group-hover:translate-x-0.5", // px shift on hover
  ease: "transition-transform duration-200 ease-out",
}

export function SiteAnnouncement() {
  const sheen = SHEEN

  // Single integer stage drives the storyboard.
  // 1: sheen armed (begins looping)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage(0)
    const timer = setTimeout(() => setStage(1), TIMING.sheenArm)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Announcement className="group relative overflow-hidden">
      {/* sheen sweep — armed at stage 1, then loops forever */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{
          width: `${sheen.width}%`,
          background: `linear-gradient(105deg, transparent 0%, color-mix(in oklch, var(--primary) ${Math.round(
            sheen.intensity * 100,
          )}%, transparent) 50%, transparent 100%)`,
        }}
        initial={{ x: `${sheen.from}%` }}
        animate={{ x: stage >= 1 ? [`${sheen.from}%`, `${sheen.to}%`] : `${sheen.from}%` }}
        transition={
          {
            repeat: Infinity,
            duration: sheen.secs,
            ease: "easeInOut",
            repeatDelay: sheen.gapSecs,
          } as Transition
        }
      />

      <AnnouncementBadge>New</AnnouncementBadge>
      <AnnouncementContent asChild>
        <Link href="/docs/charts" className="hover:underline underline-offset-4">
          Charts — star history, issues &amp; npm downloads
          <ArrowRight className={`size-3 ${ARROW.ease} ${ARROW.nudge}`} />
        </Link>
      </AnnouncementContent>
    </Announcement>
  )
}
