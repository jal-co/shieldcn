/**
 * shieldcn
 * lib/providers/skills
 *
 * skills.sh API client — the open agent skills directory by Vercel.
 * Supports: installs, rank, trending, hot.
 * API: https://www.skills.sh/docs/api
 *
 * Uses the v1 API for direct skill lookups (installs) and the paginated
 * leaderboard for positional data (rank, trending, hot).
 * Authentication via Vercel OIDC token (auto-minted on Vercel deployments).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by /api/v1/skills/{source}/{skill} */
interface V1SkillDetail {
  id?: string
  source?: string
  slug?: string
  installs?: number
}

/** Shape returned in leaderboard/search listing arrays */
interface SkillsShSkill {
  id?: string
  source?: string
  skillId?: string
  slug?: string
  name?: string
  installs?: number
}

/** Leaderboard page (v1 and legacy shapes) */
interface SkillsShPage {
  skills?: SkillsShSkill[]
  data?: SkillsShSkill[]
  results?: SkillsShSkill[]
  hasMore?: boolean
  pagination?: { hasMore?: boolean; total?: number }
}

type View = "all-time" | "trending" | "hot"

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const API_BASE = "https://www.skills.sh/api/v1"

/**
 * Get auth headers for skills.sh API.
 * Prefers Vercel OIDC token (available on Vercel deployments), falls back to
 * explicit SKILLS_SH_API_KEY env var.
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  // Try Vercel OIDC first (available on Vercel deployments)
  try {
    const { getVercelOidcToken } = await import("@vercel/oidc")
    const token = await getVercelOidcToken()
    if (token) return { Authorization: `Bearer ${token}` }
  } catch {
    // Not on Vercel or @vercel/oidc not available — fall through
  }

  // Fall back to raw env var (works with `vercel env pull` locally)
  const oidc = process.env.VERCEL_OIDC_TOKEN
  if (oidc) return { Authorization: `Bearer ${oidc}` }

  // Legacy: explicit API key
  const key = process.env.SKILLS_SH_API_KEY
  if (key) return { Authorization: `Bearer ${key}` }

  return {}
}

// ---------------------------------------------------------------------------
// Direct skill lookup (v1 API)
// ---------------------------------------------------------------------------

/**
 * Fetch a single skill's details via the v1 direct endpoint.
 * Returns install count without needing to scan the leaderboard.
 */
async function fetchSkillDirect(
  owner: string,
  repo: string,
  skill: string
): Promise<V1SkillDetail | null> {
  const headers = await getAuthHeaders()
  return providerFetch<V1SkillDetail>({
    provider: "skills",
    cacheKey: `v1:${owner}/${repo}/${skill}`,
    url: `${API_BASE}/skills/${owner}/${repo}/${skill}`,
    headers,
    ttl: 300, // 5 min, matching upstream Cache-Control
  })
}

// ---------------------------------------------------------------------------
// Leaderboard scan (for rank / trending / hot)
// ---------------------------------------------------------------------------

/** How many leaderboard pages to scan before giving up on a skill. */
const MAX_PAGES = 10

async function fetchLeaderboardPage(view: View, page: number): Promise<SkillsShPage | null> {
  const headers = await getAuthHeaders()
  return providerFetch<SkillsShPage>({
    provider: "skills",
    cacheKey: `board:${view}:${page}`,
    url: `${API_BASE}/skills?view=${view}&page=${page}&per_page=100`,
    headers,
    ttl: 1800,
  })
}

function pageSkills(page: SkillsShPage): SkillsShSkill[] {
  return page.skills ?? page.data ?? page.results ?? []
}

function matchesSkill(item: SkillsShSkill, owner: string, repo: string, skill: string): boolean {
  const source = `${owner}/${repo}`
  if (item.id === `${source}/${skill}`) return true
  if (item.source !== source) return false
  return (item.skillId ?? item.slug ?? item.name) === skill
}

interface ScanHit {
  rank: number
  installs: number | null
}

async function scanLeaderboard(
  view: View,
  owner: string,
  repo: string,
  skill: string
): Promise<ScanHit | null> {
  let position = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchLeaderboardPage(view, page)
    if (!data) break
    const items = pageSkills(data)
    if (items.length === 0) break
    for (const item of items) {
      position++
      if (matchesSkill(item, owner, repo, skill)) {
        return { rank: position, installs: typeof item.installs === "number" ? item.installs : null }
      }
    }
    const hasMore = data.pagination?.hasMore ?? data.hasMore
    if (hasMore === false) break
  }
  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function skillLink(owner: string, repo: string, skill: string): string {
  return `https://www.skills.sh/${owner}/${repo}/${skill}`
}

// ---------------------------------------------------------------------------
// Badge functions
// ---------------------------------------------------------------------------

export async function getSkillsInstalls(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  // Use direct v1 lookup — works for any skill, not just top-ranked
  const detail = await fetchSkillDirect(owner, repo, skill)
  if (detail && typeof detail.installs === "number") {
    return {
      label: "installs",
      value: formatCount(detail.installs),
      link: skillLink(owner, repo, skill),
    }
  }

  // Fallback: scan leaderboard (covers edge cases where v1 is down)
  const hit = await scanLeaderboard("all-time", owner, repo, skill)
  if (!hit || hit.installs === null) return null
  return {
    label: "installs",
    value: formatCount(hit.installs),
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsRank(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const hit = await scanLeaderboard("all-time", owner, repo, skill)
  if (!hit) return null
  return {
    label: "skill rank",
    value: `#${hit.rank}`,
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsTrending(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const hit = await scanLeaderboard("trending", owner, repo, skill)
  if (!hit) return null
  return {
    label: "trending",
    value: `#${hit.rank}`,
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsHot(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const hit = await scanLeaderboard("hot", owner, repo, skill)
  if (!hit) return null
  return {
    label: "hot",
    value: `#${hit.rank}`,
    link: skillLink(owner, repo, skill),
  }
}
