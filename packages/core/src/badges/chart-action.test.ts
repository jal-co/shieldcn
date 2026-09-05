import { mkdtempSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { publishChartPullRequest } from "../../../action/src/pull-request"
import { getStarHistory } from "../../../action/src/starhistory"

let directory: string
const calls: Array<{ path: string; method: string; body: Record<string, unknown> }> = []

function stubGitHub({ open = false, branch = false, unchanged = false, status = 200 } = {}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.pathname.replace("/repos/destination/repo", "")
    const method = init?.method ?? "GET"
    const body = JSON.parse(String(init?.body ?? "{}"))
    calls.push({ path, method, body })
    if (status !== 200) return Response.json({}, { status })
    if (path === "") return Response.json({ default_branch: "main" })
    if (path === "/pulls" && method === "GET") {
      expect(url.searchParams.get("head")).toBe("destination:chore/shieldcn-star-chart")
      return Response.json(open ? [{ html_url: "https://github.com/destination/repo/pull/42", head: { sha: "old" } }] : [])
    }
    if (path.startsWith("/git/matching-refs/")) return Response.json(branch ? [{ ref: "refs/heads/chore/shieldcn-star-chart", object: { sha: "old" } }] : [])
    if (path === "/git/ref/heads/main") return Response.json({ object: { sha: "base" } })
    if (path.startsWith("/git/commits/") && method === "GET") return Response.json({ tree: { sha: "source-tree" } })
    if (path === "/git/trees") return Response.json({ sha: unchanged ? "source-tree" : "new-tree" })
    if (path === "/git/commits") return Response.json({ sha: "new-commit" })
    if (path.startsWith("/git/refs")) return Response.json({})
    if (path === "/pulls" && method === "POST") return Response.json({ html_url: "https://github.com/destination/repo/pull/43" })
    throw new Error(`Unexpected GitHub request: ${method} ${path}`)
  })
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "shieldcn-action-"))
  writeFileSync(join(directory, "chart.svg"), "<svg></svg>")
  vi.spyOn(process, "cwd").mockReturnValue(directory)
  calls.length = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  rmSync(directory, { recursive: true, force: true })
})

const publish = () => publishChartPullRequest("destination/repo", "test-token", [join(directory, "chart.svg")], "chore: update star chart [skip ci]")

describe("starchart Action pull requests", () => {
  it("creates a chart-only commit on a new branch and opens a PR", async () => {
    const fetch = stubGitHub()
    vi.stubGlobal("fetch", fetch)
    expect(await publish()).toEqual({ committed: true, url: "https://github.com/destination/repo/pull/43" })
    expect(calls.find(call => call.path === "/git/trees")?.body).toEqual({
      base_tree: "source-tree",
      tree: [{ path: "chart.svg", mode: "100644", type: "blob", content: "<svg></svg>" }],
    })
    expect(calls.find(call => call.path === "/git/commits" && call.method === "POST")?.body).toMatchObject({ parents: ["base"], message: "chore: update star chart" })
    expect(calls.find(call => call.path === "/git/refs")?.body).toEqual({ ref: "refs/heads/chore/shieldcn-star-chart", sha: "new-commit" })
    expect(calls.find(call => call.path === "/pulls" && call.method === "POST")?.body).toMatchObject({ head: "chore/shieldcn-star-chart", base: "main" })
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer test-token" })
  })

  it("updates an existing PR without force or a duplicate PR", async () => {
    vi.stubGlobal("fetch", stubGitHub({ open: true, branch: true }))
    expect(await publish()).toEqual({ committed: true, url: "https://github.com/destination/repo/pull/42" })
    expect(calls.find(call => call.path === "/git/commits" && call.method === "POST")?.body.parents).toEqual(["old"])
    expect(calls.find(call => call.method === "PATCH")?.body).toEqual({ sha: "new-commit", force: false })
    expect(calls.some(call => call.path === "/pulls" && call.method === "POST")).toBe(false)
  })

  it("starts from the latest default branch after the previous PR closes", async () => {
    vi.stubGlobal("fetch", stubGitHub({ branch: true }))
    await publish()
    expect(calls.some(call => call.path === "/git/commits/base")).toBe(true)
    expect(calls.find(call => call.path === "/git/commits" && call.method === "POST")?.body.parents).toEqual(["old", "base"])
    expect(calls.find(call => call.method === "PATCH")?.body.force).toBe(false)
  })

  it.each([false, true])("does not commit unchanged charts with open PR = %s", async (open) => {
    vi.stubGlobal("fetch", stubGitHub({ open, branch: open, unchanged: true }))
    expect(await publish()).toEqual({ committed: false, url: open ? "https://github.com/destination/repo/pull/42" : "" })
    expect(calls.filter(call => call.method !== "GET").map(call => call.path)).toEqual(["/git/trees"])
  })

  it("explains missing workflow permissions without leaking the token", async () => {
    vi.stubGlobal("fetch", stubGitHub({ status: 403 }))
    await expect(publish()).rejects.toThrow("pull-requests: write")
    await expect(publish()).rejects.not.toThrow("test-token")
  })

  it("rejects output paths outside the checkout before any API call", async () => {
    const fetch = stubGitHub()
    vi.stubGlobal("fetch", fetch)
    await expect(publishChartPullRequest("destination/repo", "test-token", ["../outside.svg"], "update")).rejects.toThrow("inside the checked-out repository")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("fetches Action history with the new endpoint and API version", async () => {
    const fetch = vi.fn(async () => Response.json([{ week: 1609632000, total: 3, days: [3, 0, 0, 0, 0, 0, 0] }]))
    vi.stubGlobal("fetch", fetch)
    const result = await getStarHistory("public", "repo", "test-token")
    expect(result.total).toBe(3)
    expect(fetch).toHaveBeenCalledWith("https://api.github.com/repos/public/repo/stargazers/history?per_page=30&page=1", expect.objectContaining({
      headers: expect.objectContaining({ "X-GitHub-Api-Version": "2026-03-10", Authorization: "Bearer test-token" }),
    }))
  })
})
