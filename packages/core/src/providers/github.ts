/**
 * shieldcn
 * lib/providers/github
 *
 * GitHub REST API client. Uses the token pool for distributed rate limiting.
 * Supports: stars, forks, watchers, branches, releases, tags, license,
 *           contributors, checks, issues, PRs, milestones, commits,
 *           last-commit, assets-dl, dependabot,
 *           followers, user-stars, sponsors.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { pickToken, invalidateToken } from "../token-pool"
import { isBackedOff, recordBackoff, clearBackoff } from "../cache"
import { raceTimeout } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

/**
 * True when a response is a rate limit. GitHub signals primary and secondary
 * rate limits as 403 (with an exhausted quota header or a Retry-After), not
 * just 429 — a plain 403 (e.g. a blocked repo) is NOT a rate limit.
 */
function isRateLimitResponse(response: Response): boolean {
  if (response.status === 429) return true
  return (
    response.status === 403 &&
    (response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.get("retry-after") !== null)
  )
}

async function githubFetch(url: string, revalidate: number = 3600): Promise<Response | null> {
  if (isBackedOff("github")) return null

  try {
    const token = await pickToken()
    const doFetch = (auth?: string) =>
      raceTimeout(
        fetch(url, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
          },
          next: { revalidate },
        }),
      )

    let response = await doFetch(token)
    if (!response) return null

    // A 401 means the pooled token was revoked — drop it from the pool and
    // retry once unauthenticated. The retry goes through the same status
    // checks below; it must never be returned unvetted.
    if (response.status === 401 && token) {
      await invalidateToken(token)
      response = await doFetch()
      if (!response) return null
    }

    // Track rate limits (429, or 403 with exhausted quota) and outages —
    // recordBackoff also surfaces the Sentry alert.
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

async function githubJson(url: string, revalidate?: number): Promise<Record<string, unknown> | null> {
  const r = await githubFetch(url, revalidate)
  if (!r) return null
  try {
    return await r.json()
  } catch {
    // Truncated / malformed body — treat as a transient failure.
    return null
  }
}

/**
 * POST a GraphQL query to the GitHub GraphQL API and return its `data` object.
 * Mirrors {@link githubFetch}: pooled token, 401 token rotation, rate-limit /
 * outage backoff. Returns null on any failure (including GraphQL-level errors,
 * which arrive as HTTP 200 with an `errors` array) so callers fall back to the
 * last-known-good cache instead of rendering a red badge.
 */
async function githubGraphQL(
  query: string,
  variables: Record<string, unknown>,
  revalidate: number = 3600,
  tokenOverride?: string,
): Promise<Record<string, unknown> | null> {
  if (isBackedOff("github")) return null

  try {
    // An explicit override (e.g. the maintainer's read:user token for the
    // sponsors list) bypasses the zero-scope donor pool; otherwise pick a
    // pooled token as usual.
    const token = tokenOverride ?? (await pickToken())
    const doFetch = (auth?: string) =>
      raceTimeout(
        fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
          },
          body: JSON.stringify({ query, variables }),
          next: { revalidate },
        }),
      )

    let response = await doFetch(token)
    if (!response) return null

    // GraphQL rejects unauthenticated requests with 401 (unlike REST, which
    // still serves public data unauthenticated at a low limit). Rotating out a
    // revoked pooled token and retrying is still correct; the bare retry only
    // helps when a fresh token is available — otherwise it 401s again → null.
    // Never invalidate an explicit override token — it isn't in the pool.
    if (response.status === 401 && token && !tokenOverride) {
      await invalidateToken(token)
      response = await doFetch()
      if (!response) return null
    }

    if (isRateLimitResponse(response) || response.status === 503) {
      recordBackoff("github", response.status)
      return null
    }

    if (!response.ok) return null

    const json = (await response.json().catch(() => null)) as { data?: unknown } | null
    const data = json?.data
    if (data && typeof data === "object") {
      clearBackoff("github")
      return data as Record<string, unknown>
    }

    // No data: GitHub signals a GraphQL *primary* rate limit as HTTP 200 with
    // `x-ratelimit-remaining: 0` (secondary limits add `retry-after`) — neither
    // of which `isRateLimitResponse` catches on a 200. Back off so we stop
    // hammering GitHub (and surface the alert) instead of clearing the window.
    if (
      response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.get("retry-after") !== null
    ) {
      recordBackoff("github", 429)
    }
    return null
  } catch {
    return null
  }
}

