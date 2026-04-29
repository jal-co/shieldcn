/**
 * shieldcn
 * lib/providers/nuget
 *
 * NuGet (.NET) API client.
 * Supports: version, downloads.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function nugetFetch(pkg: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "nuget",
    cacheKey: `reg:${pkg}`,
    url: `https://api.nuget.org/v3/registration5-gz-semver2/${pkg.toLowerCase()}/index.json`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getNuGetVersion(pkg: string): Promise<BadgeData | null> {
  const data = await nugetFetch(pkg)
  if (!data) return null

  const items = data.items as Array<Record<string, unknown>> | undefined
  if (!items || items.length === 0) return null

  // Get the last page, last item for latest version
  const lastPage = items[items.length - 1]
  let pageItems = lastPage.items as Array<Record<string, unknown>> | undefined

  // If items aren't inline, fetch the page
  if (!pageItems && lastPage["@id"]) {
    const page = await providerFetch<Record<string, unknown>>({
      provider: "nuget",
      cacheKey: `page:${pkg}`,
      url: lastPage["@id"] as string,
      ttl: 3600,
    })
    if (page) {
      pageItems = page.items as Array<Record<string, unknown>> | undefined
    }
  }

  if (!pageItems || pageItems.length === 0) return null

  const latest = pageItems[pageItems.length - 1]
  const catalogEntry = latest.catalogEntry as Record<string, unknown> | undefined
  const version = catalogEntry?.version as string | undefined

  return {
    label: "nuget",
    value: version ? `v${version}` : "unknown",
    link: `https://www.nuget.org/packages/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getNuGetDownloads(pkg: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "nuget",
    cacheKey: `dl:${pkg}`,
    url: `https://api-v2v3search-0.nuget.org/query?q=packageid:${encodeURIComponent(pkg)}&take=1`,
    ttl: 3600,
  })
  if (!data) return null

  const results = data.data as Array<Record<string, unknown>> | undefined
  if (!results || results.length === 0) return null

  const count = (results[0].totalDownloads as number) ?? 0
  return {
    label: "downloads",
    value: formatCount(count),
    link: `https://www.nuget.org/packages/${pkg}`,
  }
}
