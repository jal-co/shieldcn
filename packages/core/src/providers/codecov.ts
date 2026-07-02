/**
 * shieldcn
 * lib/providers/codecov
 *
 * Codecov API client for code coverage badges.
 * Supports: coverage percentage.
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"
import { coveragePctAndColor } from "./coverage-color"

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
    url: `https://codecov.io/api/v2/${encodeURIComponent(service)}/${encodeURIComponent(owner)}/repos/${encodeURIComponent(repo)}${branchParam}`,
    ttl: 3600,
  })
  if (!data) return null

  const totals = data.totals as Record<string, unknown> | undefined
  const coverage = totals?.coverage as number | undefined
  if (coverage === undefined || coverage === null) return null

  const { pct, color } = coveragePctAndColor(coverage)

  return {
    label: "coverage",
    value: `${pct}%`,
    color,
    link: `https://codecov.io/${encodeURIComponent(service)}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  }
}
