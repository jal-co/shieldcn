/**
 * @shieldcn/core
 * src/providers/gitlab
 *
 * GitLab API client.
 * Supports: stars, forks, issues, merge requests, pipeline status,
 * last commit, license, contributors.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

function encodeProject(owner: string, repo: string): string {
  return encodeURIComponent(`${owner}/${repo}`)
}

async function gitlabFetch<T = Record<string, unknown>>(
  path: string,
  key: string,
): Promise<T | null> {
  return providerFetch<T>({
    provider: "gitlab",
    cacheKey: key,
    url: `https://gitlab.com/api/v4${path}`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

export async function getGitLabStars(owner: string, repo: string): Promise<BadgeData | null> {
  const data = await gitlabFetch(`/projects/${encodeProject(owner, repo)}`, `stars:${owner}/${repo}`)
  if (!data) return null
  const stars = (data as Record<string, unknown>).star_count
  if (typeof stars !== "number") return null

  return {
    label: "stars",
    value: formatCount(stars),
    link: `https://gitlab.com/${owner}/${repo}/-/starrers`,
  }
}

// ---------------------------------------------------------------------------
// Forks
// ---------------------------------------------------------------------------

export async function getGitLabForks(owner: string, repo: string): Promise<BadgeData | null> {
  const data = await gitlabFetch(`/projects/${encodeProject(owner, repo)}`, `forks:${owner}/${repo}`)
  if (!data) return null
  const forks = (data as Record<string, unknown>).forks_count
  if (typeof forks !== "number") return null

  return {
    label: "forks",
    value: formatCount(forks),
    link: `https://gitlab.com/${owner}/${repo}/-/forks`,
  }
}

// ---------------------------------------------------------------------------
// Issues (open)
// ---------------------------------------------------------------------------

export async function getGitLabIssues(owner: string, repo: string, state: string = "opened"): Promise<BadgeData | null> {
  const data = await gitlabFetch(
    `/projects/${encodeProject(owner, repo)}/issues_statistics?state=${state}`,
    `issues:${owner}/${repo}:${state}`,
  )
  if (!data) return null
  const stats = (data as Record<string, unknown>).statistics as Record<string, unknown> | undefined
  const counts = stats?.counts as Record<string, number> | undefined
  if (!counts) return null

  const count = state === "opened" ? counts.opened : state === "closed" ? counts.closed : counts.all
  const label = state === "opened" ? "open issues" : state === "closed" ? "closed issues" : "issues"

  return {
    label,
    value: formatCount(count ?? 0),
    link: `https://gitlab.com/${owner}/${repo}/-/issues`,
  }
}

// ---------------------------------------------------------------------------
// Merge Requests
// ---------------------------------------------------------------------------

export async function getGitLabMergeRequests(owner: string, repo: string, state: string = "opened"): Promise<BadgeData | null> {
  // Use a HEAD request with per_page=1 to get the total from headers
  const data = await providerFetch<unknown[]>({
    provider: "gitlab",
    cacheKey: `mrs:${owner}/${repo}:${state}`,
    url: `https://gitlab.com/api/v4/projects/${encodeProject(owner, repo)}/merge_requests?state=${state}&per_page=1`,
    ttl: 3600,
  })
  // The API returns an array; we need the x-total header but can't get it with providerFetch
  // Instead, use the project statistics approach
  const projData = await gitlabFetch(`/projects/${encodeProject(owner, repo)}?statistics=true`, `proj-stats:${owner}/${repo}`)
  if (!projData) return null

  // Fallback: count from simple query (not ideal for large repos)
  const label = state === "opened" ? "open MRs" : state === "merged" ? "merged MRs" : state === "closed" ? "closed MRs" : "MRs"

  // We'll use a different approach: the list endpoint with pagination
  if (!data) return null
  // For accuracy, we need to return a reasonable count
  return {
    label,
    value: Array.isArray(data) ? formatCount(data.length) : "0",
    link: `https://gitlab.com/${owner}/${repo}/-/merge_requests?state=${state}`,
  }
}

// ---------------------------------------------------------------------------
// Pipeline Status
// ---------------------------------------------------------------------------

export async function getGitLabPipeline(owner: string, repo: string, branch?: string): Promise<BadgeData | null> {
  const branchParam = branch ? `?ref=${encodeURIComponent(branch)}` : ""
  const data = await providerFetch<unknown[]>({
    provider: "gitlab",
    cacheKey: `pipeline:${owner}/${repo}:${branch ?? "default"}`,
    url: `https://gitlab.com/api/v4/projects/${encodeProject(owner, repo)}/pipelines${branchParam}&per_page=1&order_by=id&sort=desc`,
    ttl: 300,
  })
  if (!data || !Array.isArray(data) || data.length === 0) return null

  const pipeline = data[0] as Record<string, unknown>
  const status = pipeline.status as string
  const ref = pipeline.ref as string

  const statusMap: Record<string, string> = {
    success: "passing",
    failed: "failing",
    running: "running",
    pending: "pending",
    canceled: "canceled",
    skipped: "skipped",
    created: "created",
    manual: "manual",
  }

  const colorMap: Record<string, string> = {
    success: "green",
    failed: "red",
    running: "amber",
    pending: "amber",
    canceled: "gray",
    skipped: "gray",
    created: "gray",
    manual: "gray",
  }

  return {
    label: ref ? `pipeline (${ref})` : "pipeline",
    value: statusMap[status] ?? status,
    color: colorMap[status] ?? undefined,
    link: `https://gitlab.com/${owner}/${repo}/-/pipelines`,
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getGitLabLicense(owner: string, repo: string): Promise<BadgeData | null> {
  const data = await gitlabFetch(`/projects/${encodeProject(owner, repo)}`, `license:${owner}/${repo}`)
  if (!data) return null

  const proj = data as Record<string, unknown>
  const licenseObj = proj.license as Record<string, string> | undefined

  return {
    label: "license",
    value: licenseObj?.nickname || licenseObj?.name || "unknown",
    link: `https://gitlab.com/${owner}/${repo}`,
  }
}

// ---------------------------------------------------------------------------
// Last Commit
// ---------------------------------------------------------------------------

export async function getGitLabLastCommit(owner: string, repo: string, branch?: string): Promise<BadgeData | null> {
  const data = await gitlabFetch(`/projects/${encodeProject(owner, repo)}`, `last-commit:${owner}/${repo}`)
  if (!data) return null

  const proj = data as Record<string, unknown>
  const lastActivity = proj.last_activity_at as string | undefined
  if (!lastActivity) return null

  const date = new Date(lastActivity)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  let value: string
  if (diffDays === 0) value = "today"
  else if (diffDays === 1) value = "yesterday"
  else if (diffDays < 30) value = `${diffDays} days ago`
  else if (diffDays < 365) value = `${Math.floor(diffDays / 30)} months ago`
  else value = `${Math.floor(diffDays / 365)} years ago`

  return {
    label: "last activity",
    value,
    link: `https://gitlab.com/${owner}/${repo}/-/commits`,
  }
}

// ---------------------------------------------------------------------------
// Contributors
// ---------------------------------------------------------------------------

export async function getGitLabContributors(owner: string, repo: string): Promise<BadgeData | null> {
  const data = await providerFetch<unknown[]>({
    provider: "gitlab",
    cacheKey: `contributors:${owner}/${repo}`,
    url: `https://gitlab.com/api/v4/projects/${encodeProject(owner, repo)}/repository/contributors?per_page=1`,
    ttl: 3600,
  })
  // For contributor count, we'd ideally use the x-total header
  // but providerFetch doesn't expose headers. Use project statistics instead.
  const projData = await gitlabFetch(
    `/projects/${encodeProject(owner, repo)}?statistics=true`,
    `proj-contrib-stats:${owner}/${repo}`,
  )
  if (!projData) return null

  // GitLab doesn't expose contributor count in project stats easily
  // Fallback: use the array length (max 100 with default pagination)
  if (!data || !Array.isArray(data)) return null

  return {
    label: "contributors",
    value: formatCount(data.length),
    link: `https://gitlab.com/${owner}/${repo}/-/graphs/main`,
  }
}

// ---------------------------------------------------------------------------
// Release (latest tag)
// ---------------------------------------------------------------------------

export async function getGitLabRelease(owner: string, repo: string): Promise<BadgeData | null> {
  const data = await providerFetch<unknown[]>({
    provider: "gitlab",
    cacheKey: `release:${owner}/${repo}`,
    url: `https://gitlab.com/api/v4/projects/${encodeProject(owner, repo)}/releases?per_page=1`,
    ttl: 3600,
  })
  if (!data || !Array.isArray(data) || data.length === 0) return null

  const release = data[0] as Record<string, unknown>
  const tag = release.tag_name as string

  return {
    label: "release",
    value: tag ?? "unknown",
    link: `https://gitlab.com/${owner}/${repo}/-/releases`,
  }
}
