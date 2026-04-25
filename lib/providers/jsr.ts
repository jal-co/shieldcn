/**
 * shieldcn
 * lib/providers/jsr
 *
 * JSR (JavaScript Registry) API client.
 * Supports: version, score.
 */

import type { BadgeData } from "@/lib/badges/types"

async function jsrFetch(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

/**
 * Normalize scope: strip leading @ if present.
 */
function normalizeScope(scope: string): string {
  return scope.startsWith("@") ? scope.slice(1) : scope
}

function jsrLink(scope: string, name: string): string {
  return `https://jsr.io/@${normalizeScope(scope)}/${name}`
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getJSRVersion(scope: string, name: string): Promise<BadgeData | null> {
  const s = normalizeScope(scope)
  const data = await jsrFetch(`https://jsr.io/api/scopes/${s}/packages/${encodeURIComponent(name)}`)
  if (!data || typeof data.latestVersion !== "string") return null

  return {
    label: "jsr",
    value: `v${data.latestVersion}`,
    link: jsrLink(scope, name),
  }
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

export async function getJSRScore(scope: string, name: string): Promise<BadgeData | null> {
  const s = normalizeScope(scope)
  const data = await jsrFetch(`https://jsr.io/api/scopes/${s}/packages/${encodeURIComponent(name)}`)
  if (!data) return null

  const score = data.score as number | undefined
  if (score === undefined) return null

  return {
    label: "jsr score",
    value: `${score}%`,
    link: jsrLink(scope, name),
  }
}
