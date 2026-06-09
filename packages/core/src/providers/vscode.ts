/**
 * shieldcn
 * lib/providers/vscode
 *
 * VS Code Marketplace API client.
 * Supports: installs, rating, version.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { cachedFetchStale, handleUpstreamStatus } from "../cache"

/** Last-known-good fallback window (7 days). */
const VSCODE_STALE_TTL = 60 * 60 * 24 * 7

interface VSCodeExtension {
  results: Array<{
    extensions: Array<{
      versions: Array<{ version: string }>
      statistics: Array<{ statisticName: string; value: number }>
    }>
  }>
}

async function vscodeFetch(publisher: string, extension: string): Promise<VSCodeExtension | null> {
  return cachedFetchStale<VSCodeExtension>(
    "vscode",
    `ext:${publisher}:${extension}`,
    async () => {
      const r = await fetch("https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json;api-version=6.0-preview.1",
        },
        body: JSON.stringify({
          filters: [{
            criteria: [{ filterType: 7, value: `${publisher}.${extension}` }],
          }],
          flags: 914,
        }),
        next: { revalidate: 3600 },
      })
      // Transient (429/5xx) → throw so we serve last-known-good; a definitive
      // negative returns null.
      if (r.status === 429 || r.status >= 500) throw r
      handleUpstreamStatus("vscode", r.status)
      if (!r.ok) return null
      return r.json()
    },
    3600,
    VSCODE_STALE_TTL,
  )
}

function getStat(stats: Array<{ statisticName: string; value: number }>, name: string): number {
  return stats.find(s => s.statisticName === name)?.value ?? 0
}

// ---------------------------------------------------------------------------
// Installs
// ---------------------------------------------------------------------------

export async function getVSCodeInstalls(publisher: string, extension: string): Promise<BadgeData | null> {
  const data = await vscodeFetch(publisher, extension)
  const ext = data?.results?.[0]?.extensions?.[0]
  if (!ext) return null

  const installs = getStat(ext.statistics, "install")
  return {
    label: "installs",
    value: formatCount(installs),
    link: `https://marketplace.visualstudio.com/items?itemName=${publisher}.${extension}`,
  }
}

// ---------------------------------------------------------------------------
// Rating
// ---------------------------------------------------------------------------

export async function getVSCodeRating(publisher: string, extension: string): Promise<BadgeData | null> {
  const data = await vscodeFetch(publisher, extension)
  const ext = data?.results?.[0]?.extensions?.[0]
  if (!ext) return null

  const rating = getStat(ext.statistics, "averagerating")
  const count = getStat(ext.statistics, "ratingcount")
  return {
    label: "rating",
    value: `${rating.toFixed(1)}/5 (${formatCount(count)})`,
    link: `https://marketplace.visualstudio.com/items?itemName=${publisher}.${extension}`,
  }
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getVSCodeVersion(publisher: string, extension: string): Promise<BadgeData | null> {
  const data = await vscodeFetch(publisher, extension)
  const ext = data?.results?.[0]?.extensions?.[0]
  if (!ext) return null

  const version = ext.versions?.[0]?.version
  return {
    label: "vs code marketplace",
    value: version ? `v${version}` : "unknown",
    link: `https://marketplace.visualstudio.com/items?itemName=${publisher}.${extension}`,
  }
}
