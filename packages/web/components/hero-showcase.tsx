/**
 * shieldcn
 * components/hero-showcase
 *
 * Hero centerpiece that highlights BOTH product surfaces at once:
 *   - Charts: two live chart cards (GitHub star history + npm downloads)
 *   - Badges: a cluster of real badge SVGs floating over the cards
 *
 * Built with the Storyboard Animation pattern (single `stage` integer drives a
 * staged entrance) plus a continuous idle float. Every layout + motion value is
 * a named constant, tuned with DialKit and baked in.
 */

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD  (tuned with DialKit, baked in)
 *
 *    0ms   hidden (cards down + blurred, badges scaled to 0)
 *  120ms   back chart card rises in
 *  260ms   front chart card rises in
 *  440ms   badges pop in, staggered (BADGES.stagger apart)
 *   ∞      cards + badges idle-float on independent loops
 * ───────────────────────────────────────────────────────── */

"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { motion, useReducedMotion, type Transition } from "motion/react"
import { useBadgeMode } from "@/lib/use-badge-mode"

// ---------------------------------------------------------------------------
// Storyboard constants
// ---------------------------------------------------------------------------

/** Surface cards — the header banner + two chart cards. */
const CARDS = {
  riseY: 26, //  px each card slides up from
  blur: 12, //   px blur burned off on entrance
  spring: { type: "spring" as const, visualDuration: 0.7, bounce: 0.28 },
  floatAmp: 10, //   px idle vertical drift
  floatSecs: 7, //   seconds per idle loop
  items: [
    {
      key: "header",
      src: "/header/dots.svg?title=shieldcn&subtitle=Headers for your README&logo=shieldcn",
      alt: "repository header banner — shieldcn",
      // position within the stage (% of container)
      top: "10%",
      left: "3%",
      width: 312,
      rotate: -3,
      z: 30,
    },
    {
      key: "npm-chart",
      src: "/chart/npm/zod.svg?theme=blue",
      alt: "npm weekly downloads — zod",
      top: "40%",
      left: "3%",
      width: 244,
      rotate: -5,
      z: 20,
    },
    {
      key: "downloads",
      src: "/chart/npm/zod.svg?theme=emerald",
      alt: "npm weekly downloads — zod",
      top: "58%",
      left: "35%",
      width: 236,
      rotate: 5,
      z: 10,
    },
  ],
}

/** Floating badges — the "badges" half of the story. */
const BADGES = {
  initialScale: 0.4, // scale before popping in
  stagger: 0.09, //    seconds between each badge pop
  spring: { type: "spring" as const, visualDuration: 0.45, bounce: 0.45 },
  floatAmp: 7, //      px idle vertical drift
  floatSecs: 5, //     seconds per idle loop
  items: [
    { key: "npm", src: "/badge/npm-3.24.1.svg?variant=branded&logo=npm", alt: "npm version badge", top: "14%", left: "64%", z: 40 },
    { key: "build", src: "/badge/build-passing.svg?variant=branded&logo=githubactions", alt: "build passing badge", top: "30%", left: "56%", z: 40 },
    { key: "stars", src: "/badge/stars-140k.svg?variant=branded&logo=github", alt: "GitHub stars badge", top: "46%", left: "4%", z: 40 },
    { key: "coverage", src: "/badge/coverage-98%25.svg?variant=branded&logo=codecov", alt: "coverage badge", top: "60%", left: "64%", z: 40 },
    { key: "typescript", src: "/badge/typescript-5.x.svg?variant=branded&logo=typescript", alt: "TypeScript badge", top: "74%", left: "4%", z: 40 },
    { key: "license", src: "/badge/license-MIT.svg?variant=secondary", alt: "license MIT badge", top: "84%", left: "30%", z: 40 },
    { key: "discord", src: "/badge/discord-online.svg?variant=branded&logo=discord", alt: "discord badge", top: "82%", left: "56%", z: 40 },
  ],
}

// ---------------------------------------------------------------------------
// Hydration flag without setState-in-effect (lint-clean, mirrors HomeCharts).
// ---------------------------------------------------------------------------

