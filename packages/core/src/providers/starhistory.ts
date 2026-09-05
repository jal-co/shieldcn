import { fetchStarHistory, type StarHistory, type StarPoint } from "./github-star-history"
import { pickToken, invalidateToken } from "../token-pool"
import { isBackedOff, recordBackoff, clearBackoff, cachedFetchStale } from "../cache"
import { raceTimeout, isRateLimitResponse } from "../provider-fetch"

export type { StarHistory, StarPoint } from "./github-star-history"

/** Max sampled points / pages — keeps the upstream cost bounded. */
const MAX_POINTS = 30

async function ghFetch(
  url: string,
  accept: string,
  revalidate: number,
  apiVersion?: string,
): Promise<Response | null> {
  if (await isBackedOff("github")) return null
  try {
    const token = await pickToken()
    const doFetch = (auth?: string) =>
      raceTimeout(
        fetch(url, {
          headers: {
            Accept: accept,
            ...(apiVersion ? { "X-GitHub-Api-Version": apiVersion } : {}),
            ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
          },
          next: { revalidate },
        }),
      )

    let response = await doFetch(token)
    if (!response) return null

    if (response.status === 401 && token) {
      await invalidateToken(token)
      response = await doFetch()
      if (!response) return null
    }

    if (isRateLimitResponse(response) || response.status === 503) {
      await recordBackoff("github", response.status)
      return null
    }
    if (!response.ok) return null
    await clearBackoff("github")
    return response
  } catch {
    return null
  }
}

/** Evenly spaced integers in [start, end] inclusive, length `count`. */
function evenSpread(start: number, end: number, count: number): number[] {
  if (count <= 1) return [start]
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(Math.round(start + ((end - start) * i) / (count - 1)))
  }
  return [...new Set(out)]
}

/**
 * Cached star-history series with last-known-good fallback. Returns null when
 * the repo can't be resolved and there's no prior good value.
 */
export async function getStarHistory(
  owner: string,
  repo: string,
): Promise<StarHistory | null> {
  return cachedFetchStale(
    "github",
    `starhistory-v2/${owner}/${repo}`,
    () => fetchStarHistory(owner, repo, (url) => ghFetch(url, "application/vnd.github+json", 60 * 60 * 6, "2026-03-10")),
    60 * 60 * 6,
    60 * 60 * 24 * 30, // 30-day last-known-good
  )
}

// ---------------------------------------------------------------------------
// Issues over time
// ---------------------------------------------------------------------------

/** GitHub Search API caps results at 1000 (10 pages of 100). */
const SEARCH_MAX_PAGE = 10

/** Uncached builder for cumulative issues-created over time. */
async function buildIssueHistory(
  owner: string,
  repo: string,
): Promise<StarHistory | null> {
  // type:issue excludes PRs. The search API also returns total_count.
  const q = encodeURIComponent(`repo:${owner}/${repo} type:issue`)
  const countRes = await ghFetch(
    `https://api.github.com/search/issues?q=${q}&per_page=1`,
    "application/vnd.github.v3+json",
    60 * 60,
  )
  if (!countRes) return null
  let total = 0
  try {
    const meta = (await countRes.json()) as { total_count?: number }
    total = typeof meta.total_count === "number" ? meta.total_count : 0
  } catch {
    return null
  }

  const now = new Date().toISOString()
  if (total <= 0) {
    return { owner, repo, total: 0, points: [{ date: now, value: 0 }] }
  }

  const pages = Math.min(SEARCH_MAX_PAGE, Math.max(1, Math.ceil(total / 100)))
  const sampledPages = evenSpread(1, pages, Math.min(MAX_POINTS, pages))
  const results = await Promise.all(
    sampledPages.map(async (p) => {
      const res = await ghFetch(
        `https://api.github.com/search/issues?q=${q}&sort=created&order=asc&per_page=100&page=${p}`,
        "application/vnd.github.v3+json",
        60 * 60 * 6,
      )
      if (!res) return null
      try {
        const json = (await res.json()) as { items?: Array<{ created_at?: string }> }
        const first = json.items?.[0]?.created_at
        if (!first) return null
        return { page: p, date: first }
      } catch {
        return null
      }
    }),
  )

  const points: StarPoint[] = []
  for (const r of results) {
    if (!r) continue
    points.push({ date: r.date, value: (r.page - 1) * 100 })
  }
  if (points.length === 0) return null
  points.sort((a, b) => a.date.localeCompare(b.date))
  // Anchor at "now" with the live total (covers repos beyond the 1000 cap).
  points.push({ date: now, value: total })
  return { owner, repo, total, points }
}

/**
 * Cached cumulative issues-created series with last-known-good fallback.
 */
export async function getIssueHistory(
  owner: string,
  repo: string,
): Promise<StarHistory | null> {
  return cachedFetchStale(
    "github",
    `issuehistory/${owner}/${repo}`,
    () => buildIssueHistory(owner, repo),
    60 * 60 * 6,
    60 * 60 * 24 * 30,
  )
}
