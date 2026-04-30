/**
 * @shieldcn/core
 * src/providers/chocolatey
 *
 * Chocolatey package manager API client.
 * Supports: version, downloads.
 *
 * Uses the Chocolatey Community API (OData v2, no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetchText } from "../provider-fetch"

function extractXmlValue(xml: string, tag: string): string | undefined {
  const regex = new RegExp(`<d:${tag}[^>]*>([^<]+)</d:${tag}>`, "i")
  const match = xml.match(regex)
  return match?.[1]
}

async function chocoFetch(pkg: string): Promise<string | null> {
  return providerFetchText({
    provider: "chocolatey",
    cacheKey: `pkg:${pkg}`,
    url: `https://community.chocolatey.org/api/v2/Packages()?$filter=Id%20eq%20%27${encodeURIComponent(pkg)}%27%20and%20IsLatestVersion&$top=1`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getChocolateyVersion(pkg: string): Promise<BadgeData | null> {
  const xml = await chocoFetch(pkg)
  if (!xml) return null

  const version = extractXmlValue(xml, "Version")
  if (!version) return null

  return {
    label: "chocolatey",
    value: `v${version}`,
    link: `https://community.chocolatey.org/packages/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getChocolateyDownloads(pkg: string): Promise<BadgeData | null> {
  const xml = await chocoFetch(pkg)
  if (!xml) return null

  const downloads = extractXmlValue(xml, "DownloadCount")
  if (!downloads) return null

  return {
    label: "downloads",
    value: formatCount(parseInt(downloads)),
    link: `https://community.chocolatey.org/packages/${pkg}`,
  }
}
