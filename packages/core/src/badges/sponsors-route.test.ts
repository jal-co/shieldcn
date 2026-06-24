/**
 * shieldcn
 * src/badges/sponsors-route.test
 *
 * End-to-end: handleBadgeGET routes /sponsors/{login} through the GitHub
 * Sponsors-list provider (GraphQL, mocked) and renders the avatar-grid SVG.
 * Avatar images are fetched and inlined as base64 data URIs (mocked, no
 * network).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handleBadgeGET } from "../route-handler"

// A 1x1 transparent PNG (smallest valid raster the inliner will accept).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

function sponsorNode(i: number) {
  return {
    __typename: "User",
    login: `sponsor${i}`,
    name: `Sponsor ${i}`,
    avatarUrl: `https://avatars.githubusercontent.com/u/${i}?s=160`,
    url: `https://github.com/sponsor${i}`,
  }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      // GitHub Sponsors-list GraphQL (the list query asks for `nodes`).
      if (url === "https://api.github.com/graphql" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { query: string; variables?: { login?: string } }
        const login = body.variables?.login ?? ""
        if (!body.query.includes("nodes")) {
          return new Response(JSON.stringify({ data: { repositoryOwner: null } }), { status: 200 })
        }
        const repositoryOwner =
          login === "jal-co"
            ? {
                __typename: "User",
                sponsors: {
                  totalCount: 5,
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [sponsorNode(1), sponsorNode(2), sponsorNode(3)],
                },
              }
            : login === "empty"
              ? {
                  __typename: "User",
                  sponsors: { totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] },
                }
              : null
        return new Response(JSON.stringify({ data: { repositoryOwner } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }

      // Avatar image fetches → small PNG.
      if (url.startsWith("https://avatars.githubusercontent.com/")) {
        return new Response(PNG_1x1, { status: 200, headers: { "content-type": "image/png" } })
      }

      return new Response("not found", { status: 404 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("handleBadgeGET /sponsors", () => {
  it("returns sponsor data as JSON", async () => {
    const req = new Request("https://x.dev/sponsors/jal-co.json")
    const res = await handleBadgeGET(req, ["sponsors", "jal-co.json"])
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      type: string
      login: string
      totalCount: number
      publicCount: number
      sponsors: { login: string }[]
    }
    expect(body.type).toBe("sponsors")
    expect(body.login).toBe("jal-co")
    expect(body.totalCount).toBe(5)
    expect(body.publicCount).toBe(3)
    expect(body.sponsors.map((s) => s.login)).toEqual(["sponsor1", "sponsor2", "sponsor3"])
  })

  it("strips a leading @ from the login (intuitive hand-written URLs)", async () => {
    // /sponsors/@jal-co.svg should resolve the same account as /sponsors/jal-co.
    const req = new Request("https://x.dev/sponsors/@jal-co.json")
    const res = await handleBadgeGET(req, ["sponsors", "@jal-co.json"])
    expect(res.status).toBe(200)
    const body = (await res.json()) as { login: string; publicCount: number }
    expect(body.login).toBe("jal-co")
    expect(body.publicCount).toBe(3)
  })

  it("renders an SVG grid with inlined avatar images", async () => {
    const req = new Request("https://x.dev/sponsors/jal-co.svg")
    const res = await handleBadgeGET(req, ["sponsors", "jal-co.svg"])
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    // Avatars inlined as base64 data URIs, not hot-linked.
    expect(svg).toContain("data:image/png;base64,")
    expect(svg).not.toContain("https://avatars.githubusercontent.com/")
    // Default title shown.
    expect(svg).toContain("Sponsors")
    // One <a> wrapper per rendered avatar.
    expect((svg.match(/<a href=/g) || []).length).toBe(3)
  })

  it("pins logins into a Special Sponsors tier via ?special=", async () => {
    const req = new Request("https://x.dev/sponsors/jal-co.svg?special=sponsor1")
    const res = await handleBadgeGET(req, ["sponsors", "jal-co.svg"])
    const svg = await res.text()
    expect(svg).toContain("Special Sponsors")
  })

  it("renders an empty-state message when there are no public sponsors", async () => {
    const req = new Request("https://x.dev/sponsors/empty.svg")
    const res = await handleBadgeGET(req, ["sponsors", "empty.svg"])
    expect(res.status).toBe(200)
    const svg = await res.text()
    expect(svg).toContain("No public sponsors")
    expect(svg).not.toContain("<a href=")
  })

  it("renders a card-shaped fallback (not a red badge pill) for an unknown account", async () => {
    const req = new Request("https://x.dev/sponsors/does-not-exist.svg")
    const res = await handleBadgeGET(req, ["sponsors", "does-not-exist.svg"])
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    // A large image element must degrade to the full sponsors card, never the
    // tiny destructive-red badge pill scaled up huge.
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg.toLowerCase()).not.toContain("#dc2626")
    expect(svg).toContain("No public sponsors to show")
    expect(svg).not.toContain("data:image/png")
  })
})
