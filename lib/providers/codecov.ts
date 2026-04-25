/**
 * shieldcn
 * lib/providers/codecov
 *
 * Codecov API client for code coverage badges.
 * Supports: coverage percentage.
 */

import type { BadgeData } from "@/lib/badges/types"

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export async function getCodecovCoverage(
  service: string, // "github", "gitlab", "bitbucket"
  owner: string,
  repo: string,
  branch?: string
): Promise<BadgeData | null> {
  try {
    const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : ""
    const r = await fetch(
      `https://codecov.io/api/v2/${service}/${owner}/repos/${repo}${branchParam}`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    const data = await r.json()

    const coverage = data?.totals?.coverage as number | undefined
    if (coverage === undefined || coverage === null) return null

    const pct = Math.round(coverage * 100) / 100
    let color: string | undefined
    if (pct >= 90) color = "green"
    else if (pct >= 75) color = "yellow"
    else if (pct >= 50) color = "amber"
    else color = "red"

    return {
      label: "coverage",
      value: `${pct}%`,
      color,
      link: `https://codecov.io/${service}/${owner}/${repo}`,
    }
  } catch {
    return null
  }
}
