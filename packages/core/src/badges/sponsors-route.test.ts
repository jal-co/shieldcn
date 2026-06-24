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
import { parseFeaturedSponsors, parseSponsorsWall } from "../providers/github"

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

/**
 * Stub fetch for an account with 4 sponsors whose public page features
 * sponsor2 + sponsor4 (so special=[2,4], middle=[1,3]). Used by the
 * separator / tier-filter tests.
 */
function stubFeaturedFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.github.com/graphql" && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: {
              repositoryOwner: {
                __typename: "User",
                sponsors: {
                  totalCount: 4,
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [sponsorNode(1), sponsorNode(2), sponsorNode(3), sponsorNode(4)],
                },
              },
            },
          }),
          { status: 200 },
        )
      }
      if (url.startsWith("https://github.com/sponsors/")) {
        return new Response(
          `<h4>Featured sponsors</h4><img alt="@sponsor2"><img alt="@sponsor4"><h4>Current sponsors 4</h4>`,
          { status: 200, headers: { "content-type": "text/html" } },
        )
      }
      if (url.startsWith("https://avatars.githubusercontent.com/")) {
        return new Response(PNG_1x1, { status: 200, headers: { "content-type": "image/png" } })
      }
      return new Response("not found", { status: 404 })
    }),
  )
}

// Most tests exercise the GraphQL list path; that path is only attempted when a
// (potentially-scoped) token is configured, so set one for the suite.
const SAVED_TOK = process.env.SPONSORS_GITHUB_TOKEN
const SAVED_GH = process.env.GITHUB_TOKEN

beforeEach(() => {
  process.env.SPONSORS_GITHUB_TOKEN = "ghp_test"
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
  if (SAVED_TOK === undefined) delete process.env.SPONSORS_GITHUB_TOKEN
  else process.env.SPONSORS_GITHUB_TOKEN = SAVED_TOK
  if (SAVED_GH === undefined) delete process.env.GITHUB_TOKEN
  else process.env.GITHUB_TOKEN = SAVED_GH
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

  it("uses SPONSORS_GITHUB_TOKEN for the list query when set", async () => {
    // Listing sponsor nodes needs read:user, which the zero-scope pool lacks —
    // a dedicated maintainer token must be used for the GraphQL list call.
    const prev = process.env.SPONSORS_GITHUB_TOKEN
    process.env.SPONSORS_GITHUB_TOKEN = "ghp_override_token"
    let listAuth: string | null = null
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "https://api.github.com/graphql" && init?.method === "POST") {
          const headers = (init.headers ?? {}) as Record<string, string>
          const body = JSON.parse(String(init.body)) as { query: string }
          if (body.query.includes("nodes")) listAuth = headers.Authorization ?? null
          return new Response(
            JSON.stringify({
              data: {
                repositoryOwner: {
                  __typename: "User",
                  sponsors: { totalCount: 1, pageInfo: { hasNextPage: false, endCursor: null }, nodes: [sponsorNode(1)] },
                },
              },
            }),
            { status: 200 },
          )
        }
        if (url.startsWith("https://avatars.githubusercontent.com/")) {
          return new Response(PNG_1x1, { status: 200, headers: { "content-type": "image/png" } })
        }
        return new Response("not found", { status: 404 })
      }),
    )
    try {
      // Unique login so the list isn't served from another test's cache entry.
      const res = await handleBadgeGET(new Request("https://x.dev/sponsors/token-override-acct.json"), ["sponsors", "token-override-acct.json"])
      expect(res.status).toBe(200)
      expect(listAuth).toBe("Bearer ghp_override_token")
    } finally {
      if (prev === undefined) delete process.env.SPONSORS_GITHUB_TOKEN
      else process.env.SPONSORS_GITHUB_TOKEN = prev
    }
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

  it("falls back to scraping the public wall when no token is configured", async () => {
    // No scoped token → GraphQL is skipped → list comes from the public page.
    delete process.env.SPONSORS_GITHUB_TOKEN
    delete process.env.GITHUB_TOKEN
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("https://github.com/sponsors/")) {
          return new Response(
            `<h4>Current sponsors 2</h4>` +
              `<img src="https://avatars.githubusercontent.com/u/1?s=60&v=4" alt="@alice">` +
              `<img src="https://avatars.githubusercontent.com/u/2?s=60&v=4" alt="@bob">` +
              `<h4>Past sponsors</h4><img alt="@past1">`,
            { status: 200, headers: { "content-type": "text/html" } },
          )
        }
        if (url.startsWith("https://avatars.githubusercontent.com/")) {
          return new Response(PNG_1x1, { status: 200, headers: { "content-type": "image/png" } })
        }
        if (url === "https://api.github.com/graphql") throw new Error("GraphQL should not be called without a token")
        return new Response("not found", { status: 404 })
      }),
    )
    const json = (await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/htmlonly.json"), ["sponsors", "htmlonly.json"])
    ).json()) as { publicCount: number; sponsors: { login: string }[] }
    // Only the Current-sponsors wall (alice, bob) — not the past sponsor.
    expect(json.sponsors.map((s) => s.login)).toEqual(["alice", "bob"])
    expect(json.publicCount).toBe(2)
  })

  it("aligns the card title via ?titleAlign", async () => {
    stubFeaturedFetch()
    const left = await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/align1.svg"), ["sponsors", "align1.svg"])
    ).text()
    expect(left).toMatch(/<text[^>]*text-anchor="start"[^>]*font-size="26"/)
    const center = await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/align2.svg?titleAlign=center"), ["sponsors", "align2.svg"])
    ).text()
    expect(center).toMatch(/<text[^>]*text-anchor="middle"[^>]*font-size="26"/)
  })

  it("hides text tier headings with ?separator=line (avatars still render)", async () => {
    stubFeaturedFetch()
    const svg = await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/lineacct.svg?separator=line"), ["sponsors", "lineacct.svg"])
    ).text()
    expect(svg).not.toContain("Featured Sponsors")
    expect((svg.match(/<a href=/g) || []).length).toBe(4)
  })

  it("renders only the requested tiers with ?tiers=", async () => {
    stubFeaturedFetch()
    const svg = await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/tiersacct.svg?tiers=featured"), ["sponsors", "tiersacct.svg"])
    ).text()
    expect(svg).toContain("Featured Sponsors")
    // Only the featured tier (sponsor2 + sponsor4) renders — not the main grid.
    expect((svg.match(/<a href=/g) || []).length).toBe(2)
  })

  it("auto-populates a Featured Sponsors tier from the public sponsors page", async () => {
    // Unique login (avoids any cached list) whose public page features two of
    // its sponsors. No manual ?special= is passed.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "https://api.github.com/graphql" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              data: {
                repositoryOwner: {
                  __typename: "User",
                  sponsors: {
                    totalCount: 4,
                    pageInfo: { hasNextPage: false, endCursor: null },
                    nodes: [sponsorNode(1), sponsorNode(2), sponsorNode(3), sponsorNode(4)],
                  },
                },
              },
            }),
            { status: 200 },
          )
        }
        if (url.startsWith("https://github.com/sponsors/")) {
          return new Response(
            `<h4>Featured sponsors</h4><a href="/sponsor2"><img alt="@sponsor2"></a><a href="/sponsor4"><img alt="@sponsor4"></a><h4>Current sponsors 4</h4><img alt="@sponsor1">`,
            { status: 200, headers: { "content-type": "text/html" } },
          )
        }
        if (url.startsWith("https://avatars.githubusercontent.com/")) {
          return new Response(PNG_1x1, { status: 200, headers: { "content-type": "image/png" } })
        }
        return new Response("not found", { status: 404 })
      }),
    )

    const json = (await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/featuredacct.json"), ["sponsors", "featuredacct.json"])
    ).json()) as { featured: string[] }
    expect(json.featured).toEqual(["sponsor2", "sponsor4"])

    const svg = await (
      await handleBadgeGET(new Request("https://x.dev/sponsors/featuredacct.svg"), ["sponsors", "featuredacct.svg"])
    ).text()
    expect(svg).toContain("Featured Sponsors")
  })
})

