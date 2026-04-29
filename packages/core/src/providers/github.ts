/**
 * shieldcn
 * lib/providers/github
 *
 * GitHub REST API client. Uses the token pool for distributed rate limiting.
 * Supports: stars, forks, watchers, branches, releases, tags, license,
 *           contributors, checks, issues, PRs, milestones, commits,
 *           last-commit, assets-dl, dependents, dependabot,
 *           followers, user-stars.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { pickToken, invalidateToken } from "../token-pool"
import { isBackedOff, recordBackoff, clearBackoff } from "../cache"

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function githubFetch(url: string, revalidate: number = 3600): Promise<Response | null> {
  if (isBackedOff("github")) return null

  try {
    const token = await pickToken()
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    const response = await fetch(url, { headers, next: { revalidate } })

    // Track rate limits
    if (response.status === 429 || response.status === 503) {
      recordBackoff("github")
      return null
    }

    if (response.status === 401 && token) {
      await invalidateToken(token)
      return fetch(url, {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate },
      })
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
  return r.json()
}

function link(owner: string, repo: string, path = ""): string {
  return `https://github.com/${owner}/${repo}${path}`
}

function relDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return "today"
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
  // GitHub returns Link header with last page for paginated endpoints
  const r = await githubFetch(`${url}?per_page=1`)
  if (!r) return null
  const linkHeader = r.headers.get("link")
  if (!linkHeader) {
    const data = await r.json()
    return Array.isArray(data) ? data.length : 0
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
    if (!stable) return null
    return { label: "release", value: stable.tag_name as string, color: "blue", link: stable.html_url as string }
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
  const q = `repo:${owner}/${repo} is:${isPR ? "pr" : "issue"} is:${state}`
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
  const state = states === "closed" ? "closed" : states === "open" ? "open" : "open"
  const q = `repo:${owner}/${repo} is:issue is:${state} label:"${label}"`
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
      const q = `repo:${owner}/${repo} is:pr is:merged`
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
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/milestones/${milestoneNumber}`)
  if (!d) return null
  const open = d.open_issues as number
  const closed = d.closed_issues as number
  const total = open + closed
  const pct = total > 0 ? Math.round((closed / total) * 100) : 0
  return { label: d.title as string, value: `${pct}%`, link: link(owner, repo, `/milestone/${milestoneNumber}`) }
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
  const branch = ref ? `?sha=${encodeURIComponent(ref)}` : ""
  const d = await githubJson(`https://api.github.com/repos/${owner}/${repo}/commits${branch}&per_page=1`.replace("&", "?").replace("??", "?"), 600)
  if (!d || !Array.isArray(d) || d.length === 0) return null
  const date = d[0].commit?.author?.date || d[0].commit?.committer?.date
  if (!date) return null
  return { label: "last commit", value: relDate(date), link: link(owner, repo, `/commits${ref ? `/${ref}` : ""}`) }
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
  const assets = d.assets as Record<string, unknown>[]
  if (!assets) return null
  const total = assets.reduce((sum: number, a) => sum + ((a.download_count as number) || 0), 0)
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
    if (!d || !Array.isArray(d) || d.length === 0) break
    for (const release of d) {
      const assets = release.assets as Record<string, unknown>[] | undefined
      if (assets) {
        for (const a of assets) {
          total += (a.download_count as number) || 0
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
  const assets = d.assets as Record<string, unknown>[] | undefined
  if (!assets) return null
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
  const assets = d.assets as Record<string, unknown>[] | undefined
  if (!assets) return null
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
    if (!d || !Array.isArray(d) || d.length === 0) break
    for (const release of d) {
      const assets = release.assets as Record<string, unknown>[] | undefined
      if (assets) {
        for (const a of assets) {
          if ((a.name as string) === assetName) {
            total += (a.download_count as number) || 0
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
  const assets = d.assets as Record<string, unknown>[] | undefined
  if (!assets) return null
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
  const assets = d.assets as Record<string, unknown>[] | undefined
  if (!assets) return null
  const asset = assets.find(a => (a.name as string) === assetName)
  if (!asset) return { label: `downloads@${tag} [${assetName}]`, value: "0", link: link(owner, repo, `/releases/tag/${tag}`) }
  const count = (asset.download_count as number) || 0
  return { label: `downloads@${tag} [${assetName}]`, value: formatCount(count), link: link(owner, repo, `/releases/tag/${tag}`) }
}

// ---------------------------------------------------------------------------
// Dependabot
// ---------------------------------------------------------------------------

export async function getGitHubDependabot(owner: string, repo: string): Promise<BadgeData | null> {
  // Check if dependabot.yml exists
  const r = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yml`)
  if (r) return { label: "dependabot", value: "enabled", color: "success" }

  const r2 = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/contents/.github/dependabot.yaml`)
  if (r2) return { label: "dependabot", value: "enabled", color: "success" }

  return { label: "dependabot", value: "not found", color: "cancelled" }
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
  const list = await repos.json() as Array<{ stargazers_count: number; fork: boolean }>
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
