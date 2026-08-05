/**
 * shieldcn
 * src/providers/openssf
 *
 * OpenSSF API clients for supply-chain security badges.
 * Supports: Scorecard score, Best Practices badge level.
 *
 * Both upstreams are public and unauthenticated, so neither consumes the
 * GitHub token pool.
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"

// Scorecard is recomputed weekly and Best Practices changes only when a
// maintainer edits the questionnaire, so both tolerate a long TTL.
const OPENSSF_TTL = 21600 // 6h

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

interface ScorecardResponse {
  score?: number
  date?: string
}

/**
 * Pick the badge color for a Scorecard score (0–10).
 *
 * Returns a `statusColors` keyword rather than a palette name: for provider
 * badges the renderer only resolves status keywords, so a name like
 * "brightgreen" would be silently dropped and fall back to the theme default.
 */
export function scorecardColor(score: number): string {
  if (score >= 8) return "success"
  if (score >= 5) return "pending"
  return "failure"
}

/** OpenSSF Scorecard aggregate score for a GitHub repository. */
export async function getOpenSSFScorecard(
  owner: string,
  repo: string
): Promise<BadgeData | null> {
  const slug = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const data = await providerFetch<ScorecardResponse>({
    provider: "openssf",
    cacheKey: `scorecard:${owner}:${repo}`,
    url: `https://api.scorecard.dev/projects/github.com/${slug}`,
    ttl: OPENSSF_TTL,
  })
  if (!data) return null

  const score = data.score
  // A repo that has never been scanned 404s (→ null above), but guard against
  // a scanned-yet-scoreless record rather than rendering "NaN".
  if (typeof score !== "number" || Number.isNaN(score)) return null

  return {
    label: "scorecard",
    // One decimal keeps the badge width stable as the score drifts (9 → "9.0").
    value: score.toFixed(1),
    color: scorecardColor(score),
    link: `https://scorecard.dev/viewer/?uri=github.com/${owner}/${repo}`,
  }
}

// ---------------------------------------------------------------------------
// Best Practices
// ---------------------------------------------------------------------------

interface BestPracticesProject {
  id?: number
  badge_level?: string
}

/**
 * OpenSSF Best Practices badge level for a GitHub repository.
 *
 * Looked up by repository URL rather than project ID, so callers use the same
 * /{owner}/{repo} shape as every other GitHub topic instead of having to know
 * their numeric bestpractices.dev ID.
 */
export async function getOpenSSFBestPractices(
  owner: string,
  repo: string
): Promise<BadgeData | null> {
  const repoUrl = `https://github.com/${owner}/${repo}`
  const projects = await providerFetch<BestPracticesProject[]>({
    provider: "openssf",
    cacheKey: `bestpractices:${owner}:${repo}`,
    url: `https://www.bestpractices.dev/projects.json?url=${encodeURIComponent(repoUrl)}`,
    ttl: OPENSSF_TTL,
  })
  // An unregistered repo returns [] rather than a 404.
  if (!Array.isArray(projects) || projects.length === 0) return null

  const project = projects[0]
  const level = project.badge_level
  if (!level) return null

  return {
    label: "openssf",
    // The API spells the lowest tier "in_progress"; render it as words.
    value: level.replace(/_/g, " "),
    // Deliberately no color. A status keyword would suppress the caller's
    // ?color= (statusColor outranks it), and the tiers people actually want —
    // metallic silver and gold — aren't expressible as status keywords anyway.
    // The tier name carries the meaning; let the caller theme it.
    // Deep-link to the project page when the lookup gave us its ID.
    link:
      project.id === undefined
        ? "https://www.bestpractices.dev"
        : `https://www.bestpractices.dev/projects/${project.id}`,
  }
}
