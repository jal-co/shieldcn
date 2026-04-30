/**
 * @shieldcn/core
 * src/providers/flathub
 *
 * Flathub (Flatpak) API client.
 * Supports: version, downloads.
 *
 * Uses the public Flathub API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getFlathubVersion(appId: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "flathub",
    cacheKey: `app:${appId}`,
    url: `https://flathub.org/api/v2/appstream/${encodeURIComponent(appId)}`,
    ttl: 3600,
  })
  if (!data) return null

  const releases = data.releases as Array<Record<string, string>> | undefined
  const version = releases?.[0]?.version

  return {
    label: "flathub",
    value: version ? `v${version}` : "unknown",
    link: `https://flathub.org/apps/${appId}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads (installs)
// ---------------------------------------------------------------------------

export async function getFlathubDownloads(appId: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "flathub",
    cacheKey: `stats:${appId}`,
    url: `https://flathub.org/api/v2/stats/${encodeURIComponent(appId)}`,
    ttl: 3600,
  })
  if (!data) return null

  const installs = data.installs_total as number | undefined
  if (installs === undefined) return null

  return {
    label: "installs",
    value: formatCount(installs),
    link: `https://flathub.org/apps/${appId}`,
  }
}