describe("parseSponsorsWall", () => {
  it("parses the current-sponsors wall (login + sized avatar), self-excluded", () => {
    const html =
      `<img alt="@maintainer">` + // header avatar, before the section — ignored
      `<h4>Current sponsors 3</h4>` +
      `<img src="https://avatars.githubusercontent.com/u/1?s=60&v=4" alt="@alice">` +
      `<img src="https://avatars.githubusercontent.com/u/2?v=4" alt="@maintainer">` + // self — skipped
      `<img src="https://avatars.githubusercontent.com/u/3?s=60&v=4" alt="@bob">` +
      `<h4>Past sponsors</h4><img alt="@gone">`
    const list = parseSponsorsWall(html, "maintainer")
    expect(list.sponsors.map((s) => s.login)).toEqual(["alice", "bob"])
    expect(list.totalCount).toBe(2)
    // Avatar size bumped to 160 (added when missing, replaced when present).
    expect(list.sponsors[0].avatarUrl).toContain("s=160")
    expect(list.sponsors[1].avatarUrl).toContain("s=160")
  })

  it("returns an empty list when there is no current-sponsors section", () => {
    expect(parseSponsorsWall(`<h4>Past sponsors</h4><img alt="@x">`, "acme").sponsors).toEqual([])
  })
})

describe("parseFeaturedSponsors", () => {
  it("extracts featured logins, bounded to the section and self-excluded", () => {
    const html =
      `<h3>@acme's goal</h3><img alt="@acme">` +
      `<h4>Featured sponsors</h4>` +
      `<a href="/bigco"><img alt="@bigco"></a>` +
      `<a href="/acme"><img alt="@acme"></a>` + // maintainer's own avatar — skipped
      `<a href="/patron"><img alt="@Patron"></a>` + // case-normalized
      `<h4>Current sponsors 5</h4><img alt="@bigco"><img alt="@someoneelse">` +
      `<h4>Featured work</h4><img alt="@notasponsor">`
    expect(parseFeaturedSponsors(html, "acme")).toEqual(["bigco", "patron"])
  })

  it("returns [] when there is no featured-sponsors section", () => {
    expect(parseFeaturedSponsors(`<h4>Current sponsors</h4><img alt="@x">`, "acme")).toEqual([])
  })
})
