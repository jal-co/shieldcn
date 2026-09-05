import { readFileSync } from "node:fs"
import { isAbsolute, relative, resolve, sep } from "node:path"

function field(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) {
    throw new Error(`GitHub PR response is missing ${key}.`)
  }
  return Reflect.get(value, key)
}

function stringField(value: unknown, key: string): string {
  const result = field(value, key)
  if (typeof result !== "string") throw new Error(`GitHub PR response has an invalid ${key}.`)
  return result
}

export async function publishChartPullRequest(
  repository: string,
  token: string,
  paths: string[],
  message: string,
): Promise<{ committed: boolean; url: string }> {
  const [owner, repo, extra] = repository.split("/")
  if (!owner || !repo || extra) throw new Error("PR mode requires GITHUB_REPOSITORY in owner/repo format.")
  const treeEntries = paths.map(path => {
    const normalized = relative(process.cwd(), resolve(path))
    if (!normalized || isAbsolute(normalized) || normalized === ".." || normalized.startsWith(`..${sep}`)) {
      throw new Error("PR output paths must stay inside the checked-out repository.")
    }
    return {
      path: normalized.split(sep).join("/"),
      mode: "100644",
      type: "blob",
      content: readFileSync(path, "utf8"),
    }
  })
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  async function github(path: string, method = "GET", body?: unknown): Promise<unknown> {
    const response = await fetch(`${endpoint}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "shieldcn-starchart-action",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      const permissionHint = response.status === 403
        ? " PR mode needs contents: write, pull-requests: write, and permission for Actions to create pull requests in repository settings."
        : ""
      throw new Error(`GitHub PR request failed (${response.status}): ${method} ${path}.${permissionHint}`)
    }
    return response.json()
  }

  const baseBranch = stringField(await github(""), "default_branch")
  const branch = "chore/shieldcn-star-chart"
  if (baseBranch === branch) throw new Error("The chart PR branch must differ from the default branch.")
  const query = new URLSearchParams({ state: "open", head: `${owner}:${branch}`, base: baseBranch })
  const pulls = await github(`/pulls?${query}`)
  if (!Array.isArray(pulls)) throw new Error("GitHub returned an invalid pull request list.")
  const existingUrl = pulls.length ? stringField(pulls[0], "html_url") : undefined
  const refs = await github(`/git/matching-refs/heads/${branch}`)
  if (!Array.isArray(refs)) throw new Error("GitHub returned an invalid branch list.")
  const branchRef = refs.find(ref => stringField(ref, "ref") === `refs/heads/${branch}`)
  const branchSha = branchRef ? stringField(field(branchRef, "object"), "sha") : undefined
  if (existingUrl && !branchSha) throw new Error("The open chart PR branch is missing. Rerun after resolving the branch state.")
  const base = await github(`/git/ref/heads/${encodeURIComponent(baseBranch)}`)
  const baseSha = stringField(field(base, "object"), "sha")
  const sourceSha = existingUrl && branchSha ? branchSha : baseSha
  const source = await github(`/git/commits/${sourceSha}`)
  const sourceTree = stringField(field(source, "tree"), "sha")
  const tree = await github("/git/trees", "POST", {
    base_tree: sourceTree,
    tree: treeEntries,
  })
  const treeSha = stringField(tree, "sha")
  if (treeSha === sourceTree) {
    return { committed: false, url: existingUrl ?? "" }
  }

  const parents = branchSha && !existingUrl && branchSha !== sourceSha
    ? [branchSha, sourceSha]
    : [sourceSha]
  const commit = await github("/git/commits", "POST", {
    message: message === "chore: update star chart [skip ci]" ? "chore: update star chart" : message,
    tree: treeSha,
    parents,
    author: { name: "shieldcn[bot]", email: "shieldcn[bot]@users.noreply.github.com" },
  })
  const commitSha = stringField(commit, "sha")
  if (branchSha) {
    await github(`/git/refs/heads/${branch}`, "PATCH", { sha: commitSha, force: false })
  } else {
    await github("/git/refs", "POST", { ref: `refs/heads/${branch}`, sha: commitSha })
  }
  if (existingUrl) return { committed: true, url: existingUrl }

  const pull = await github("/pulls", "POST", {
    title: "chore: update star chart",
    head: branch,
    base: baseBranch,
    body: "Updates the generated star-history charts with the latest GitHub data.",
  })
  return { committed: true, url: stringField(pull, "html_url") }
}
