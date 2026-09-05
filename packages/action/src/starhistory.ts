import { fetchStarHistory } from "../../core/src/providers/github-star-history"

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
      "X-GitHub-Api-Version": "2026-03-10",
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

export async function getStarHistory(owner: string, repo: string, token: string) {
  const history = await fetchStarHistory(owner, repo, (url) =>
    ghFetch(url, token, "application/vnd.github+json"),
  )
  if (!history) throw new Error(`Could not load complete star history for ${owner}/${repo}`)
  return history
}