function link(owner: string, repo: string, path = ""): string {
  return `https://github.com/${owner}/${repo}${path}`
}

function relDate(iso: string): string | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

// ---------------------------------------------------------------------------
// Repo metadata (single API call gives stars, forks, watchers, license)
// ---------------------------------------------------------------------------

async function repoData(owner: string, repo: string) {
  return githubJson(`https://api.github.com/repos/${owner}/${repo}`)
}

/**
 * Resolve the canonical owner/repo (follows GitHub 301 redirects for
 * transferred or renamed repos). The Search API does NOT follow repo
 * redirects, so any function that builds a `repo:owner/repo` search
 * query must resolve through here first.
 */
async function resolveRepo(owner: string, repo: string): Promise<{ owner: string; repo: string } | null> {
  const d = await repoData(owner, repo)
  if (!d) return null
  const fullName = d.full_name as string | undefined
  if (!fullName) return null
  const [o, r] = fullName.split("/")
  if (!o || !r) return null
  return { owner: o, repo: r }
}

/**
 * Definitively decide whether a repo exists, so a genuine bad/typo'd repo can
 * render "invalid repository" instead of a generic transient "not found".
 *
 * Returns:
 *   - `false` — GitHub says the repo does not exist (404)
 *   - `true`  — the repo exists (2xx)
 *   - `null`  — couldn't tell (rate limit, backoff, network, other status);
 *               caller should treat this as transient, not as "invalid"
 *
 * Uses a HEAD request (no body) and is only called on the failure path, so it
 * costs an extra call only when a badge would otherwise have failed.
 */
