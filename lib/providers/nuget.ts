/**
 * shieldcn
 * lib/providers/nuget
 *
 * NuGet (.NET) API client.
 * Supports: version, downloads.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

async function nugetFetch(pkg: string): Promise<Record<string, unknown> | null> {
  try {
    // Use the registration endpoint for package metadata
    const r = await fetch(
      `https://api.nuget.org/v3/registration5-gz-semver2/${pkg.toLowerCase()}/index.json`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
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
    try {
      const r = await fetch(lastPage["@id"] as string, { next: { revalidate: 3600 } })
      if (r.ok) {
        const page = await r.json()
        pageItems = page.items as Array<Record<string, unknown>> | undefined
      }
    } catch { /* ignore */ }
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
  try {
    // Use the search endpoint which has download counts
    const r = await fetch(
      `https://api-v2v3search-0.nuget.org/query?q=packageid:${encodeURIComponent(pkg)}&take=1`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    const data = await r.json()

    const results = data.data as Array<Record<string, unknown>> | undefined
    if (!results || results.length === 0) return null

    const count = (results[0].totalDownloads as number) ?? 0
    return {
      label: "downloads",
      value: formatCount(count),
      link: `https://www.nuget.org/packages/${pkg}`,
    }
  } catch {
    return null
  }
}
