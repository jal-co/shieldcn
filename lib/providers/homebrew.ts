/**
 * shieldcn
 * lib/providers/homebrew
 *
 * Homebrew Formulae API client.
 * Supports: version, installs (30/90/365 days).
 * Works for both formulae and casks.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

async function brewFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  return providerFetch({ provider: "homebrew", cacheKey: key, url, ttl: 3600 })
}

// ---------------------------------------------------------------------------
// Version (formula)
// ---------------------------------------------------------------------------

export async function getHomebrewVersion(formula: string): Promise<BadgeData | null> {
  const data = await brewFetch(`https://formulae.brew.sh/api/formula/${encodeURIComponent(formula)}.json`, `v:${formula}`)
  if (!data) return null

  const versions = data.versions as Record<string, string> | undefined
  const version = versions?.stable

  return {
    label: "homebrew",
    value: version ? `v${version}` : "unknown",
    link: `https://formulae.brew.sh/formula/${formula}`,
  }
}

// ---------------------------------------------------------------------------
// Version (cask)
// ---------------------------------------------------------------------------

export async function getHomebrewCaskVersion(cask: string): Promise<BadgeData | null> {
  const data = await brewFetch(`https://formulae.brew.sh/api/cask/${encodeURIComponent(cask)}.json`, `cask:${cask}`)
  if (!data) return null

  const version = data.version as string | undefined
  return {
    label: "homebrew cask",
    value: version ? `v${version}` : "unknown",
    link: `https://formulae.brew.sh/cask/${cask}`,
  }
}

// ---------------------------------------------------------------------------
// Installs (formula — 30/90/365 days)
// ---------------------------------------------------------------------------

export async function getHomebrewInstalls(formula: string, days: string = "30"): Promise<BadgeData | null> {
  const data = await brewFetch(`https://formulae.brew.sh/api/formula/${encodeURIComponent(formula)}.json`, `installs:${formula}:${days}`)
  if (!data) return null

  const analytics = data.analytics_linux as Record<string, unknown> | undefined
    ?? data.analytics as Record<string, unknown> | undefined
  const install30 = analytics?.install_on_request as Record<string, Record<string, number>> | undefined

  // The analytics structure has changed over time — try the installs key
  const installs = data.analytics as Record<string, unknown> | undefined
  const installData = installs?.install_on_request as Record<string, Record<string, number>> | undefined

  if (installData) {
    const period = installData[`${days}d`]
    if (period) {
      const count = period[formula] ?? Object.values(period)[0] ?? 0
      return {
        label: "installs",
        value: `${formatCount(count)} (${days}d)`,
        link: `https://formulae.brew.sh/formula/${formula}`,
      }
    }
  }

  // Fallback: just show the formula page
  return {
    label: "homebrew",
    value: formula,
    link: `https://formulae.brew.sh/formula/${formula}`,
  }
}
