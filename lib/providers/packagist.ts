/**
 * shieldcn
 * lib/providers/packagist
 *
 * Packagist (PHP/Composer) API client.
 * Supports: version, downloads (total/monthly/daily), license.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

async function packagistFetch(vendor: string, pkg: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(
      `https://packagist.org/packages/${vendor}/${pkg}.json`,
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

export async function getPackagistVersion(vendor: string, pkg: string): Promise<BadgeData | null> {
  const data = await packagistFetch(vendor, pkg)
  if (!data) return null

  const p = data.package as Record<string, unknown> | undefined
  if (!p) return null

  // Get versions, filter out dev, get latest
  const versions = p.versions as Record<string, Record<string, unknown>> | undefined
  if (!versions) return null

  const stable = Object.keys(versions)
    .filter(v => !v.includes("dev") && !v.includes("alpha") && !v.includes("beta") && !v.includes("RC"))
    .sort()
    .pop()

  return {
    label: "packagist",
    value: stable || "dev",
    link: `https://packagist.org/packages/${vendor}/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getPackagistDownloads(vendor: string, pkg: string, period: string = "total"): Promise<BadgeData | null> {
  const data = await packagistFetch(vendor, pkg)
  if (!data) return null

  const p = data.package as Record<string, unknown> | undefined
  const downloads = p?.downloads as Record<string, number> | undefined
  if (!downloads) return null

  let count: number
  let suffix: string

  switch (period) {
    case "daily":
      count = downloads.daily ?? 0
      suffix = "/day"
      break
    case "monthly":
      count = downloads.monthly ?? 0
      suffix = "/month"
      break
    default:
      count = downloads.total ?? 0
      suffix = ""
      break
  }

  return {
    label: "downloads",
    value: `${formatCount(count)}${suffix}`,
    link: `https://packagist.org/packages/${vendor}/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getPackagistLicense(vendor: string, pkg: string): Promise<BadgeData | null> {
  const data = await packagistFetch(vendor, pkg)
  if (!data) return null

  const p = data.package as Record<string, unknown> | undefined
  const versions = p?.versions as Record<string, Record<string, unknown>> | undefined
  if (!versions) return null

  // Get license from latest version
  const latest = Object.values(versions)[0]
  const license = (latest?.license as string[])?.join(", ") || "unknown"

  return {
    label: "license",
    value: license,
    link: `https://packagist.org/packages/${vendor}/${pkg}`,
  }
}
