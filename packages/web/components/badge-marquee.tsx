"use client"

/**
 * Rows of real badge images scrolling behind the hero.
 * Uses pure CSS animations for smooth 60fps rendering.
 * Pulls badge paths from the showcase data so it auto-updates.
 *
 * Each row is a single flex container with badges duplicated inside it.
 * The container translates from 0 to -50% (half its width = one set of badges),
 * creating a seamless infinite loop.
 */

import { useMemo, useState, useEffect } from "react"
import { allBadgePaths } from "@/lib/showcase-data"
import { useBadgeMode } from "@/lib/use-badge-mode"

const ROW_COUNT = 6
const BADGES_PER_ROW = 12
const ROW_DURATIONS = ["80s", "75s", "85s", "78s", "90s", "82s"]

function MarqueeRow({ badges, reverse, duration }: { badges: string[]; reverse: boolean; duration: string }) {
  const direction = reverse ? "marquee-right" : "marquee-left"

  return (
    <div className="overflow-hidden">
      <div
        className="flex w-max gap-3"
        style={{ animation: `${direction} ${duration} linear infinite` }}
      >
        {/* Original set */}
        {badges.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`a-${i}`} src={src} alt="" className="h-7 shrink-0 select-none" loading="lazy" draggable={false} />
        ))}
        {/* Duplicate set for seamless loop */}
        {badges.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`b-${i}`} src={src} alt="" className="h-7 shrink-0 select-none" loading="lazy" draggable={false} />
        ))}
      </div>
    </div>
  )
}

export function BadgeMarquee() {
  const [mounted, setMounted] = useState(false)
  const { adaptUrl } = useBadgeMode()

  useEffect(() => { setMounted(true) }, [])

  const rows = useMemo(() => {
    // Shuffle deterministically and split into rows
    const shuffled = [...allBadgePaths].sort((a, b) => {
      // Simple hash-based sort for consistent order
      const ha = Array.from(a).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      const hb = Array.from(b).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      return ha - hb
    })

    const result: string[][] = []
    for (let i = 0; i < ROW_COUNT; i++) {
      const start = i * BADGES_PER_ROW
      const row = shuffled.slice(start, start + BADGES_PER_ROW)
      // If we run out, wrap around
      while (row.length < BADGES_PER_ROW && shuffled.length > 0) {
        row.push(shuffled[row.length % shuffled.length])
      }
      result.push(row)
    }
    return result
  }, [])

  return (
    <>
      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ left: "calc(-50vw + 50%)", width: "100vw" }}
      >
        <div className="flex h-full flex-col justify-center gap-3 overflow-hidden opacity-[0.2] py-6">
          {mounted && rows.map((badges, i) => (
            <MarqueeRow
              key={i}
              badges={badges.map(adaptUrl)}
              reverse={i % 2 === 1}
              duration={ROW_DURATIONS[i]}
            />
          ))}
        </div>
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, transparent 16%, var(--background) 62%)" }}
        />
      </div>
    </>
  )
}
