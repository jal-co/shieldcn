/**
 * @shieldcn/core
 * src/providers/openvsx
 *
 * Open VSX Registry API client.
 * Supports: version, downloads, rating.
 *
 * Uses the public Open VSX API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function openvsxFetch(namespace: string, extension: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "openvsx",
    cacheKey: `ext:${namespace}:${extension}`,
    url: `https://open-vsx.org/api/${encodeURIComponent(namespace)}/${encodeURIComponent(extension)}`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getOpenVSXVersion(namespace: string, extension: string): Promise<BadgeData | null> {
  const data = await openvsxFetch(namespace, extension)
  if (!data) return null

  const version = data.version as string | undefined

  return {
    label: "open vsx",
    value: version ? `v${version}` : "unknown",
    link: `https://open-vsx.org/extension/${namespace}/${extension}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getOpenVSXDownloads(namespace: string, extension: string): Promise<BadgeData | null> {
  const data = await openvsxFetch(namespace, extension)
  if (!data) return null

  const downloads = data.downloadCount as number | undefined
  if (downloads === undefined) return null

  return {
    label: "downloads",
    value: formatCount(downloads),
    link: `https://open-vsx.org/extension/${namespace}/${extension}`,
  }
}

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------

export async function getOpenVSXRating(namespace: string, extension: string): Promise<BadgeData | null> {
  const data = await openvsxFetch(namespace, extension)
  if (!data) return null

  const averageRating = data.averageRating as number | undefined
  const reviewCount = data.reviewCount as number | undefined

  if (averageRating === undefined) return null

  const value = reviewCount !== undefined
    ? `${averageRating.toFixed(1)}/5 (${formatCount(reviewCount)})`
    : `${averageRating.toFixed(1)}/5`

  return {
    label: "rating",
    value,
    link: `https://open-vsx.org/extension/${namespace}/${extension}/reviews`,
  }
}