export async function githubRepoExists(owner: string, repo: string): Promise<boolean | null> {
  return githubHeadExists(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
}

/**
 * HEAD-probe a GitHub API URL and definitively classify it:
 * `true` (2xx), `false` (404), or `null` for anything we can't be sure about
 * (rate limit, backoff, network, other status) — callers must treat `null`
 * as transient, never as "does not exist".
 */
async function githubHeadExists(url: string): Promise<boolean | null> {
  if (isBackedOff("github")) return null
  try {
    const token = await pickToken()
    const response = await raceTimeout(
      fetch(url, {
        method: "HEAD",
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        next: { revalidate: 3600 },
      }),
    )
    if (!response) return null
    if (response.status === 404) return false
    if (isRateLimitResponse(response) || response.status === 503) {
      recordBackoff("github", response.status)
      return null
    }
    if (response.ok) {
      clearBackoff("github")
      return true
    }
    return null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Badge functions
// ---------------------------------------------------------------------------

export async function getGitHubStars(owner: string, repo: string): Promise<BadgeData | null> {
  const d = await repoData(owner, repo)
  if (!d || typeof d.stargazers_count !== "number") return null
  return { label: "stars", value: formatCount(d.stargazers_count as number), link: link(owner, repo, "/stargazers") }
}

export async function getGitHubForks(owner: string, repo: string): Promise<BadgeData | null> {
  const d = await repoData(owner, repo)
  if (!d || typeof d.forks_count !== "number") return null
  return { label: "forks", value: formatCount(d.forks_count as number), link: link(owner, repo, "/forks") }
}

export async function getGitHubWatchers(owner: string, repo: string): Promise<BadgeData | null> {
  const d = await repoData(owner, repo)
  if (!d || typeof d.subscribers_count !== "number") return null
  return { label: "watchers", value: formatCount(d.subscribers_count as number), link: link(owner, repo, "/watchers") }
}

export async function getGitHubLicense(owner: string, repo: string): Promise<BadgeData | null> {
  const d = await repoData(owner, repo)
  if (!d) return null
  const lic = (d.license as Record<string, unknown>)?.spdx_id as string | undefined
  if (!lic || lic === "NOASSERTION") return { label: "license", value: "unknown", link: link(owner, repo) }
  return { label: "license", value: lic, link: link(owner, repo, `/blob/${(d.default_branch as string) || "main"}/LICENSE`) }
}

// ---------------------------------------------------------------------------
// Branches / Tags / Releases counts
// ---------------------------------------------------------------------------

async function countPages(url: string): Promise<number | null> {
  // GitHub returns Link header with last page for paginated endpoints.
  // The URL may already carry a query string (e.g. commits?sha=branch).
  const sep = url.includes("?") ? "&" : "?"
  const r = await githubFetch(`${url}${sep}per_page=1`)
  if (!r) return null
  const linkHeader = r.headers.get("link")
  if (!linkHeader) {
    try {
      const data = await r.json()
      return Array.isArray(data) ? data.length : 0
    } catch {
      return null
    }
  }
  const match = linkHeader.match(/page=(\d+)>;\s*rel="last"/)
  return match ? parseInt(match[1]) : 1
}

export async function getGitHubBranches(owner: string, repo: string): Promise<BadgeData | null> {
  const count = await countPages(`https://api.github.com/repos/${owner}/${repo}/branches`)
  if (count === null) return null
  return { label: "branches", value: formatCount(count), link: link(owner, repo, "/branches") }
}

export async function getGitHubReleases(owner: string, repo: string): Promise<BadgeData | null> {
  const count = await countPages(`https://api.github.com/repos/${owner}/${repo}/releases`)
  if (count === null) return null
  return { label: "releases", value: formatCount(count), link: link(owner, repo, "/releases") }
}

export async function getGitHubTags(owner: string, repo: string): Promise<BadgeData | null> {
  const count = await countPages(`https://api.github.com/repos/${owner}/${repo}/tags`)
  if (count === null) return null
  return { label: "tags", value: formatCount(count), link: link(owner, repo, "/tags") }
}

export async function getGitHubLatestTag(owner: string, repo: string): Promise<BadgeData | null> {
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`)
  if (!d || !Array.isArray(d) || d.length === 0) return null
  if (typeof d[0]?.name !== "string") return null
  return { label: "tag", value: d[0].name, link: link(owner, repo, "/tags") }
}

// ---------------------------------------------------------------------------
// Release (latest / stable)
// ---------------------------------------------------------------------------

export async function getGitHubRelease(owner: string, repo: string, channel?: string): Promise<BadgeData | null> {
  if (channel === "stable") {
    // Find latest non-prerelease
    const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`)
    if (!d || !Array.isArray(d)) return null
    const stable = d.find((r: Record<string, unknown>) => !r.prerelease && !r.draft)
    if (!stable || typeof stable.tag_name !== "string") return null
    return { label: "release", value: stable.tag_name, color: "blue", link: typeof stable.html_url === "string" ? stable.html_url : link(owner, repo, "/releases") }
  }
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
  if (!d || typeof d.tag_name !== "string") return null
  return { label: "release", value: d.tag_name, color: "blue", link: d.html_url as string }
}

// ---------------------------------------------------------------------------
// Contributors
// ---------------------------------------------------------------------------

export async function getGitHubContributors(owner: string, repo: string): Promise<BadgeData | null> {
  const count = await countPages(`https://api.github.com/repos/${owner}/${repo}/contributors`)
  if (count === null) return null
  return { label: "contributors", value: formatCount(count), link: link(owner, repo, "/graphs/contributors") }
}

// ---------------------------------------------------------------------------
// CI / Checks
// ---------------------------------------------------------------------------

function mapCIStatus(status: string, conclusion: string | null): { value: string; color: string } {
  if (status === "completed") {
    if (conclusion === "success") return { value: "passing", color: "success" }
    if (conclusion === "failure") return { value: "failing", color: "failure" }
    if (conclusion === "cancelled") return { value: "cancelled", color: "cancelled" }
    if (conclusion === "skipped") return { value: "skipped", color: "skipped" }
    return { value: "failing", color: "failure" }
  }
  return { value: "pending", color: "pending" }
}

export async function getGitHubCI(
  owner: string, repo: string, workflow?: string, branch?: string
): Promise<BadgeData | null> {
  const params = new URLSearchParams({ per_page: "1" })
  if (branch) params.set("branch", branch)
  const wp = workflow ? `/workflows/${encodeURIComponent(workflow)}` : ""
  const d = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/actions${wp}/runs?${params}`,
    600
  )
  if (!d) return null
  const runs = d.workflow_runs as Record<string, unknown>[] | undefined
  const run = runs?.[0]
  if (!run) return null
  const { value, color } = mapCIStatus(run.status as string, run.conclusion as string | null)
  return { label: "CI", value, color, link: run.html_url as string }
}

export async function getGitHubChecks(
  owner: string, repo: string, ref?: string, checkName?: string
): Promise<BadgeData | null> {
  const branch = ref || "HEAD"
  // Combined status
  const d = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/commits/${branch}/check-runs?per_page=100`,
    600
  )
  if (!d) return null
  const runs = (d.check_runs as Record<string, unknown>[]) || []

  if (checkName) {
    const run = runs.find(r => r.name === checkName)
    if (!run) return { label: checkName, value: "not found", color: "cancelled" }
    const { value, color } = mapCIStatus(run.status as string, run.conclusion as string | null)
    return { label: checkName, value, color, link: run.html_url as string }
  }

  // Combined: all must pass
  if (runs.length === 0) return { label: "checks", value: "none", color: "cancelled" }
  const allDone = runs.every(r => r.status === "completed")
  const allPass = runs.every(r => r.conclusion === "success")
  if (!allDone) return { label: "checks", value: "pending", color: "pending" }
  if (allPass) return { label: "checks", value: "passing", color: "success" }
  return { label: "checks", value: "failing", color: "failure" }
}