function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeroShowcase() {
  const hydrated = useHydrated()
  const { adaptUrl } = useBadgeMode()
  const reduce = useReducedMotion()

  // Tuned layout + motion values baked out of DialKit before shipping.
  const d = {
    card1: 200,
    card2: 380,
    card3: 540,
    badges: 760,
    cards: {
      riseY: 26,
      blur: 12,
      floatAmp: 10,
      floatSecs: 7,
      spring: { type: "spring", stiffness: 100, damping: 25, mass: 1.5 },
    },
    badgeGroup: {
      scale: 1,
      stagger: 0.09,
      floatAmp: 7,
      floatSecs: 5,
      spring: { type: "spring", visualDuration: 0.45, bounce: 0.45 },
    },
  }

  // Single integer stage drives the whole entrance.
  // 1: back card  2: front card  3: badges
  // Reduced motion: skip straight to the final stage — no staggered reveal,
  // and (further down) no infinite idle-float loops.
  const [stage, setStage] = useState(reduce ? 4 : 0)

  useEffect(() => {
    if (reduce) return
    // Reset so the entrance sequence replays on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setStage(s => Math.max(s, 1)), d.card1))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 2)), d.card2))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 3)), d.card3))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 4)), d.badges))
    return () => timers.forEach(clearTimeout)
  }, [reduce, d.card1, d.card2, d.card3, d.badges])

  // Keep the placeholder identical in size to avoid layout shift pre-hydration.
  if (!hydrated) return <div className="h-[500px] w-full" />

  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[440px] translate-y-0">
        {/* ── Chart cards (the "charts" story) ── */}
        {CARDS.items.map((card, i) => {
          const atStage = i + 1 // back=1, front=2
          return (
            <motion.div
              key={card.key}
              className="absolute"
              style={{ top: card.top, left: card.left, width: card.width, zIndex: card.z }}
              initial={reduce
                ? { opacity: 1, y: 0, filter: "blur(0px)", rotate: card.rotate }
                : { opacity: 0, y: d.cards.riseY, filter: `blur(${d.cards.blur}px)`, rotate: card.rotate }}
              animate={reduce
                ? { opacity: 1, y: 0, filter: "blur(0px)", rotate: card.rotate }
                : {
                  opacity: stage >= atStage ? 1 : 0,
                  y: stage >= atStage ? 0 : d.cards.riseY,
                  filter: stage >= atStage ? "blur(0px)" : `blur(${d.cards.blur}px)`,
                  rotate: card.rotate,
                }}
              transition={reduce ? { duration: 0 } : (d.cards.spring as Transition)}
            >
              {/* idle float loop (separate layer so it never fights the entrance).
                  Reduced motion: no infinite loop — the card just sits still. */}
              <motion.div
                animate={{ y: !reduce && stage >= atStage ? [0, -d.cards.floatAmp, 0] : 0 }}
                transition={reduce ? { duration: 0 } : { repeat: Infinity, duration: d.cards.floatSecs, ease: "easeInOut", delay: i * 0.6 }}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/20"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={adaptUrl(card.src)} alt={card.alt} className="w-full select-none" draggable={false} />
              </motion.div>
            </motion.div>
          )
        })}

        {/* ── Floating badges (the "badges" story) ── */}
        {BADGES.items.map((badge, i) => (
          <motion.div
            key={badge.key}
            className="absolute"
            style={{ top: badge.top, left: badge.left, zIndex: badge.z }}
            initial={reduce ? { opacity: 1, scale: d.badgeGroup.scale } : { opacity: 0, scale: BADGES.initialScale }}
            animate={reduce ? { opacity: 1, scale: d.badgeGroup.scale } : {
              opacity: stage >= 4 ? 1 : 0,
              scale: stage >= 4 ? d.badgeGroup.scale : BADGES.initialScale,
            }}
            transition={reduce ? { duration: 0 } : { ...(d.badgeGroup.spring as Transition), delay: stage >= 4 ? i * d.badgeGroup.stagger : 0 }}
          >
            <motion.div
              animate={{ y: !reduce && stage >= 4 ? [0, -d.badgeGroup.floatAmp, 0] : 0 }}
              transition={reduce ? { duration: 0 } : { repeat: Infinity, duration: d.badgeGroup.floatSecs, ease: "easeInOut", delay: i * 0.4 }}
              className="drop-shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={adaptUrl(badge.src)} alt={badge.alt} className="h-7 select-none" draggable={false} />
            </motion.div>
          </motion.div>
        ))}
      </div>
    )
  }
