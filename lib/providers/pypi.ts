/**
 * shieldcn
 * lib/providers/pypi
 *
 * PyPI (Python Package Index) API client.
 * Supports: version, downloads (daily/weekly/monthly), license, python version.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

async function pypiFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  return providerFetch({ provider: "pypi", cacheKey: key, url, ttl: 3600 })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getPyPIVersion(pkg: string): Promise<BadgeData | null> {
  const data = await pypiFetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, `v:${pkg}`)
  if (!data) return null
  const info = data.info as Record<string, unknown> | undefined
  if (!info || typeof info.version !== "string") return null

  return {
    label: "pypi",
    value: `v${info.version}`,
    link: `https://pypi.org/project/${pkg}/`,
  }
}

// ---------------------------------------------------------------------------
// Downloads (via pypistats.org API with User-Agent)
// ---------------------------------------------------------------------------

export async function getPyPIDownloads(pkg: string, period: string = "month"): Promise<BadgeData | null> {
  try {
    const data = await providerFetch({
      provider: "pypi",
      cacheKey: `dl:${pkg}:${period}`,
      url: `https://pypistats.org/api/packages/${pkg.toLowerCase()}/recent`,
      ttl: 3600,
      headers: { "User-Agent": "shieldcn/1.0 (badge service; https://shieldcn.dev)" },
    })
    if (!data || !(data as Record<string, unknown>).data) return null
    const d = (data as Record<string, unknown>).data as Record<string, number>

    let downloads: number
    let suffix: string

    switch (period) {
      case "day":
        downloads = d.last_day ?? 0
        suffix = "/day"
        break
      case "week":
        downloads = d.last_week ?? 0
        suffix = "/week"
        break
      case "month":
      default:
        downloads = d.last_month ?? 0
        suffix = "/month"
        break
    }

    return {
      label: "downloads",
      value: `${formatCount(downloads)}${suffix}`,
      link: `https://pypi.org/project/${pkg}/`,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getPyPILicense(pkg: string): Promise<BadgeData | null> {
  const data = await pypiFetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, `license:${pkg}`)
  if (!data) return null
  const info = data.info as Record<string, unknown> | undefined
  if (!info) return null

  const license = typeof info.license === "string" && info.license
    ? info.license
    : "unknown"

  return {
    label: "license",
    value: license,
    link: `https://pypi.org/project/${pkg}/`,
  }
}

// ---------------------------------------------------------------------------
// Python version
// ---------------------------------------------------------------------------

export async function getPyPIPythonVersion(pkg: string): Promise<BadgeData | null> {
  const data = await pypiFetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, `python:${pkg}`)
  if (!data) return null
  const info = data.info as Record<string, unknown> | undefined
  if (!info) return null

  const requires = info.requires_python as string | undefined
  return {
    label: "python",
    value: requires || "any",
    link: `https://pypi.org/project/${pkg}/`,
  }
}