// ---------------------------------------------------------------------------
// Issues & PRs
// ---------------------------------------------------------------------------

async function issueCount(owner: string, repo: string, state: string, isPR: boolean): Promise<number | null> {
  // Resolve canonical owner/repo — the Search API does not follow repo redirects
  const resolved = await resolveRepo(owner, repo)
  if (!resolved) return null
  const q = `repo:${resolved.owner}/${resolved.repo} is:${isPR ? "pr" : "issue"} is:${state}`
  const d = await githubJson(
    `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=1`
  )
  if (!d || typeof d.total_count !== "number") return null
  return d.total_count as number
}

export async function getGitHubIssues(owner: string, repo: string, filter: string): Promise<BadgeData | null> {
  let count: number | null
  let lbl: string

  switch (filter) {
    case "open-issues":
      count = await issueCount(owner, repo, "open", false); lbl = "open issues"; break
    case "closed-issues":
      count = await issueCount(owner, repo, "closed", false); lbl = "closed issues"; break
    default: // "issues" — open
      count = await issueCount(owner, repo, "open", false); lbl = "issues"; break
  }
  if (count === null) return null
  return { label: lbl, value: formatCount(count), link: link(owner, repo, "/issues") }
}

export async function getGitHubLabelIssues(
  owner: string, repo: string, label: string, states?: string
): Promise<BadgeData | null> {
  // Resolve canonical owner/repo — the Search API does not follow repo redirects
  const resolved = await resolveRepo(owner, repo)
  if (!resolved) return null
  const state = states === "closed" ? "closed" : states === "open" ? "open" : "open"
  const q = `repo:${resolved.owner}/${resolved.repo} is:issue is:${state} label:"${label}"`
  const d = await githubJson(
    `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=1`
  )
  if (!d || typeof d.total_count !== "number") return null
  return { label: `${label}`, value: `${formatCount(d.total_count as number)} ${state}`, link: link(owner, repo, `/issues?q=label:"${encodeURIComponent(label)}"`) }
}

