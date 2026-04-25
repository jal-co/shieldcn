/**
 * shieldcn
 * lib/providers/pub
 *
 * Pub.dev (Dart/Flutter) API client.
 * Supports: version, likes, points, popularity.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

async function pubFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  return providerFetch({ provider: "pub", cacheKey: key, url, ttl: 3600 })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getPubVersion(pkg: string): Promise<BadgeData | null> {
  const data = await pubFetch(`https://pub.dev/api/packages/${encodeURIComponent(pkg)}`, `v:${pkg}`)
  if (!data) return null

  const latest = data.latest as Record<string, unknown> | undefined
  const version = latest?.version as string | undefined

  return {
    label: "pub",
    value: version ? `v${version}` : "unknown",
    link: `https://pub.dev/packages/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export async function getPubLikes(pkg: string): Promise<BadgeData | null> {
  const data = await pubFetch(`https://pub.dev/api/packages/${encodeURIComponent(pkg)}/metrics`, `likes:${pkg}`)
  if (!data) return null

  const score = data.score as Record<string, unknown> | undefined
  const likes = (score?.likeCount as number) ?? 0

  return {
    label: "likes",
    value: formatCount(likes),
    link: `https://pub.dev/packages/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Points (pub points)
// ---------------------------------------------------------------------------

export async function getPubPoints(pkg: string): Promise<BadgeData | null> {
  const data = await pubFetch(`https://pub.dev/api/packages/${encodeURIComponent(pkg)}/metrics`, `points:${pkg}`)
  if (!data) return null

  const score = data.score as Record<string, unknown> | undefined
  const points = (score?.grantedPoints as number) ?? 0
  const max = (score?.maxPoints as number) ?? 160

  return {
    label: "pub points",
    value: `${points}/${max}`,
    link: `https://pub.dev/packages/${pkg}/score`,
  }
}

// ---------------------------------------------------------------------------
// Popularity
// ---------------------------------------------------------------------------

export async function getPubPopularity(pkg: string): Promise<BadgeData | null> {
  const data = await pubFetch(`https://pub.dev/api/packages/${encodeURIComponent(pkg)}/metrics`, `popularity:${pkg}`)
  if (!data) return null

  const score = data.score as Record<string, unknown> | undefined
  const popularity = (score?.popularityScore as number) ?? 0

  return {
    label: "popularity",
    value: `${Math.round(popularity * 100)}%`,
    link: `https://pub.dev/packages/${pkg}`,
  }
}
