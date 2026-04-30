/**
 * @shieldcn/core
 * src/providers/weblate
 *
 * Weblate translation platform API client.
 * Supports: translation percentage, language count.
 *
 * Uses the public Weblate API (no auth required for public projects).
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Translation percentage
// ---------------------------------------------------------------------------

export async function getWeblateTranslation(
  server: string,
  project: string,
  component: string,
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "weblate",
    cacheKey: `stats:${server}:${project}:${component}`,
    url: `https://${server}/api/components/${project}/${component}/statistics/`,
    ttl: 3600,
  })
  if (!data) return null

  const translated = data.translated_percent as number | undefined
  if (translated === undefined) return null

  const pct = Math.round(translated * 100) / 100
  let color: string | undefined
  if (pct >= 90) color = "green"
  else if (pct >= 50) color = "yellow"
  else color = "red"

  return {
    label: "translated",
    value: `${pct}%`,
    color,
    link: `https://${server}/projects/${project}/${component}/`,
  }
}

// ---------------------------------------------------------------------------
// Language count
// ---------------------------------------------------------------------------

export async function getWeblateLanguages(
  server: string,
  project: string,
  component: string,
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "weblate",
    cacheKey: `langs:${server}:${project}:${component}`,
    url: `https://${server}/api/components/${project}/${component}/statistics/`,
    ttl: 3600,
  })
  if (!data) return null

  // The results array contains per-language stats
  const results = data.results as unknown[] | undefined
  const count = results?.length ?? (data.total as number | undefined)

  if (count === undefined) return null

  return {
    label: "languages",
    value: `${count}`,
    link: `https://${server}/projects/${project}/${component}/`,
  }
}
