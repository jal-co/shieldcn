// shieldcn — app/dev/badge-grid/page.tsx
// Full-page badge grid for OG image / social image screenshots

import { allBadgePaths } from "@/lib/showcase-data"

export default function BadgeGridPage() {
  // Use all showcase badges
  const badges = allBadgePaths

  return (
    <div
      className="min-h-screen bg-background p-8"
      style={{ width: 1200, minHeight: 630 }}
    >
      {/* Dense grid — badges wrap and tile */}
      <div className="flex flex-wrap gap-2">
        {badges.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={`${src}${src.includes("?") ? "&" : "?"}mode=dark`}
            alt=""
            className="h-7 shrink-0"
            loading="eager"
            draggable={false}
          />
        ))}
        {/* Repeat for density */}
        {badges.slice(0, 80).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`r-${i}`}
            src={`${src}${src.includes("?") ? "&" : "?"}mode=dark`}
            alt=""
            className="h-7 shrink-0"
            loading="eager"
            draggable={false}
          />
        ))}
      </div>
    </div>
  )
}
