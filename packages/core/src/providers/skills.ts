/**
 * shieldcn
 * lib/providers/skills
 *
 * skills.sh API client — the open agent skills directory by Vercel.
 * Supports: installs, rank, trending, hot.
 * API: https://www.skills.sh/docs/api
 *
 * Uses the public leaderboard endpoint `/api/skills/{view}/{page}` which needs
 * no authentication. A skill is addressed as {owner}/{repo}/{skill}, matching
 * the upstream `source` ("owner/repo") plus `skillId`.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillsShSkill {
  id?: string
  source?: string
  skillId?: string
  slug?: string
  name?: string
  installs?: number
}

/** Leaderboard page. Field names vary slightly across skills.sh tiers. */
interface SkillsShPage {
  skills?: SkillsShSkill[]
  data?: SkillsShSkill[]
  results?: SkillsShSkill[]
  hasMore?: boolean
  pagination?: { hasMore?: boolean }
}

type View = "all-time" | "trending" | "hot"

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

// Canonical host — skills.sh redirects to www, so target www directly.
const API_BASE = "https://www.skills.sh/api"

/** How many leaderboard pages to scan before giving up on a skill. */
const MAX_PAGES = 5

/** Optional API key raises the skills.sh rate limit (60 → 600 req/min). */
function authHeaders(): HeadersInit {
  const key = process.env.SKILLS_SH_API_KEY
  return key ? { Authorization: `Bearer ${key}` } : {}
}

async function fetchLeaderboardPage(view: View, page: number): Promise<SkillsShPage | null> {
  return providerFetch<SkillsShPage>({
    provider: "skills",
    cacheKey: `board:${view}:${page}`,
    url: `${API_BASE}/skills/${view}/${page}`,
    headers: authHeaders(),
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
  /** 1-based position on the leaderboard. */
  rank: number
  installs: number | null
}

/**
 * Scan a leaderboard view for a skill, returning its position and install
 * count. Pages are cached (30 min) and shared across every skills badge, so a
 * warm scan costs nothing. Stops as soon as the skill is found.
 */
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

function skillLink(owner: string, repo: string, skill: string): string {
  return `https://www.skills.sh/${owner}/${repo}/${skill}`
}

// ---------------------------------------------------------------------------
// Badge functions
// ---------------------------------------------------------------------------

export async function getSkillsInstalls(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
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
