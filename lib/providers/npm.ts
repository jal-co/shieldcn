/**
 * shieldcn
 * lib/providers/npm
 *
 * npm registry + downloads API client.
 * Supports: version, downloads (weekly/monthly/yearly/total),
 *           license, node version, types, dependents.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

async function npmFetch(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getNpmVersion(pkg: string, tag?: string): Promise<BadgeData | null> {
  const encoded = encodeURIComponent(pkg)
  const dist = tag || "latest"
  const data = await npmFetch(`https://registry.npmjs.org/${encoded}/${dist}`)
  if (!data || typeof data.version !== "string") return null

  return {
    label: "npm",
    value: `v${data.version}`,
    link: `https://www.npmjs.com/package/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

async function getDownloads(pkg: string, period: string): Promise<number | null> {
  const encoded = encodeURIComponent(pkg)
  const data = await npmFetch(`https://api.npmjs.org/downloads/point/${period}/${encoded}`)
  if (!data || typeof data.downloads !== "number") return null
  return data.downloads as number
}

export async function getNpmDownloads(pkg: string, period: string = "last-week"): Promise<BadgeData | null> {
  const downloads = await getDownloads(pkg, period)
  if (downloads === null) return null

  const suffix = period === "last-week" ? "/week"
    : period === "last-month" ? "/month"
    : period === "last-year" ? "/year"
    : ""

  return {
    label: "downloads",
    value: `${formatCount(downloads)}${suffix}`,
    link: `https://www.npmjs.com/package/${pkg}`,
  }
}

export async function getNpmTotalDownloads(pkg: string): Promise<BadgeData | null> {
  // npm API doesn't have a "total" endpoint, so we use a wide range
  const downloads = await getDownloads(pkg, "2015-01-01:2030-01-01")
  if (downloads === null) return null

  return {
    label: "downloads",
    value: formatCount(downloads),
    link: `https://www.npmjs.com/package/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getNpmLicense(pkg: string): Promise<BadgeData | null> {
  const data = await npmFetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
  if (!data) return null

  const license = typeof data.license === "string"
    ? data.license
    : typeof data.license === "object" && data.license
      ? (data.license as Record<string, string>).type
      : null

  return {
    label: "license",
    value: license || "unknown",
    link: `https://www.npmjs.com/package/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Node version
// ---------------------------------------------------------------------------

export async function getNpmNodeVersion(pkg: string): Promise<BadgeData | null> {
  const data = await npmFetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
  if (!data) return null

  const engines = data.engines as Record<string, string> | undefined
  const node = engines?.node

  return {
    label: "node",
    value: node || "any",
    link: `https://www.npmjs.com/package/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export async function getNpmTypes(pkg: string): Promise<BadgeData | null> {
  const data = await npmFetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`)
  if (!data) return null

  // Check for TypeScript types
  if (data.types || data.typings) {
    return { label: "types", value: "TypeScript", color: "blue", link: `https://www.npmjs.com/package/${pkg}` }
  }

  // Check if @types/ package exists
  const typesData = await npmFetch(`https://registry.npmjs.org/@types/${encodeURIComponent(pkg)}/latest`)
  if (typesData) {
    return { label: "types", value: "DefinitelyTyped", color: "blue", link: `https://www.npmjs.com/package/@types/${pkg}` }
  }

  return { label: "types", value: "untyped", link: `https://www.npmjs.com/package/${pkg}` }
}

// ---------------------------------------------------------------------------
// Dependents
// ---------------------------------------------------------------------------

export async function getNpmDependents(pkg: string): Promise<BadgeData | null> {
  // npm doesn't have an official dependents API, use the search API
  const data = await npmFetch(
    `https://registry.npmjs.org/-/v1/search?text=dependencies:${encodeURIComponent(pkg)}&size=1`
  )
  if (!data || typeof data.total !== "number") return null

  return {
    label: "dependents",
    value: formatCount(data.total as number),
    link: `https://www.npmjs.com/browse/depended/${pkg}`,
  }
}