export async function getGitHubPRs(owner: string, repo: string, filter: string): Promise<BadgeData | null> {
  let count: number | null
  let lbl: string

  switch (filter) {
    case "open-prs":
      count = await issueCount(owner, repo, "open", true); lbl = "open PRs"; break
    case "closed-prs":
      count = await issueCount(owner, repo, "closed", true); lbl = "closed PRs"; break
    case "merged-prs": {
      // Resolve canonical owner/repo — the Search API does not follow repo redirects
      const resolved = await resolveRepo(owner, repo)
      if (!resolved) return null
      const q = `repo:${resolved.owner}/${resolved.repo} is:pr is:merged`
      const d = await githubJson(`https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=1`)
      if (!d || typeof d.total_count !== "number") return null
      return { label: "merged PRs", value: formatCount(d.total_count as number), link: link(owner, repo, "/pulls?q=is:merged") }
    }
    default: // "prs"
      count = await issueCount(owner, repo, "open", true); lbl = "PRs"; break
  }
  if (count === null) return null
  return { label: lbl, value: formatCount(count), link: link(owner, repo, "/pulls") }
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function getGitHubMilestone(
  owner: string, repo: string, milestoneNumber: string
): Promise<BadgeData | null> {
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/milestones/${encodeURIComponent(milestoneNumber)}`)
  if (!d || typeof d.title !== "string" || typeof d.open_issues !== "number" || typeof d.closed_issues !== "number") return null
  const open = d.open_issues
  const closed = d.closed_issues
  const total = open + closed
  const pct = total > 0 ? Math.round((closed / total) * 100) : 0
  return { label: d.title, value: `${pct}%`, link: link(owner, repo, `/milestone/${milestoneNumber}`) }
}

// ---------------------------------------------------------------------------
// Commits / last-commit
// ---------------------------------------------------------------------------

export async function getGitHubCommits(owner: string, repo: string, ref?: string): Promise<BadgeData | null> {
  const branch = ref ? `?sha=${encodeURIComponent(ref)}` : ""
  const count = await countPages(`https://api.github.com/repos/${owner}/${repo}/commits${branch}`)
  if (count === null) return null
  return { label: "commits", value: formatCount(count), link: link(owner, repo, `/commits${ref ? `/${ref}` : ""}`) }
}

export async function getGitHubLastCommit(owner: string, repo: string, ref?: string): Promise<BadgeData | null> {
  const params = new URLSearchParams({ per_page: "1" })
  if (ref) params.set("sha", ref)
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/commits?${params}`, 600)
  if (!d || !Array.isArray(d) || d.length === 0) return null
  const date = d[0].commit?.author?.date || d[0].commit?.committer?.date
  if (typeof date !== "string") return null
  const rel = relDate(date)
  if (rel === null) return null
  return { label: "last commit", value: rel, link: link(owner, repo, `/commits${ref ? `/${ref}` : ""}`) }
}

// ---------------------------------------------------------------------------
// Assets downloads
// ---------------------------------------------------------------------------

export async function getGitHubAssetsDl(owner: string, repo: string, tag?: string): Promise<BadgeData | null> {
  const url = tag
    ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`
    : `https://api.github.com/repos/${owner}/${repo}/releases/latest`
  const d = await githubJson(url)
  if (!d) return null
  const assets = d.assets
  if (!Array.isArray(assets)) return null
  const total = assets.reduce((sum: number, a) => sum + (typeof a.download_count === "number" ? a.download_count : 0), 0)
  return { label: "downloads", value: formatCount(total), link: link(owner, repo, "/releases") }
}

// ---------------------------------------------------------------------------
// Downloads — all assets, all releases
// ---------------------------------------------------------------------------

export async function getGitHubDownloadsAllAssetsAllReleases(owner: string, repo: string): Promise<BadgeData | null> {
  // Paginate through all releases to sum every asset download
  let total = 0
  let page = 1
  const perPage = 100
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`
    const d = await githubJson(url)
    // A failed page (rate limit, backoff, network) must fail the whole badge:
    // a partial sum — or a flat 0 — would otherwise be persisted as
    // last-known-good for days, clobbering the real count.
    if (!d || !Array.isArray(d)) return null
    if (d.length === 0) break
    for (const release of d) {
      const assets = release.assets as Record<string, unknown>[] | undefined
      if (assets) {
        for (const a of assets) {
          total += typeof a.download_count === "number" ? a.download_count : 0
        }
      }
    }
    if (d.length < perPage) break
    page++
    if (page > 50) break // safety cap
  }
  return { label: "downloads", value: formatCount(total), link: link(owner, repo, "/releases") }
}

// ---------------------------------------------------------------------------
// Downloads — all assets, latest release
// ---------------------------------------------------------------------------

export async function getGitHubDownloadsAllAssetsLatest(owner: string, repo: string): Promise<BadgeData | null> {
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
  if (!d) return null
  const assets = d.assets
  if (!Array.isArray(assets)) return null
  const total = assets.reduce((sum: number, a) => sum + ((a.download_count as number) || 0), 0)
  const tag = d.tag_name as string | undefined
  return { label: `downloads@${tag ?? "latest"}`, value: formatCount(total), link: link(owner, repo, "/releases/latest") }
}

// ---------------------------------------------------------------------------
// Downloads — all assets, specific tag
// ---------------------------------------------------------------------------

export async function getGitHubDownloadsAllAssetsTag(owner: string, repo: string, tag: string): Promise<BadgeData | null> {
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`)
  if (!d) return null
  const assets = d.assets
  if (!Array.isArray(assets)) return null
  const total = assets.reduce((sum: number, a) => sum + ((a.download_count as number) || 0), 0)
  return { label: `downloads@${tag}`, value: formatCount(total), link: link(owner, repo, `/releases/tag/${tag}`) }
}

