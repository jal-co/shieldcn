/**
 * shieldcn
 * src/badges/chart-route.test
 *
 * End-to-end: handleBadgeGET routes /chart/... through the star-history
 * provider and the chart renderer. GitHub is stubbed via global fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { handleBadgeGET } from "../route-handler"

function ghStub() {
  const stargazers = Array.from({ length: 40 }, (_, i) => ({
    starred_at: new Date(Date.UTC(2022, 0, 1) + i * 86400000).toISOString(),
  }))
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/stargazers")) {
      // Page 1 has data, later pages are empty.
      const page = Number(new URL(url).searchParams.get("page") || "1")
      const body = page === 1 ? stargazers : []
      return new Response(JSON.stringify(body), { status: 200 })
    }
    if (url.match(/\/repos\/[^/]+\/[^/]+$/)) {
      return new Response(JSON.stringify({ stargazers_count: 40 }), { status: 200 })
    }
    return new Response("[]", { status: 200 })
  })
}

/**
 * Stub the GitHub GraphQL API for commit-history charts: the first query asks
 * for `createdAt`, subsequent batched queries alias monthly
 * `contributionsCollection` windows (each gets a fixed count).
 */
function commitStub(createdAt: string, perWindow = 5) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === "https://api.github.com/graphql" && init?.method === "POST") {
      const query = JSON.parse(String(init.body)).query as string
      if (query.includes("contributionsCollection")) {
        const aliases = [...query.matchAll(/(w\d+):\s*contributionsCollection/g)].map((m) => m[1])
        const user: Record<string, unknown> = {}
        for (const a of aliases) user[a] = { totalCommitContributions: perWindow }
        return new Response(JSON.stringify({ data: { user } }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: { user: { createdAt } } }), { status: 200 })
    }
    return new Response("{}", { status: 200 })
  })
}

describe("handleBadgeGET /chart", () => {
  const realFetch = globalThis.fetch
  beforeEach(() => { globalThis.fetch = ghStub() as unknown as typeof fetch })
  afterEach(() => { globalThis.fetch = realFetch })

  it("renders a 100x1 transparent SVG for retired star-history charts", async () => {
    const req = new Request("https://x.dev/chart/github/stars/vercel/next.js.svg?theme=blue")
    const res = await handleBadgeGET(req, ["chart", "github", "stars", "vercel", "next.js.svg"])
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg).toContain('width="100"')
    expect(svg).toContain('height="1"')
    expect(svg).not.toContain("vercel/next.js")
  })

  it("returns 410 JSON for retired star-history .json", async () => {
    const req = new Request("https://x.dev/chart/github/stars/vercel/next.js.json")
    const res = await handleBadgeGET(req, ["chart", "github", "stars", "vercel", "next.js.json"])
    expect(res.status).toBe(410)
    const data = await res.json()
    expect(data.error).toContain("no longer available")
  })

  it("shows a usage error for a malformed issues path", async () => {
    const req = new Request("https://x.dev/chart/github/issues.svg")
    const res = await handleBadgeGET(req, ["chart", "github", "issues.svg"])
    const svg = await res.text()
    expect(svg).toContain("usage:")
  })

  it("renders an inline JSON chart from ?values=", async () => {
    const req = new Request("https://x.dev/chart/json.svg?values=10,25,40,30,60&title=Latency&label=ms")
    const res = await handleBadgeGET(req, ["chart", "json.svg"])
    expect(res.status).toBe(200)
    const svg = await res.text()
    expect(svg).toContain("Latency")
    expect(svg).not.toContain("NaN")
  })

  it("returns inline JSON points for .json", async () => {
    const req = new Request("https://x.dev/chart/json.json?values=5,10,15")
    const res = await handleBadgeGET(req, ["chart", "json.json"])
    const data = await res.json()
    expect(data.points.map((p: { value: number }) => p.value)).toEqual([5, 10, 15])
  })

  it("renders a lifetime commit-history SVG for one user", async () => {
    globalThis.fetch = commitStub("2024-01-01T00:00:00Z") as unknown as typeof fetch
    const req = new Request("https://x.dev/chart/github/commits/torvalds.svg?theme=green")
    const res = await handleBadgeGET(req, ["chart", "github", "commits", "torvalds.svg"])
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg).toContain("torvalds")
    expect(svg).toContain("commits")
    expect(svg).not.toContain("NaN")
  })

  it("returns a cumulative commit series for .json", async () => {
    globalThis.fetch = commitStub("2024-01-01T00:00:00Z") as unknown as typeof fetch
    const req = new Request("https://x.dev/chart/github/commits/octocat.json")
    const res = await handleBadgeGET(req, ["chart", "github", "commits", "octocat.json"])
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.login).toBe("octocat")
    expect(data.total).toBeGreaterThan(0)
    expect(Array.isArray(data.points)).toBe(true)
    // Cumulative: the last point is the grand total, the first is the birth (0).
    expect(data.points[0].value).toBe(0)
    expect(data.points[data.points.length - 1].value).toBe(data.total)
  })

  it("compares several users on one chart", async () => {
    globalThis.fetch = commitStub("2024-06-01T00:00:00Z") as unknown as typeof fetch
    const req = new Request("https://x.dev/chart/github/commits/torvalds,gaearon.svg")
    const res = await handleBadgeGET(req, ["chart", "github", "commits", "torvalds,gaearon.svg"])
    expect(res.status).toBe(200)
    const svg = await res.text()
    expect(svg).toContain("torvalds")
    expect(svg).toContain("gaearon")
  })

  it("supports aligned mode", async () => {
    globalThis.fetch = commitStub("2024-01-01T00:00:00Z") as unknown as typeof fetch
    const req = new Request("https://x.dev/chart/github/commits/sindresorhus.svg?align=true")
    const res = await handleBadgeGET(req, ["chart", "github", "commits", "sindresorhus.svg"])
    expect(res.status).toBe(200)
    const svg = await res.text()
    expect(svg).toContain("aligned")
    expect(svg).not.toContain("NaN")
  })
})
