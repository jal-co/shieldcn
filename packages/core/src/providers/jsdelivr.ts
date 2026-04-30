/**
 * @shieldcn/core
 * src/providers/jsdelivr
 *
 * jsDelivr CDN stats API client.
 * Supports: hits/month, hits/year, rank.
 *
 * Uses the public jsDelivr Data API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Hits per period (npm packages)
// ---------------------------------------------------------------------------

export async function getJsDelivrHits(
  pkg: string,
  period: string = "month",
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "jsdelivr",
    cacheKey: `hits:npm:${pkg}:${period}`,
    url: `https://data.jsdelivr.com/v1/packages/npm/${encodeURIComponent(pkg)}/stats/date/${period}`,
    ttl: 3600,
  })
  if (!data) return null

  const total = data.total as number | undefined
  if (total === undefined) return null

  const suffix = period === "year" ? "/year" : "/month"

  return {
    label: "jsDelivr",
    value: `${formatCount(total)}${suffix}`,
    link: `https://www.jsdelivr.com/package/npm/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Hits for GitHub repos
// ---------------------------------------------------------------------------

export async function getJsDelivrGHHits(
  owner: string,
  repo: string,
  period: string = "month",
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "jsdelivr",
    cacheKey: `hits:gh:${owner}/${repo}:${period}`,
    url: `https://data.jsdelivr.com/v1/packages/gh/${owner}/${repo}/stats/date/${period}`,
    ttl: 3600,
  })
  if (!data) return null

  const total = data.total as number | undefined
  if (total === undefined) return null

  const suffix = period === "year" ? "/year" : "/month"

  return {
    label: "jsDelivr",
    value: `${formatCount(total)}${suffix}`,
    link: `https://www.jsdelivr.com/package/gh/${owner}/${repo}`,
  }
}

// ---------------------------------------------------------------------------
// Rank
// ---------------------------------------------------------------------------

export async function getJsDelivrRank(pkg: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "jsdelivr",
    cacheKey: `rank:npm:${pkg}`,
    url: `https://data.jsdelivr.com/v1/packages/npm/${encodeURIComponent(pkg)}`,
    ttl: 3600,
  })
  if (!data) return null

  const rank = (data as Record<string, unknown>).rank as number | undefined

  // rank may not be available for all packages
  return {
    label: "jsDelivr rank",
    value: rank !== undefined ? `#${rank}` : "unranked",
    link: `https://www.jsdelivr.com/package/npm/${pkg}`,
  }
}