// ---------------------------------------------------------------------------
// Downloads — specific asset, all releases
// ---------------------------------------------------------------------------

export async function getGitHubDownloadsAssetAllReleases(owner: string, repo: string, assetName: string): Promise<BadgeData | null> {
  let total = 0
  let page = 1
  const perPage = 100
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`
    const d = await githubJson(url)
    // A failed page must fail the whole badge — see
    // getGitHubDownloadsAllAssetsAllReleases for why.
    if (!d || !Array.isArray(d)) return null
    if (d.length === 0) break
    for (const release of d) {
      const assets = release.assets as Record<string, unknown>[] | undefined
      if (assets) {
        for (const a of assets) {
          if ((a.name as string) === assetName) {
            total += typeof a.download_count === "number" ? a.download_count : 0
          }
        }
      }
    }
    if (d.length < perPage) break
    page++
    if (page > 50) break
  }
  return { label: `downloads [${assetName}]`, value: formatCount(total), link: link(owner, repo, "/releases") }
}

// ---------------------------------------------------------------------------
// Downloads — specific asset, latest release
// ---------------------------------------------------------------------------

export async function getGitHubDownloadsAssetLatest(owner: string, repo: string, assetName: string): Promise<BadgeData | null> {
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)
  if (!d) return null
  const assets = d.assets
  if (!Array.isArray(assets)) return null
  const asset = assets.find(a => (a.name as string) === assetName)
  if (!asset) return { label: `downloads [${assetName}]`, value: "0", link: link(owner, repo, "/releases/latest") }
  const count = (asset.download_count as number) || 0
  const tag = d.tag_name as string | undefined
  return { label: `downloads@${tag ?? "latest"} [${assetName}]`, value: formatCount(count), link: link(owner, repo, "/releases/latest") }
}

// ---------------------------------------------------------------------------
// Downloads — specific asset, specific tag
// ---------------------------------------------------------------------------

export async function getGitHubDownloadsAssetTag(owner: string, repo: string, tag: string, assetName: string): Promise<BadgeData | null> {
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`)
  if (!d) return null
  const assets = d.assets
  if (!Array.isArray(assets)) return null
  const asset = assets.find(a => (a.name as string) === assetName)
  if (!asset) return { label: `downloads@${tag} [${assetName}]`, value: "0", link: link(owner, repo, `/releases/tag/${tag}`) }
  const count = (asset.download_count as number) || 0
  return { label: `downloads@${tag} [${assetName}]`, value: formatCount(count), link: link(owner, repo, `/releases/tag/${tag}`) }
}

