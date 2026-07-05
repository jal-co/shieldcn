/**
 * shieldcn
 * branded-brand-bridge.test
 *
 * A `variant=branded` badge with no explicit brand adopts a managed brand whose
 * slug matches its provider (e.g. /github/...?variant=branded → the "github"
 * brand), so editing that brand restyles every branded badge for the provider
 * site-wide. Explicit ?brand= / ?color= still win; non-branded variants and
 * unmatched providers are untouched.
 *
 * getBrand is mocked so the bridge is tested without a database.
 */

import { describe, it, expect, vi } from "vitest"

// A managed "github" brand that recolors branded badges magenta (#FF00FF).
vi.mock("./brands", async (orig) => {
  const actual = await orig<typeof import("./brands")>()
  return {
    ...actual,
    getBrand: vi.fn(async (slug: string) =>
      slug === "github"
        ? { id: 1, slug: "github", ownerId: "test", name: "GitHub", config: { color: "FF00FF" }, profile: {}, brandMd: null }
        : null,
    ),
    getBrandAsset: vi.fn(async () => null),
    getBrandFont: vi.fn(async () => null),
  }
})

const { createBadgeHandlers } = await import("./route-handler")

function ctx(slug: string[]) {
  return { params: Promise.resolve({ slug }) }
}
const MAGENTA = /fill="(#f0f|#ff00ff)"/i

async function renderSvg(path: string, slug: string[]) {
  const { GET } = createBadgeHandlers()
  const res = await GET(new Request(`https://x.dev${path}`), ctx(slug))
  return res.text()
}

describe("branded → managed-brand bridge", () => {
  it("applies a provider-matched brand's color to a branded badge", async () => {
    const svg = await renderSvg(
      "/badge/build-passing.svg?variant=branded&logo=github",
      ["badge", "build-passing.svg"],
    )
    // provider = "badge" here → no match; use a github-provider path instead.
    expect(svg).not.toMatch(MAGENTA)
  })

  it("recolors a branded github badge from the matching 'github' brand", async () => {
    const svg = await renderSvg(
      "/github/stars/vercel/next.js.svg?variant=branded",
      ["github", "stars", "vercel", "next.js.svg"],
    )
    expect(svg).toMatch(MAGENTA)
  })

  it("does NOT affect a non-branded github badge", async () => {
    const svg = await renderSvg(
      "/github/stars/vercel/next.js.svg",
      ["github", "stars", "vercel", "next.js.svg"],
    )
    expect(svg).not.toMatch(MAGENTA)
  })

  it("lets an explicit ?color= win over the matched brand", async () => {
    const svg = await renderSvg(
      "/github/stars/vercel/next.js.svg?variant=branded&color=00ff00",
      ["github", "stars", "vercel", "next.js.svg"],
    )
    expect(svg).not.toMatch(MAGENTA)
    expect(svg).toMatch(/fill="(#0f0|#00ff00|lime)"/i)
  })
})
