// shieldcn — app/dev/badge-rows/page.tsx
// Horizontal scrolling rows of badges for OG backgrounds
// Alternating directions like the marquee hero

import { allBadgePaths } from "@/lib/showcase-data"

function shuffleWithSeed(arr: string[], seed: number): string[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1)) % (i + 1) + i + 1) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const ROW_COUNT = 9
const BADGES_PER_ROW = 24

export default function BadgeRowsPage() {
  const rows: string[][] = []
  for (let i = 0; i < ROW_COUNT; i++) {
    const shuffled = shuffleWithSeed(allBadgePaths, i * 7 + 3)
    rows.push(shuffled.slice(0, BADGES_PER_ROW))
  }

  return (
    <div
      className="overflow-hidden bg-black"
      style={{ width: 1200, height: 630 }}
    >
      <div className="flex h-full flex-col justify-center gap-2.5 py-4">
        {rows.map((badges, i) => (
          <div
            key={i}
            className="flex gap-2.5"
            style={{
              transform: `translateX(${i % 2 === 0 ? -40 : -80}px)`,
            }}
          >
            {badges.map((src, j) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={j}
                src={`${src}${src.includes("?") ? "&" : "?"}mode=dark`}
                alt=""
                className="h-7 shrink-0"
                loading="eager"
                draggable={false}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
