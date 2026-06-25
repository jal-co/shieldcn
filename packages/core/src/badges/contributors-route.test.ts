/**
 * shieldcn
 * src/badges/contributors-route.test
 *
 * End-to-end: handleBadgeGET routes /contributors/{owner}/{repo} through the
 * GitHub REST contributors provider (mocked) and renders the avatar-grid SVG.
 * Avatar images are fetched and inlined as base64 data URIs (mocked, no
 * network).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handleBadgeGET } from "../route-handler"
import { getGitHubContributorsList } from "../providers/github"

// A 1x1 transparent PNG (smallest valid raster the inliner will accept).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
)

function contributorNode(i: number, contributions: number, type = "User", login = `dev${i}`) {
  return {
    login,
    avatar_url: `https://avatars.githubusercontent.com/u/${i}?v=4`,
    html_url: `https://github.com/${login}`,
    contributions,
    type,
  }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      // repoData / resolveRepo — the canonical owner/repo lookup.
      const repoMatch = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/?]+)$/)
      if (repoMatch) {
        const [, owner, repo] = repoMatch
        if (owner === "missing") return new Response("not found", { status: 404 })
        return new Response(JSON.stringify({ full_name: `${owner}/${repo}` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      // Contributors list.
      if (url.includes("/contributors?")) {
        if (url.includes("/empty/")) {
          return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } })
        }
        return new Response(
          JSON.stringify([
            contributorNode(1, 500),
            contributorNode(2, 300),
            contributorNode(3, 100),
            // A bot — excluded by default, included with ?bots=true.
            contributorNode(4, 250, "Bot", "renovate[bot]"),
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
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

describe("handleBadgeGET /contributors", () => {
  it("returns contributor data as JSON, ordered by contributions, bots excluded", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/acme/widgets.json"),
      ["contributors", "acme", "widgets.json"],
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      type: string
      owner: string
      repo: string
      contributors: { login: string; contributions: number }[]
    }
    expect(body.type).toBe("contributors")
    expect(body.owner).toBe("acme")
    expect(body.repo).toBe("widgets")
    // dev1, dev2, dev3 — the [bot] account is filtered out by default.
    expect(body.contributors.map((c) => c.login)).toEqual(["dev1", "dev2", "dev3"])
  })

  it("includes bots with ?bots=true", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/acme/bots.json?bots=true"),
      ["contributors", "acme", "bots.json"],
    )
    const body = (await res.json()) as { contributors: { login: string }[] }
    expect(body.contributors.map((c) => c.login)).toContain("renovate[bot]")
  })

  it("filters by minimum contributions with ?min=", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/acme/min.json?min=200"),
      ["contributors", "acme", "min.json"],
    )
    const body = (await res.json()) as { contributors: { login: string }[] }
    // dev3 (100) drops out; dev1 (500) and dev2 (300) remain.
    expect(body.contributors.map((c) => c.login)).toEqual(["dev1", "dev2"])
  })

  it("renders an SVG grid with inlined avatar images, each linked", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/acme/svg.svg"),
      ["contributors", "acme", "svg.svg"],
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg).toContain("data:image/png;base64,")
    expect(svg).not.toContain("https://avatars.githubusercontent.com/")
    // Default title shown + a labelled aria-label.
    expect(svg).toContain("Contributors")
    expect(svg).toContain('aria-label="Contributors — GitHub contributors"')
    // One <a> wrapper per rendered avatar (3 non-bot contributors).
    expect((svg.match(/<a href=/g) || []).length).toBe(3)
  })

  it("renders a card-shaped fallback (not a red badge pill) for a missing repo", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/missing/repo.svg"),
      ["contributors", "missing", "repo.svg"],
    )
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg.toLowerCase()).not.toContain("#dc2626")
    expect(svg).toContain("No contributors to show")
    expect(svg).not.toContain("data:image/png")
  })

  it("renders an empty-state message when the repo has no contributors", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/acme/empty.svg"),
      ["contributors", "acme", "empty.svg"],
    )
    expect(res.status).toBe(200)
    const svg = await res.text()
    expect(svg).toContain("No contributors")
    expect(svg).not.toContain("<a href=")
  })

  it("returns 400 JSON when owner/repo is missing", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/contributors/onlyowner.json"),
      ["contributors", "onlyowner.json"],
    )
    expect(res.status).toBe(400)
  })
})

describe("getGitHubContributorsList — transient-failure handling", () => {
  it("returns null (not an empty list) when page 1 body fails to parse", async () => {
    // The repo resolves, the contributors fetch is HTTP 200, but the body is a
    // truncated/malformed payload whose .json() throws. This must surface as a
    // miss (null) so the route serves last-known-good, never an empty card.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/?]+$/.test(url)) {
          return new Response(JSON.stringify({ full_name: "acme/widgets" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        }
        if (url.includes("/contributors?")) {
          // Valid HTTP response, invalid JSON body → r.json() rejects.
          return new Response("<<not json>>", {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        }
        return new Response("not found", { status: 404 })
      }),
    )
    const list = await getGitHubContributorsList("acme", "widgets")
    expect(list).toBeNull()
  })
})
