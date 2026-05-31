/**
 * shieldcn
 * components/animated-showcase
 *
 * Live row of animated badges for the showcase page. Renders real <img>
 * tags so the CSS animation (pulse / glow / shimmer) actually plays.
 *
 * Each badge URL carries an `?animate=` param. The animation is pure CSS
 * inside the SVG and respects `prefers-reduced-motion`, so motion-sensitive
 * visitors see the static badge.
 */

"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { useBadgeMode } from "@/lib/use-badge-mode"

interface AnimatedItem {
  title: string
  /** The animation mode, shown as a chip. */
  mode: "pulse" | "glow" | "shimmer"
  /** Badge path including the `?animate=` param. */
  badgePath: string
}

const ANIMATED_BADGES: AnimatedItem[] = [
  {
    title: "Live status",
    mode: "pulse",
    badgePath: "/badge/status-online-22c55e.svg?statusDot=true&animate=pulse",
  },
  {
    title: "CI passing",
    mode: "glow",
    badgePath: "/github/ci/vercel/next.js.svg?animate=glow",
  },
  {
    title: "Branded sweep",
    mode: "shimmer",
    badgePath: "/badge/build-passing.svg?variant=branded&logo=githubactions&animate=shimmer",
  },
  {
    title: "Deploying",
    mode: "pulse",
    badgePath: "/badge/deploy-building-f59e0b.svg?statusDot=true&animate=pulse",
  },
  {
    title: "Featured",
    mode: "shimmer",
    badgePath: "/badge/shieldcn-animated.svg?variant=branded&logo=shieldcn&logoColor=fff&color=8b5cf6&animate=shimmer",
  },
]

export function AnimatedShowcase() {
  const [mounted, setMounted] = useState(false)
  const { adaptUrl } = useBadgeMode()

  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          <Sparkles className="size-3.5 text-primary" />
          Animated badges
        </h2>
        <a
          href="/docs/api-reference#animate"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          docs →
        </a>
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          {ANIMATED_BADGES.map((item) => (
            <div key={item.badgePath} className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 items-center">
                {mounted ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adaptUrl(item.badgePath)}
                    alt={`${item.title} (${item.mode} animation)`}
                    className="inline-block h-8 max-w-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-8" />
                )}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                animate={item.mode}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Add <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">?animate=pulse</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">glow</code>, or{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">shimmer</code> to any SVG
          badge. Pure CSS, no JavaScript — and it automatically goes static for visitors with{" "}
          <span className="whitespace-nowrap">reduced-motion</span> enabled.
        </p>
      </div>
    </div>
  )
}