// ---------------------------------------------------------------------------
// Dependabot
// ---------------------------------------------------------------------------

export async function getGitHubDependabot(owner: string, repo: string): Promise<BadgeData | null> {
  // Check if dependabot.yml exists. A definitive 404 on both spellings means
  // "not configured"; anything indeterminate (rate limit, backoff, network)
  // must return null so the route serves last-known-good instead of flipping
  // a configured repo to "not found" during an outage.
  const yml = await githubHeadExists(`https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yml`)
  if (yml === true) return { label: "dependabot", value: "enabled", color: "success" }

  const yaml = await githubHeadExists(`https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yaml`)
  if (yaml === true) return { label: "dependabot", value: "enabled", color: "success" }

  if (yml === false && yaml === false) {
    return { label: "dependabot", value: "not found", color: "cancelled" }
  }
  return null
}

// ---------------------------------------------------------------------------
// User-level: followers, total stars
// ---------------------------------------------------------------------------

export async function getGitHubFollowers(username: string): Promise<BadgeData | null> {
  const data = await githubJson(`https://api.github.com/users/${username}`)
  if (!data || typeof data.followers !== "number") return null
  return {
    label: "followers",
    value: formatCount(data.followers as number),
    link: `https://github.com/${username}?tab=followers`,
  }
}

export async function getGitHubUserStars(username: string): Promise<BadgeData | null> {
  // Sum stargazers across all user-owned repos
  const repos = await githubFetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=stars&type=owner`,
  )
  if (!repos) return null
  let list: Array<{ stargazers_count: number; fork: boolean }>
  try {
    list = await repos.json()
  } catch {
    return null
  }
  if (!Array.isArray(list)) return null
  const total = list.reduce(
    (sum, r) => sum + (r.fork ? 0 : (r.stargazers_count ?? 0)),
    0,
  )
  return {
    label: "stars",
    value: formatCount(total),
    link: `https://github.com/${username}?tab=repositories`,
  }
}

// ---------------------------------------------------------------------------
// Sponsors (GitHub Sponsors — account-scoped, GraphQL only)
// ---------------------------------------------------------------------------

// `repositoryOwner` resolves both users and organizations; both expose the
// `sponsors` connection, so concrete-type spreads cover either account type in
// one query. `sponsors` is the set of accounts *currently* sponsoring this one,
// i.e. the active-sponsor count. `totalCount` includes private sponsors in the
// number (never their identities), exactly as GitHub exposes it to our token.
const SPONSORS_QUERY = `query($login: String!) {
  repositoryOwner(login: $login) {
    ... on User { sponsors { totalCount } }
    ... on Organization { sponsors { totalCount } }
  }
}`

export async function getGitHubSponsors(login: string): Promise<BadgeData | null> {
  const data = await githubGraphQL(SPONSORS_QUERY, { login })
  const owner = data?.repositoryOwner as { sponsors?: { totalCount?: unknown } } | null | undefined
  const count = owner?.sponsors?.totalCount
  if (typeof count !== "number") return null
  return {
    label: "Sponsors",
    value: formatCount(count),
    link: `https://github.com/sponsors/${login}`,
  }
}

// ---------------------------------------------------------------------------
// Sponsors list (public active sponsors — avatars, names, logins)
// ---------------------------------------------------------------------------

/** A single public sponsor of an account. */
export interface SponsorEntry {
  login: string
  name: string | null
  /** GitHub-hosted avatar URL (sized via the GraphQL `size:` argument). */
  avatarUrl: string
  url: string
  type: "User" | "Organization"
}

/** Resolved public-sponsor list for an account. */
export interface SponsorsList {
  /** Total active sponsors (includes private ones in the number only). */
  totalCount: number
  /** The publicly-visible sponsors, in GitHub's returned order. */
  sponsors: SponsorEntry[]
}

