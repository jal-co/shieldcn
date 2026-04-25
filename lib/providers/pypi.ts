/**
 * shieldcn
 * lib/providers/pypi
 *
 * PyPI (Python Package Index) API client.
 * Supports: version, downloads (daily/weekly/monthly), license, python version.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

async function pypiFetch(url: string): Promise<Record<string, unknown> | null> {
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

export async function getPyPIVersion(pkg: string): Promise<BadgeData | null> {
  const data = await pypiFetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`)
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
    const r = await fetch(
      `https://pypistats.org/api/packages/${pkg.toLowerCase()}/recent`,
      {
        headers: { "User-Agent": "shieldcn/1.0 (badge service; https://shieldcn.com)" },
        next: { revalidate: 3600 },
      }
    )
    if (!r.ok) return null
    const data = await r.json()
    if (!data || !data.data) return null
    const d = data.data as Record<string, number>

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
  const data = await pypiFetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`)
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
  const data = await pypiFetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`)
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
