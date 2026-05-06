export interface GitHubRepo {
  /** Display name in `owner/repo` format (e.g. `"shadcn-ui/ui"`). */
  fullName: string
  /** Number of stars on the repository. */
  stars: number
  /** Number of forks. */
  forks: number
  /** Number of subscribers (people watching the repo). */
  watchers: number
  /** Number of open issues. */
  issues: number
}

/**
 * Fetch public metadata for a GitHub repository.
 *
 * - Uses the public GitHub REST API — no API key required.
 * - Optionally authenticates with `process.env.GITHUB_TOKEN` to raise
 *   the rate limit from 60 → 5 000 requests per hour.
 * - Caches the result for 1 hour via Next.js ISR (`next.revalidate`).
 *
 * Returns `null` if the request fails or the repo doesn't exist.
 */
export async function fetchGitHubRepo(
  owner: string,
  repo: string
): Promise<GitHubRepo | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 },
      }
    )
    if (!response.ok) return null
    const data = await response.json()
    if (
      typeof data.full_name !== "string" ||
      typeof data.stargazers_count !== "number"
    ) {
      return null
    }
    return {
      fullName: data.full_name,
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.subscribers_count,
      issues: data.open_issues_count,
    }
  } catch {
    return null
  }
}

/**
 * Format a number for compact display.
 *
 * - `236000` → `"236k"`
 * - `1500000` → `"1.5m"`
 * - `842` → `"842"`
 */
export function formatCount(count: number): string {
  if (count >= 1_000_000) {
    const value = count / 1_000_000
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`
  }
  if (count >= 1_000) {
    const value = count / 1_000
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`
  }
  return count.toLocaleString("en-US")
}

/** @deprecated Use `formatCount` instead. */
export const formatStarCount = formatCount

/**
 * Count how many public GitHub repos reference shieldcn badge URLs
 * in their code (typically README.md files).
 *
 * Uses the GitHub code search API. Requires authentication for
 * reliable results. Returns `null` on failure.
 */
export async function fetchShieldcnRepoCount(): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.github.com/search/code?q=shieldcn.com+extension:md&per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 },
      },
    )
    if (!response.ok) return null
    const data = await response.json()
    return typeof data.total_count === "number" ? data.total_count : null
  } catch {
    return null
  }
}
