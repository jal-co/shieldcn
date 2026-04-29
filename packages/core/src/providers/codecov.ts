/**
 * shieldcn
 * lib/providers/codecov
 *
 * Codecov API client for code coverage badges.
 * Supports: coverage percentage.
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export async function getCodecovCoverage(
  service: string, // "github", "gitlab", "bitbucket"
  owner: string,
  repo: string,
  branch?: string
): Promise<BadgeData | null> {
  const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : ""
  const data = await providerFetch<Record<string, unknown>>({
    provider: "codecov",
    cacheKey: `cov:${service}:${owner}:${repo}:${branch ?? "default"}`,
    url: `https://codecov.io/api/v2/${service}/${owner}/repos/${repo}${branchParam}`,
    ttl: 3600,
  })
  if (!data) return null

  const totals = data.totals as Record<string, unknown> | undefined
  const coverage = totals?.coverage as number | undefined
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
}
