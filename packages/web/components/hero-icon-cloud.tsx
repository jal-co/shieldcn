// shieldcn — components/hero-icon-cloud.tsx
// Badge icon cloud for the hero section
// Renders actual shieldcn badge SVGs in a 3D cloud

"use client"

import { useState, useEffect, useMemo } from "react"
import { IconCloud } from "@/components/icon-cloud"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { allBadgePaths } from "@/lib/showcase-data"

/** Max badges in the cloud — enough to look full, few enough to stay readable */
const CLOUD_SIZE = 58

/**
 * Fisher-Yates shuffle + slice — random subset on each mount.
 */
function selectBadges(paths: string[], count: number): string[] {
  const shuffled = [...paths]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

export function HeroIconCloud() {
  const [mounted, setMounted] = useState(false)
  const { adaptUrl } = useBadgeMode()

  useEffect(() => {
    setMounted(true)
  }, [])

  const badgeUrls = useMemo(
    () => selectBadges(allBadgePaths, CLOUD_SIZE).map(adaptUrl),
    [adaptUrl],
  )

  if (!mounted) {
    return <div className="h-[500px] w-full" />
  }

  return (
    <div className="flex items-center justify-center" style={{ isolation: "isolate" }}>
      <IconCloud images={badgeUrls} radius={280} />
    </div>
  )
}
