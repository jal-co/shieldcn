/**
 * @shieldcn/core
 * src/providers/amo
 *
 * Mozilla Add-ons (AMO) API client.
 * Supports: version, users, rating, downloads.
 *
 * Uses the public AMO v5 API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function amoFetch(slug: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "amo",
    cacheKey: `addon:${slug}`,
    url: `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(slug)}/`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getAMOVersion(slug: string): Promise<BadgeData | null> {
  const data = await amoFetch(slug)
  if (!data) return null

  const currentVersion = data.current_version as Record<string, unknown> | undefined
  const version = currentVersion?.version as string | undefined
  if (!version) return null

  return {
    label: "mozilla add-on",
    value: `v${version}`,
    link: `https://addons.mozilla.org/firefox/addon/${slug}/`,
  }
}

// ---------------------------------------------------------------------------
// Users (daily active users)
// ---------------------------------------------------------------------------

export async function getAMOUsers(slug: string): Promise<BadgeData | null> {
  const data = await amoFetch(slug)
  if (!data) return null

  const users = data.average_daily_users as number | undefined
  if (users === undefined) return null

  return {
    label: "users",
    value: formatCount(users),
    link: `https://addons.mozilla.org/firefox/addon/${slug}/`,
  }
}

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------

export async function getAMORating(slug: string): Promise<BadgeData | null> {
  const data = await amoFetch(slug)
  if (!data) return null

  const ratings = data.ratings as Record<string, unknown> | undefined
  const average = ratings?.average as number | undefined
  const count = ratings?.count as number | undefined

  if (average === undefined) return null

  const value = count !== undefined
    ? `${average.toFixed(1)}/5 (${formatCount(count)})`
    : `${average.toFixed(1)}/5`

  return {
    label: "rating",
    value,
    link: `https://addons.mozilla.org/firefox/addon/${slug}/`,
  }
}

// ---------------------------------------------------------------------------
// Downloads (weekly)
// ---------------------------------------------------------------------------

export async function getAMODownloads(slug: string): Promise<BadgeData | null> {
  const data = await amoFetch(slug)
  if (!data) return null

  const weeklyDownloads = data.weekly_downloads as number | undefined
  if (weeklyDownloads === undefined) return null

  return {
    label: "downloads",
    value: `${formatCount(weeklyDownloads)}/week`,
    link: `https://addons.mozilla.org/firefox/addon/${slug}/`,
  }
}
