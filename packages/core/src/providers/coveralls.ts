/**
 * @shieldcn/core
 * src/providers/coveralls
 *
 * Coveralls API client for code coverage badges.
 * Supports: coverage percentage.
 *
 * Uses the public Coveralls API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"
import { coveragePctAndColor } from "./coverage-color"

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export async function getCoverallsCoverage(
  service: string, // "github", "gitlab", "bitbucket"
  owner: string,
  repo: string,
  branch?: string,
): Promise<BadgeData | null> {
  const branchPath = branch ? `/branch/${encodeURIComponent(branch)}` : ""
  const data = await providerFetch<Record<string, unknown>>({
    provider: "coveralls",
    cacheKey: `cov:${service}:${owner}:${repo}:${branch ?? "default"}`,
    url: `https://coveralls.io/${encodeURIComponent(service)}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${branchPath}.json`,
    ttl: 3600,
  })
  if (!data) return null

  const coverage = data.covered_percent as number | undefined
  if (coverage === undefined || coverage === null) return null

  const { pct, color } = coveragePctAndColor(coverage)

  return {
    label: "coverage",
    value: `${pct}%`,
    color,
    link: `https://coveralls.io/${encodeURIComponent(service)}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  }
}
