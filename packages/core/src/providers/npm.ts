/**
 * shieldcn
 * lib/providers/npm
 *
 * npm registry + downloads API client.
 * Supports: version, downloads (weekly/monthly/yearly/total),
 *           license, node version, types, dependents.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function npmFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  return providerFetch({ provider: "npm", cacheKey: key, url, ttl: 3600 })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getNpmVersion(pkg: string, tag?: string): Promise<BadgeData | null> {
  const encoded = encodeURIComponent(pkg)
  const dist = tag || "latest"
  const data = await npmFetch(`https://registry.npmjs.org/${encoded}/${dist}`, `v:${pkg}:${dist}`)
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
  const data = await npmFetch(`https://api.npmjs.org/downloads/point/${period}/${encoded}`, `dl:${pkg}:${period}`)
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
// Downloads time series (for charts)
// ---------------------------------------------------------------------------

/** A weekly downloads bucket. */
export interface DownloadPoint {
  date: string
  value: number
}

/** Resolved npm downloads time series. */
export interface NpmDownloadSeries {
  pkg: string
  total: number
  points: DownloadPoint[]
}

/** Format a Date as YYYY-MM-DD (UTC). */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Daily downloads over the last `days`, aggregated into weekly buckets so the
 * chart stays readable. Uses the npm downloads/range API.
 */
export async function getNpmDownloadSeries(
  pkg: string,
  days: number = 365,
): Promise<NpmDownloadSeries | null> {
  const end = new Date()
  const start = new Date(end.getTime() - days * 86400000)
  const range = `${ymd(start)}:${ymd(end)}`
  const encoded = encodeURIComponent(pkg)
  const data = await npmFetch(
    `https://api.npmjs.org/downloads/range/${range}/${encoded}`,
    `dlseries:${pkg}:${range}`,
  )
  const daily = data?.downloads as Array<{ day?: string; downloads?: number }> | undefined
  if (!Array.isArray(daily) || daily.length === 0) return null

  // Aggregate consecutive days into weekly buckets.
  const points: DownloadPoint[] = []
  let total = 0
  let bucketStart: string | null = null
  let bucketSum = 0
  let count = 0
  for (const d of daily) {
    if (typeof d.downloads !== "number" || typeof d.day !== "string") continue
    if (bucketStart === null) bucketStart = d.day
    bucketSum += d.downloads
    total += d.downloads
    count++
    if (count === 7) {
      points.push({ date: bucketStart, value: bucketSum })
      bucketStart = null
      bucketSum = 0
      count = 0
    }
  }
  // Drop the trailing partial week (the current, incomplete week sums only a
  // day or two and would plunge the curve to ~0 at the right edge). Keep it
  // only if it's the sole bucket, so short ranges still render something.
  if (bucketStart !== null && count > 0 && points.length === 0) {
    points.push({ date: bucketStart, value: bucketSum })
  }
  if (points.length === 0) return null
  return { pkg, total, points }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getNpmLicense(pkg: string): Promise<BadgeData | null> {
  const data = await npmFetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`, `license:${pkg}`)
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
  const data = await npmFetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`, `node:${pkg}`)
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
  const data = await npmFetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`, `types:${pkg}`)
  if (!data) return null

  // Check for TypeScript types
  if (data.types || data.typings) {
    return { label: "types", value: "TypeScript", color: "blue", link: `https://www.npmjs.com/package/${pkg}` }
  }

  // Check if @types/ package exists
  const typesData = await npmFetch(`https://registry.npmjs.org/@types/${encodeURIComponent(pkg)}/latest`, `types:@types/${pkg}`)
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
    `https://registry.npmjs.org/-/v1/search?text=dependencies:${encodeURIComponent(pkg)}&size=1`, `dependents:${pkg}`
  )
  if (!data || typeof data.total !== "number") return null

  return {
    label: "dependents",
    value: formatCount(data.total as number),
    link: `https://www.npmjs.com/browse/depended/${pkg}`,
  }
}
