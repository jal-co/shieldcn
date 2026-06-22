/**
 * shieldcn
 * src/badges/github-sponsors-route.test
 *
 * End-to-end: handleBadgeGET routes /github/sponsors/{login} through the
 * GitHub Sponsors provider (GraphQL, mocked) and renders the badge SVG.
 * Icon resolution uses the local `simple-icons` package (no network).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handleBadgeGET } from "../route-handler"

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.github.com/graphql" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { variables?: { login?: string } }
        const login = body.variables?.login ?? ""
        const repositoryOwner =
          login === "jal-co"
            ? { __typename: "User", sponsors: { totalCount: 42 } }
            : null
        return new Response(JSON.stringify({ data: { repositoryOwner } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      return new Response("not found", { status: 404 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("handleBadgeGET /github/sponsors", () => {
  it("routes a login to the Sponsors provider (label, count, link)", async () => {
    // Badge SVGs vectorize text into glyph paths, so assert the routed data
    // through the JSON format instead of scraping rendered text.
    const req = new Request("https://x.dev/github/sponsors/jal-co.json")
    const res = await handleBadgeGET(req, ["github", "sponsors", "jal-co.json"])
    expect(res.status).toBe(200)
    const body = (await res.json()) as { label: string; value: string; link?: string }
    expect(body.label).toBe("Sponsors")
    expect(body.value).toBe("42")
    expect(body.link).toBe("https://github.com/sponsors/jal-co")
  })

  it("renders an SVG badge (not an error) for a valid login", async () => {
    const req = new Request("https://x.dev/github/sponsors/jal-co.svg")
    const res = await handleBadgeGET(req, ["github", "sponsors", "jal-co.svg"])
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    // The destructive/error badge fills with #dc2626 — a routed success must not.
    expect(svg.toLowerCase()).not.toContain("#dc2626")
  })

  it("defaults to the branded GitHub Sponsors pink (#bf3989) with white text + heart", async () => {
    const req = new Request("https://x.dev/github/sponsors/jal-co.svg")
    const res = await handleBadgeGET(req, ["github", "sponsors", "jal-co.svg"])
    const svg = (await res.text()).toLowerCase()
    // Branded pink background, WCAG-AA with white foreground.
    expect(svg).toContain("#bf3989")
    expect(svg).toContain("#fff")
    // The low-contrast dark label (#18181b) must NOT be used on the pink.
    expect(svg).not.toContain("#18181b")
  })

  it("honors an explicit variant override (no forced pink)", async () => {
    const req = new Request("https://x.dev/github/sponsors/jal-co.svg?variant=outline")
    const res = await handleBadgeGET(req, ["github", "sponsors", "jal-co.svg"])
    const svg = (await res.text()).toLowerCase()
    expect(svg).not.toContain("#bf3989")
  })
})