// `sponsors` is the set of accounts *currently* sponsoring this one. Only the
// public sponsors expose identity (login/name/avatar); private sponsors are
// counted in `totalCount` but never enumerated to a pooled token. `avatarUrl`
// takes a pixel `size` so GitHub returns an already-downscaled image, keeping
// the inlined data URI small. Both User and Organization owners expose the same
// `sponsors` connection, so the concrete-type spreads cover either account.
const SPONSORS_LIST_NODE = `__typename
  ... on User { login name avatarUrl(size: 160) url }
  ... on Organization { login name avatarUrl(size: 160) url }`
const SPONSORS_LIST_QUERY = `query($login: String!, $after: String) {
  repositoryOwner(login: $login) {
    ... on User { sponsors(first: 100, after: $after) { totalCount pageInfo { hasNextPage endCursor } nodes { ${SPONSORS_LIST_NODE} } } }
    ... on Organization { sponsors(first: 100, after: $after) { totalCount pageInfo { hasNextPage endCursor } nodes { ${SPONSORS_LIST_NODE} } } }
  }
}`

interface RawSponsorNode {
  __typename?: string
  login?: unknown
  name?: unknown
  avatarUrl?: unknown
  url?: unknown
}

interface RawSponsorsConnection {
  totalCount?: unknown
  pageInfo?: { hasNextPage?: unknown; endCursor?: unknown }
  nodes?: unknown
}

/**
 * Fetch the public active-sponsor list for a user or organization. Paginates
 * up to {@link SPONSORS_PAGE_CAP} pages (100 each) so very large sponsor lists
 * stay bounded. Returns null on any failure (so the route serves
 * last-known-good instead of an error image).
 */
const SPONSORS_PAGE_CAP = 3

export async function getGitHubSponsorsList(login: string): Promise<SponsorsList | null> {
  // Enumerating sponsor identities (`sponsors.nodes`) requires the `read:user`
  // scope. The donor token pool is deliberately zero-scope, so it can read the
  // aggregate `totalCount` (the count badge) but NOT the list. Prefer a
  // dedicated maintainer token when configured; otherwise fall through to the
  // pool (which yields no nodes → graceful empty card, never a crash).
  const sponsorToken = process.env.SPONSORS_GITHUB_TOKEN || undefined
  const sponsors: SponsorEntry[] = []
  let totalCount = 0
  let after: string | null = null
  let resolvedAny = false

  for (let page = 0; page < SPONSORS_PAGE_CAP; page++) {
    const data: Record<string, unknown> | null = await githubGraphQL(SPONSORS_LIST_QUERY, { login, after }, 3600, sponsorToken)
    const owner = data?.repositoryOwner as { sponsors?: RawSponsorsConnection } | null | undefined
    const conn = owner?.sponsors
    if (!conn) {
      // A null owner on the very first page means the account couldn't be
      // resolved (or the call failed) — surface that as a miss. After at least
      // one good page, stop and return what we have.
      if (!resolvedAny) return null
      break
    }
    resolvedAny = true
    if (typeof conn.totalCount === "number") totalCount = conn.totalCount

    const nodes = Array.isArray(conn.nodes) ? (conn.nodes as RawSponsorNode[]) : []
    for (const n of nodes) {
      if (typeof n?.login !== "string" || typeof n?.avatarUrl !== "string") continue
      sponsors.push({
        login: n.login,
        name: typeof n.name === "string" && n.name.trim() ? n.name : null,
        avatarUrl: n.avatarUrl,
        url: typeof n.url === "string" ? n.url : `https://github.com/${n.login}`,
        type: n.__typename === "Organization" ? "Organization" : "User",
      })
    }

    const hasNext = conn.pageInfo?.hasNextPage === true
    const endCursor = conn.pageInfo?.endCursor
    if (!hasNext || typeof endCursor !== "string") break
    after = endCursor
  }

  if (!resolvedAny) return null
  return { totalCount, sponsors }
}
