/**
 * shieldcn
 * lib/providers/homebrew
 *
 * Homebrew Formulae API client.
 * Supports: version, installs (30/90/365 days).
 * Works for both formulae and casks.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

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

// ---------------------------------------------------------------------------
// Downloads (formula — monthly/quarterly/yearly)
// ---------------------------------------------------------------------------

const periodLabels: Record<string, string> = {
  dm: "/month",
  dq: "/quarter",
  dy: "/year",
}

const periodDays: Record<string, string> = {
  dm: "30d",
  dq: "90d",
  dy: "365d",
}

export async function getHomebrewFormulaDownloads(formula: string, interval: string = "dm"): Promise<BadgeData | null> {
  const data = await brewFetch(
    `https://formulae.brew.sh/api/formula/${encodeURIComponent(formula)}.json`,
    `formula-dl:${formula}:${interval}`
  )
  if (!data) return null

  const analytics = data.analytics as Record<string, unknown> | undefined
  if (!analytics) return null

  const installData = analytics.install_on_request as Record<string, Record<string, number>> | undefined
    ?? analytics.install as Record<string, Record<string, number>> | undefined
  if (!installData) return null

  const dayKey = periodDays[interval] || "30d"
  const period = installData[dayKey]
  if (!period) return null

  const count = period[formula] ?? Object.values(period)[0] ?? 0
  const suffix = periodLabels[interval] || "/month"

  return {
    label: "downloads",
    value: `${formatCount(count)}${suffix}`,
    link: `https://formulae.brew.sh/formula/${formula}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads (cask — monthly/quarterly/yearly)
// ---------------------------------------------------------------------------

export async function getHomebrewCaskDownloads(cask: string, interval: string = "dm"): Promise<BadgeData | null> {
  const data = await brewFetch(
    `https://formulae.brew.sh/api/cask/${encodeURIComponent(cask)}.json`,
    `cask-dl:${cask}:${interval}`
  )
  if (!data) return null

  const analytics = data.analytics as Record<string, unknown> | undefined
  if (!analytics) return null

  const installData = analytics.install as Record<string, Record<string, number>> | undefined
  if (!installData) return null

  const dayKey = periodDays[interval] || "30d"
  const period = installData[dayKey]
  if (!period) return null

  const token = data.token as string ?? cask
  const count = period[token] ?? Object.values(period)[0] ?? 0
  const suffix = periodLabels[interval] || "/month"

  return {
    label: "downloads",
    value: `${formatCount(count)}${suffix}`,
    link: `https://formulae.brew.sh/cask/${cask}`,
  }
}
