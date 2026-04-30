/**
 * @shieldcn/core
 * src/providers/chrome
 *
 * Chrome Web Store API client.
 * Supports: version, users, rating.
 *
 * Uses the Chrome Web Store Detail API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function chromeFetch(extensionId: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "chrome",
    cacheKey: `ext:${extensionId}`,
    url: `https://chrome-stats.com/api/detail?id=${encodeURIComponent(extensionId)}`,
    ttl: 3600,
    headers: { "User-Agent": "shieldcn/1.0 (badge service; https://shieldcn.dev)" },
  })
}

/**
 * Fallback: scrape the Chrome Web Store page for basic data.
 * The official API doesn't exist publicly, so we use a JSON endpoint approach.
 */
async function chromeItemFetch(extensionId: string): Promise<Record<string, unknown> | null> {
  // Use the update manifest to get version info at minimum
  return providerFetch({
    provider: "chrome",
    cacheKey: `item:${extensionId}`,
    url: `https://update.googleapis.com/service/update2/json?protocol=3.1&acceptformat=crx3&prodversion=130.0&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getChromeVersion(extensionId: string): Promise<BadgeData | null> {
  const data = await chromeItemFetch(extensionId)
  if (!data) return null

  // Parse the update response format
  const app = (data as Record<string, unknown>).app as unknown[] | undefined
  if (!app || !Array.isArray(app) || app.length === 0) return null

  const first = app[0] as Record<string, unknown>
  const updatecheck = first.updatecheck as Record<string, string> | undefined
  const version = updatecheck?.version

  if (!version) return null

  return {
    label: "chrome web store",
    value: `v${version}`,
    link: `https://chromewebstore.google.com/detail/${extensionId}`,
  }
}

// ---------------------------------------------------------------------------
// Users (from chrome-stats.com API)
// ---------------------------------------------------------------------------

export async function getChromeUsers(extensionId: string): Promise<BadgeData | null> {
  const data = await chromeFetch(extensionId)
  if (!data) return null

  const users = data.user_count as number | undefined
  if (users === undefined) return null

  return {
    label: "users",
    value: formatCount(users),
    link: `https://chromewebstore.google.com/detail/${extensionId}`,
  }
}

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------

export async function getChromeRating(extensionId: string): Promise<BadgeData | null> {
  const data = await chromeFetch(extensionId)
  if (!data) return null

  const rating = data.rating as number | undefined
  const ratingCount = data.rating_count as number | undefined

  if (rating === undefined) return null

  const value = ratingCount !== undefined
    ? `${rating.toFixed(1)}/5 (${formatCount(ratingCount)})`
    : `${rating.toFixed(1)}/5`

  return {
    label: "rating",
    value,
    link: `https://chromewebstore.google.com/detail/${extensionId}`,
  }
}
