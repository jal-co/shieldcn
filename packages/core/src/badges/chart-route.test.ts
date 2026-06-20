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

describe("handleBadgeGET /chart", () => {
  const realFetch = globalThis.fetch
  beforeEach(() => { globalThis.fetch = ghStub() as unknown as typeof fetch })
  afterEach(() => { globalThis.fetch = realFetch })

  it("renders a star-history SVG", async () => {
    const req = new Request("https://x.dev/chart/github/stars/vercel/next.js.svg?theme=blue")
    const res = await handleBadgeGET(req, ["chart", "github", "stars", "vercel", "next.js.svg"])
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg).toContain("vercel/next.js")
    expect(svg).not.toContain("NaN")
  })

  it("returns JSON time series for .json", async () => {
    const req = new Request("https://x.dev/chart/github/stars/vercel/next.js.json")
    const res = await handleBadgeGET(req, ["chart", "github", "stars", "vercel", "next.js.json"])
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.total).toBe(40)
    expect(Array.isArray(data.points)).toBe(true)
    expect(data.points.length).toBeGreaterThan(1)
  })

  it("shows a usage error for a malformed path", async () => {
    const req = new Request("https://x.dev/chart/github/stars.svg")
    const res = await handleBadgeGET(req, ["chart", "github", "stars.svg"])
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
})
