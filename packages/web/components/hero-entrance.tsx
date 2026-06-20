/**
 * shieldcn
 * components/hero-entrance
 *
 * Homepage "page transition in". Stages the hero elements (announcement,
 * heading, subtext, input, icon cloud, scroll cta) into view on mount using
 * the Storyboard Animation pattern. Ships three variants (cascade / snap /
 * unfold). Timings were tuned with DialKit and baked into the variant presets.
 */

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Read top-to-bottom. Each `at` value is ms after mount.
 *
 * Timings below are the `cascade` variant (snap is faster, unfold slower).
 *
 *    0ms   hero hidden (opacity 0, slid down, blurred)
 *  120ms   announcement pill fades up
 *  260ms   heading fades up
 *  420ms   subtext fades up
 *  560ms   generate input fades up
 *  300ms   icon cloud fades + scales in (runs alongside text)
 *  760ms   scroll cta fades in last
 * ───────────────────────────────────────────────────────── */

"use client"

import { useEffect, useState } from "react"
import { motion, type Transition } from "motion/react"

// ---------------------------------------------------------------------------
// Storyboard variants
//
// Each variant is a full preset: stage timings (ms after mount) + the motion
// "feel" of the rising text column and the icon cloud. Set the default
// per-page with the `variant` prop.
//
//   cascade — smooth staggered rise + blur burn-off (the default)
//   snap    — fast, tight, minimal travel; everything lands quickly
//   unfold  — slow + cinematic; long travel, heavier blur, gentle bounce
// ---------------------------------------------------------------------------

type VariantConfig = {
  /** Stage delays in ms after mount. The ONLY place timing values live. */
  timing: {
    announcement: number
    heading: number
    subtext: number
    input: number
    cloud: number
    scrollCta: number
  }
  /** Rising text/input column reveal. */
  rise: {
    offsetY: number // px each element slides up from
    blur: number //    px blur burned off as it settles
    spring: { type: "spring"; visualDuration: number; bounce: number }
  }
  /** Icon cloud reveal (scales in rather than rising). */
  cloud: {
    initialScale: number
    spring: { type: "spring"; stiffness: number; damping: number }
  }
}

const VARIANTS = {
  cascade: {
    timing: { announcement: 120, heading: 260, subtext: 420, input: 560, cloud: 300, scrollCta: 760 },
    rise: { offsetY: 16, blur: 8, spring: { type: "spring", visualDuration: 0.5, bounce: 0.15 } },
    cloud: { initialScale: 0.92, spring: { type: "spring", stiffness: 260, damping: 28 } },
  },
  snap: {
    timing: { announcement: 60, heading: 140, subtext: 220, input: 300, cloud: 160, scrollCta: 420 },
    rise: { offsetY: 10, blur: 4, spring: { type: "spring", visualDuration: 0.3, bounce: 0.05 } },
    cloud: { initialScale: 0.96, spring: { type: "spring", stiffness: 460, damping: 26 } },
  },
  unfold: {
    timing: { announcement: 200, heading: 440, subtext: 700, input: 960, cloud: 360, scrollCta: 1240 },
    rise: { offsetY: 28, blur: 14, spring: { type: "spring", visualDuration: 0.8, bounce: 0.3 } },
    cloud: { initialScale: 0.85, spring: { type: "spring", stiffness: 170, damping: 22 } },
  },
} satisfies Record<string, VariantConfig>

type VariantName = keyof typeof VARIANTS
const DEFAULT_VARIANT: VariantName = "cascade"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HeroEntranceProps {
  announcement: React.ReactNode
  heading: React.ReactNode
  subtext: React.ReactNode
  input: React.ReactNode
  cloud: React.ReactNode
  scrollCta: React.ReactNode
  /** Which entrance preset to play. Default: "cascade". */
  variant?: VariantName
  /**
   * When true, the right (cloud) slot renders without the scale/opacity
   * entrance wrapper. Use for a cloud that owns its own entrance (e.g. a
   * self-assembling README) so the two animations don't fight.
   */
  cloudStatic?: boolean
}

export function HeroEntrance({ variant = DEFAULT_VARIANT, ...slots }: HeroEntranceProps) {
  return <HeroEntranceStage variant={variant} {...slots} />
}

function HeroEntranceStage({
  variant,
  announcement,
  heading,
  subtext,
  input,
  cloud,
  scrollCta,
  cloudStatic = false,
}: Omit<HeroEntranceProps, "variant"> & { variant: VariantName }) {
  const preset = VARIANTS[variant]
  const t = preset.timing
  const riseCfg = preset.rise

  // Single integer stage drives the whole sequence.
  // 1: announcement  2: heading  3: subtext  4: input  5: cloud  6: scrollCta
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setStage(s => Math.max(s, 1)), t.announcement))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 2)), t.heading))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 3)), t.subtext))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 4)), t.input))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 5)), t.cloud))
    timers.push(setTimeout(() => setStage(s => Math.max(s, 6)), t.scrollCta))
    return () => timers.forEach(clearTimeout)
  }, [t.announcement, t.heading, t.subtext, t.input, t.cloud, t.scrollCta])

  // Reusable reveal props for a rising column element at a given stage.
  const rise = (atStage: number) => ({
    initial: {
      opacity: 0,
      y: riseCfg.offsetY,
      filter: `blur(${riseCfg.blur}px)`,
    },
    animate: {
      opacity: stage >= atStage ? 1 : 0,
      y: stage >= atStage ? 0 : riseCfg.offsetY,
      filter: stage >= atStage ? "blur(0px)" : `blur(${riseCfg.blur}px)`,
    },
    transition: riseCfg.spring as Transition,
  })

  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
        {/* Left — text content */}
        <div className="relative z-10 space-y-6 lg:w-1/2">
          <motion.div {...rise(1)}>{announcement}</motion.div>
          <motion.div {...rise(2)}>{heading}</motion.div>
          <motion.div {...rise(3)}>{subtext}</motion.div>
          <motion.div {...rise(4)}>{input}</motion.div>
        </div>

        {/* Right — visual slot. Either entrance-animated here, or static so it
            can own its own entrance (cloudStatic). */}
        {cloudStatic ? (
          <div className="relative z-0 hidden items-center justify-center md:flex lg:w-1/2 lg:-ml-8">
            {cloud}
          </div>
        ) : (
          <motion.div
            className="relative z-0 hidden items-center justify-center md:flex lg:w-1/2 lg:-ml-8"
            initial={{ opacity: 0, scale: preset.cloud.initialScale }}
            animate={{
              opacity: stage >= 5 ? 1 : 0,
              scale: stage >= 5 ? 1 : preset.cloud.initialScale,
            }}
            transition={preset.cloud.spring as Transition}
          >
            {cloud}
          </motion.div>
        )}
      </div>

      {/* Scroll cta — fades in last */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 6 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        {scrollCta}
      </motion.div>
    </>
  )
}
