/**
 * shieldcn
 * packages/action/src/starhistory
 *
 * Standalone GitHub star-history fetcher for the starchart Action.
 *
 * GitHub restricted the stargazers `starred_at` endpoint to repo
 * admins/collaborators in mid-2026, which killed hosted star charts. Inside a
 * GitHub Action the automatic `GITHUB_TOKEN` is repo-scoped with that access,
 * so the data is still fully available here.
 *
 * Same reconstruction strategy as @shieldcn/core's retired provider: fetch
 * every page for small/medium repos (exact curve), sample pages evenly for
 * large repos (first stargazer of each page), like caarlos0/starcharts.
 * No token pool, no cache — a single-repo cron job doesn't need either.
 */

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
  total: number
  points: StarPoint[]
}

/** Max sampled points / pages — keeps the API cost bounded. */
const MAX_POINTS = 30
/** GitHub caps stargazer pagination at 400 pages (40k stars). */
const MAX_PAGE = 400

async function ghFetch(
  url: string,
  token: string,
  accept: string,
): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      "User-Agent": "shieldcn-starchart-action",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
  if (res.status === 403 || res.status === 429) {
    throw new Error(
      `GitHub rate limited the request (${res.status}). Remaining: ${res.headers.get("x-ratelimit-remaining") ?? "?"}`,
    )
  }
  if (!res.ok) {
    throw new Error(`GitHub request failed (${res.status}): ${url}`)
  }
  return res
}

/** Fetch a single stargazers page; returns the `starred_at` timestamps. */
async function fetchStarPage(
  owner: string,
  repo: string,
  token: string,
  page: number,
): Promise<string[]> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stargazers?per_page=100&page=${page}`
  const res = await ghFetch(url, token, "application/vnd.github.v3.star+json")
  const json = (await res.json()) as Array<{ starred_at?: string }>
  if (!Array.isArray(json)) return []
  return json
    .map((s) => s.starred_at)
    .filter((d): d is string => typeof d === "string")
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

/** Build the cumulative star-history series for a repository. */
export async function getStarHistory(
  owner: string,
  repo: string,
  token: string,
): Promise<StarHistory> {
  // 1. Repo metadata → total stars.
  const repoRes = await ghFetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
    "application/vnd.github.v3+json",
  )
  const meta = (await repoRes.json()) as { stargazers_count?: number }
  const total =
    typeof meta.stargazers_count === "number" ? meta.stargazers_count : 0

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
      pageNums.map((p) => fetchStarPage(owner, repo, token, p)),
    )
    const dates: string[] = results.flat()
    if (dates.length === 0) {
      return { owner, repo, total, points: [{ date: now, value: total }] }
    }
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
      const r = await fetchStarPage(owner, repo, token, p)
      if (r.length === 0) return null
      r.sort()
      return { page: p, date: r[0] }
    }),
  )
  const points: StarPoint[] = []
  for (const r of results) {
    if (!r) continue
    points.push({ date: r.date, value: (r.page - 1) * 100 })
  }
  points.sort((a, b) => a.date.localeCompare(b.date))
  // Anchor at "now" with the live total.
  points.push({ date: now, value: total })
  return { owner, repo, total, points }
}
