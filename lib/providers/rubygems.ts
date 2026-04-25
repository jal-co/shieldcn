/**
 * shieldcn
 * lib/providers/rubygems
 *
 * RubyGems API client.
 * Supports: version, downloads, license, platform.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

async function gemFetch(gem: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "rubygems",
    cacheKey: `gem:${gem}`,
    url: `https://rubygems.org/api/v1/gems/${encodeURIComponent(gem)}.json`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getRubyGemsVersion(gem: string): Promise<BadgeData | null> {
  const data = await gemFetch(gem)
  if (!data || typeof data.version !== "string") return null

  return {
    label: "gem",
    value: `v${data.version}`,
    link: `https://rubygems.org/gems/${gem}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getRubyGemsDownloads(gem: string, period: string = "total"): Promise<BadgeData | null> {
  const data = await gemFetch(gem)
  if (!data) return null

  let count: number
  let suffix: string

  if (period === "version") {
    count = (data.version_downloads as number) ?? 0
    suffix = " this version"
  } else {
    count = (data.downloads as number) ?? 0
    suffix = ""
  }

  return {
    label: "downloads",
    value: `${formatCount(count)}${suffix}`,
    link: `https://rubygems.org/gems/${gem}`,
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getRubyGemsLicense(gem: string): Promise<BadgeData | null> {
  const data = await gemFetch(gem)
  if (!data) return null

  const licenses = data.licenses as string[] | undefined
  const license = licenses?.join(", ") || "unknown"

  return {
    label: "license",
    value: license,
    link: `https://rubygems.org/gems/${gem}`,
  }
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export async function getRubyGemsPlatform(gem: string): Promise<BadgeData | null> {
  const data = await gemFetch(gem)
  if (!data) return null

  return {
    label: "platform",
    value: (data.platform as string) || "ruby",
    link: `https://rubygems.org/gems/${gem}`,
  }
}
