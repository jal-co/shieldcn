/**
 * shieldcn
 * lib/providers/skills
 *
 * skills.sh API client — the open agent skills directory by Vercel.
 * Supports: installs, rank, trending, hot, audit.
 * API: https://www.skills.sh/docs/api
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
  slug?: string
  skillId?: string
  name?: string
  installs?: number
}

/** Leaderboard responses have shipped under several envelope keys — accept all. */
interface SkillsShList {
  data?: SkillsShSkill[]
  skills?: SkillsShSkill[]
  results?: SkillsShSkill[]
  pagination?: { hasMore?: boolean }
  hasMore?: boolean
}

interface SkillsShAudit {
  audits?: Array<{
    provider?: string
    status?: string
    riskLevel?: string
  }>
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

// Use the www host directly — skills.sh redirects to www and the
// Authorization header can be dropped on the hop.
const API_BASE = "https://www.skills.sh/api/v1"

const PER_PAGE = 100
/** All-time rank scan depth: 10 pages × 100 = top 1000. */
const RANK_MAX_PAGES = 10
/** Trending/hot scan depth: 5 pages × 100 = top 500. */
const VIEW_MAX_PAGES = 5

/** Optional API key raises the skills.sh rate limit (60 → 600 req/min). */
function authHeaders(): HeadersInit {
  const key = process.env.SKILLS_SH_API_KEY
  return key ? { Authorization: `Bearer ${key}` } : {}
}

async function fetchSkillDetail(owner: string, repo: string, skill: string): Promise<SkillsShSkill | null> {
  return providerFetch<SkillsShSkill>({
    provider: "skills",
    cacheKey: `detail:${owner}/${repo}/${skill}`,
    url: `${API_BASE}/skills/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(skill)}`,
    headers: authHeaders(),
    ttl: 1800,
  })
}

async function fetchLeaderboardPage(view: string, page: number): Promise<SkillsShList | null> {
  return providerFetch<SkillsShList>({
    provider: "skills",
    cacheKey: `board:${view}:${page}`,
    url: `${API_BASE}/skills?view=${view}&page=${page}&per_page=${PER_PAGE}`,
    headers: authHeaders(),
    ttl: 1800,
  })
}

async function fetchAudit(owner: string, repo: string, skill: string): Promise<SkillsShAudit | null> {
  return providerFetch<SkillsShAudit>({
    provider: "skills",
    cacheKey: `audit:${owner}/${repo}/${skill}`,
    url: `${API_BASE}/skills/audit/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(skill)}`,
    headers: authHeaders(),
    ttl: 3600,
  })
}

function listSkills(page: SkillsShList): SkillsShSkill[] {
  return page.data ?? page.skills ?? page.results ?? []
}

function matchesSkill(item: SkillsShSkill, owner: string, repo: string, skill: string): boolean {
  const id = `${owner}/${repo}/${skill}`
  if (item.id === id) return true
  return item.source === `${owner}/${repo}` && (item.slug ?? item.skillId) === skill
}

/**
 * Find a skill's 1-based position on a leaderboard view by scanning pages.
 * Pages are cached and shared across all rank badges, so a warm scan is free.
 */
async function findRank(
  view: string,
  owner: string,
  repo: string,
  skill: string,
  maxPages: number
): Promise<number | null> {
  let position = 0
  for (let page = 0; page < maxPages; page++) {
    const data = await fetchLeaderboardPage(view, page)
    if (!data) return null
    const items = listSkills(data)
    for (const item of items) {
      position++
      if (matchesSkill(item, owner, repo, skill)) return position
    }
    const hasMore = data.pagination?.hasMore ?? data.hasMore
    if (items.length < PER_PAGE || hasMore === false) break
  }
  return null
}

function skillLink(owner: string, repo: string, skill: string): string {
  return `https://skills.sh/${owner}/${repo}/${skill}`
}

// ---------------------------------------------------------------------------
// Badge functions
// ---------------------------------------------------------------------------

export async function getSkillsInstalls(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const data = await fetchSkillDetail(owner, repo, skill)
  if (!data || typeof data.installs !== "number") return null
  return {
    label: "installs",
    value: formatCount(data.installs),
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsRank(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const rank = await findRank("all-time", owner, repo, skill, RANK_MAX_PAGES)
  if (rank !== null) {
    return {
      label: "skill rank",
      value: `#${rank}`,
      link: skillLink(owner, repo, skill),
    }
  }
  // Outside the scanned top — still a real badge if the skill exists.
  const detail = await fetchSkillDetail(owner, repo, skill)
  if (!detail) return null
  return {
    label: "skill rank",
    value: `${RANK_MAX_PAGES * PER_PAGE}+`,
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsTrending(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const rank = await findRank("trending", owner, repo, skill, VIEW_MAX_PAGES)
  if (rank === null) return null
  return {
    label: "trending",
    value: `#${rank}`,
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsHot(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const rank = await findRank("hot", owner, repo, skill, VIEW_MAX_PAGES)
  if (rank === null) return null
  return {
    label: "hot",
    value: `#${rank}`,
    link: skillLink(owner, repo, skill),
  }
}

export async function getSkillsAudit(owner: string, repo: string, skill: string): Promise<BadgeData | null> {
  const data = await fetchAudit(owner, repo, skill)
  if (!data?.audits || data.audits.length === 0) return null

  const statuses = data.audits.map((a) => a.status)
  const value = statuses.includes("fail") ? "failed"
    : statuses.includes("warn") ? "warning"
    : "passed"
  const color = value === "failed" ? "red" : value === "warning" ? "amber" : "green"

  return {
    label: "audit",
    value,
    color,
    link: skillLink(owner, repo, skill),
  }
}
