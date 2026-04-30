/**
 * @shieldcn/core
 * src/providers/modrinth
 *
 * Modrinth API client.
 * Supports: downloads, followers, game versions, version.
 *
 * Uses the public Modrinth v2 API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function modrinthFetch(slug: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "modrinth",
    cacheKey: `project:${slug}`,
    url: `https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}`,
    ttl: 3600,
    headers: { "User-Agent": "shieldcn/1.0 (badge service; https://shieldcn.dev)" },
  })
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getModrinthDownloads(slug: string): Promise<BadgeData | null> {
  const data = await modrinthFetch(slug)
  if (!data) return null

  const downloads = data.downloads as number | undefined
  if (downloads === undefined) return null

  return {
    label: "downloads",
    value: formatCount(downloads),
    link: `https://modrinth.com/mod/${slug}`,
  }
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export async function getModrinthFollowers(slug: string): Promise<BadgeData | null> {
  const data = await modrinthFetch(slug)
  if (!data) return null

  const followers = data.followers as number | undefined
  if (followers === undefined) return null

  return {
    label: "followers",
    value: formatCount(followers),
    link: `https://modrinth.com/mod/${slug}`,
  }
}

// ---------------------------------------------------------------------------
// Version (latest)
// ---------------------------------------------------------------------------

export async function getModrinthVersion(slug: string): Promise<BadgeData | null> {
  const data = await providerFetch<unknown[]>({
    provider: "modrinth",
    cacheKey: `versions:${slug}`,
    url: `https://api.modrinth.com/v2/project/${encodeURIComponent(slug)}/version?limit=1`,
    ttl: 3600,
    headers: { "User-Agent": "shieldcn/1.0 (badge service; https://shieldcn.dev)" },
  })
  if (!data || !Array.isArray(data) || data.length === 0) return null

  const version = (data[0] as Record<string, unknown>).version_number as string | undefined

  return {
    label: "modrinth",
    value: version ? `v${version}` : "unknown",
    link: `https://modrinth.com/mod/${slug}/versions`,
  }
}

// ---------------------------------------------------------------------------
// Game Versions
// ---------------------------------------------------------------------------

export async function getModrinthGameVersions(slug: string): Promise<BadgeData | null> {
  const data = await modrinthFetch(slug)
  if (!data) return null

  const versions = data.game_versions as string[] | undefined
  if (!versions || versions.length === 0) return null

  // Show first and last version range
  const first = versions[0]
  const last = versions[versions.length - 1]
  const value = first === last ? first : `${first}–${last}`

  return {
    label: "game versions",
    value,
    link: `https://modrinth.com/mod/${slug}/versions`,
  }
}
