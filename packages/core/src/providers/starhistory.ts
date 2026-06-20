/**
 * shieldcn
 * src/providers/starhistory
 *
 * GitHub star-history data provider. Builds a time series of cumulative
 * stargazer counts for a repository, suitable for rendering a star-history
 * line chart (like https://github.com/caarlos0/starcharts).
 *
 * GitHub has no "stars over time" API. We reconstruct the curve from the
 * stargazers endpoint, which (with the `star+json` media type) returns a
 * `starred_at` timestamp per stargazer. For small/medium repos we fetch every
 * page and sample the full list for an exact curve; for large repos we sample
 * pages evenly and read the first stargazer of each, exactly like starcharts.
 *
 * Distributed rate limiting goes through the shared token pool; results are
 * cached with a last-known-good fallback so a transient blip never collapses
 * the chart.
 */

import { pickToken, invalidateToken } from "../token-pool"
import { isBackedOff, recordBackoff, clearBackoff, cachedFetchStale } from "../cache"
import { raceTimeout } from "../provider-fetch"

/** A single point on a cumulative curve. */
export interface StarPoint {
  /** ISO-8601 timestamp. */
  date: string
  /** Cumulative count at that moment. */
  value: number
}

/** Resolved cumulative time series for a repository. */
export interface StarHistory {
  owner: string
  repo: string
  /** Total right now. */
  total: number
  /** Time-ordered cumulative points (first → last). */
  points: StarPoint[]
}

/** Max sampled points / pages — keeps the upstream cost bounded. */
const MAX_POINTS = 30
/** GitHub caps stargazer pagination at 400 pages (40k stars). */
const MAX_PAGE = 400

/** Same rate-limit detection as the main GitHub client. */
function isRateLimitResponse(response: Response): boolean {
  if (response.status === 429) return true
  return (
    response.status === 403 &&
    (response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.get("retry-after") !== null)
  )
}

/**
 * Fetch a GitHub URL through the token pool. `accept` lets the caller request
 * the `star+json` media type (needed for `starred_at` timestamps).
 */
async function ghFetch(
  url: string,
  accept: string,
  revalidate: number,
): Promise<Response | null> {
  if (isBackedOff("github")) return null
  try {
    const token = await pickToken()
    const doFetch = (auth?: string) =>
      raceTimeout(
        fetch(url, {
          headers: {
            Accept: accept,
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
      recordBackoff("github", response.status)
      return null
    }
    if (!response.ok) return null
    clearBackoff("github")
    return response
  } catch {
    return null
  }
}

/** Fetch a single stargazers page; returns the `starred_at` timestamps. */
async function fetchStarPage(
  owner: string,
  repo: string,
  page: number,
): Promise<string[] | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`
  const res = await ghFetch(url, "application/vnd.github.v3.star+json", 60 * 60 * 6)
  if (!res) return null
  try {
    const json = (await res.json()) as Array<{ starred_at?: string }>
    if (!Array.isArray(json)) return null
    return json
      .map((s) => s.starred_at)
      .filter((d): d is string => typeof d === "string")
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

/** Uncached builder — see `getStarHistory` for the cached entrypoint. */
async function buildStarHistory(
  owner: string,
  repo: string,
): Promise<StarHistory | null> {
  // 1. Repo metadata → total stars.
  const repoRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    "application/vnd.github.v3+json",
    60 * 60,
  )
  if (!repoRes) return null
  let total = 0
  try {
    const meta = (await repoRes.json()) as { stargazers_count?: number }
    total = typeof meta.stargazers_count === "number" ? meta.stargazers_count : 0
  } catch {
    return null
  }

  const now = new Date().toISOString()

  // No stars yet — render a flat baseline.
  if (total <= 0) {
    return { owner, repo, total: 0, points: [{ date: now, value: 0 }] }
  }

  const pages = Math.min(MAX_PAGE, Math.max(1, Math.ceil(total / 100)))

  // Small/medium repo: fetch every page for an exact curve.
  if (pages <= MAX_POINTS) {
    const pageNums = evenSpread(1, pages, pages)
    const results = await Promise.all(
      pageNums.map((p) => fetchStarPage(owner, repo, p)),
    )
    const dates: string[] = []
    for (const r of results) {
      if (r) dates.push(...r)
    }
    if (dates.length === 0) return null
    dates.sort()

    // Sample the full sorted list down to MAX_POINTS exact cumulative points.
    const idxs = evenSpread(0, dates.length - 1, Math.min(MAX_POINTS, dates.length))
    const points: StarPoint[] = idxs.map((i) => ({ date: dates[i], value: i + 1 }))
    // Anchor the curve at "now" with the live total.
    if (points[points.length - 1].value !== total) {
      points.push({ date: now, value: total })
    }
    return { owner, repo, total, points }
  }

  // Large repo: sample pages evenly, read the first stargazer of each.
  const sampledPages = evenSpread(1, pages, MAX_POINTS)
  const results = await Promise.all(
    sampledPages.map(async (p) => {
      const r = await fetchStarPage(owner, repo, p)
      if (!r || r.length === 0) return null
      r.sort()
      return { page: p, date: r[0] }
    }),
  )
  const points: StarPoint[] = []
  for (const r of results) {
    if (!r) continue
    points.push({ date: r.date, value: (r.page - 1) * 100 })
  }
  if (points.length === 0) return null
  points.sort((a, b) => a.date.localeCompare(b.date))
  // Anchor at "now" with the live total.
  points.push({ date: now, value: total })
  return { owner, repo, total, points }
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
    `starhistory/${owner}/${repo}`,
    () => buildStarHistory(owner, repo),
    60 * 60 * 6, // fresh 6h — the curve barely moves and pagination is costly
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
