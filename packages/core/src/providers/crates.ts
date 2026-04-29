/**
 * shieldcn
 * lib/providers/crates
 *
 * Crates.io (Rust) API client.
 * Supports: version, downloads (total/recent), license.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function cratesFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "crates",
    cacheKey: key,
    url,
    ttl: 3600,
    headers: { "User-Agent": "shieldcn/1.0 (https://shieldcn.dev)" },
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getCratesVersion(crate: string): Promise<BadgeData | null> {
  const data = await cratesFetch(`https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`, `v:${crate}`)
  if (!data) return null
  const c = data.crate as Record<string, unknown> | undefined
  if (!c || typeof c.max_version !== "string") return null

  return {
    label: "crates.io",
    value: `v${c.max_version}`,
    link: `https://crates.io/crates/${crate}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getCratesDownloads(crate: string, period: string = "total"): Promise<BadgeData | null> {
  const data = await cratesFetch(`https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`, `dl:${crate}:${period}`)
  if (!data) return null
  const c = data.crate as Record<string, unknown> | undefined
  if (!c) return null

  let downloads: number
  let suffix: string

  if (period === "recent") {
    downloads = (c.recent_downloads as number) ?? 0
    suffix = " recent"
  } else {
    downloads = (c.downloads as number) ?? 0
    suffix = ""
  }

  return {
    label: "downloads",
    value: `${formatCount(downloads)}${suffix}`,
    link: `https://crates.io/crates/${crate}`,
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getCratesLicense(crate: string): Promise<BadgeData | null> {
  const data = await cratesFetch(`https://crates.io/api/v1/crates/${encodeURIComponent(crate)}`, `license:${crate}`)
  if (!data) return null

  // License is on the latest version
  const versions = data.versions as Array<Record<string, unknown>> | undefined
  const latest = versions?.[0]
  const license = typeof latest?.license === "string" ? latest.license : "unknown"

  return {
    label: "license",
    value: license,
    link: `https://crates.io/crates/${crate}`,
  }
}
