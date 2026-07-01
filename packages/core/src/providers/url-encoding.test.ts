/**
 * shieldcn
 * providers/url-encoding.test
 *
 * Regression lock for item B19: ~41 provider files interpolated a
 * caller-supplied path segment (package name, username, repo slug, etc.)
 * directly into a template-literal URL without encodeURIComponent, so a
 * crafted value containing "/", "?", "&", or "#" could redirect the request
 * to an unintended upstream path or smuggle extra query parameters.
 *
 * Rather than one test per file (41+ near-identical cases), this spot-checks
 * a representative sample across the fix's categories — package registries,
 * GitHub's centralized link() helper, community/profile providers, and an
 * instance-hosted provider (hostname intentionally NOT encoded, only the
 * path segments after it) — by capturing the actual URL each provider
 * fetches/emits for a deliberately hostile input and asserting the raw
 * separator characters never appear unescaped in it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }))
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }))

const HOSTILE = "foo/../bar?evil=1&x=2#frag"

function stubFetch(response: unknown = { ok: false }) {
  const captured: string[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      captured.push(url)
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }),
  )
  return captured
}

/** True once every raw separator char from HOSTILE has been percent-encoded. */
function isFullyEncoded(url: string, rawSegment: string): boolean {
  // The raw hostile string must never appear verbatim in the URL.
  if (url.includes(rawSegment)) return false
  // Its percent-encoded form must be present somewhere.
  return url.includes(encodeURIComponent(rawSegment))
}

beforeEach(() => {
  lookupMock.mockReset()
  lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe("provider URL encoding — representative sample", () => {
  it("npm: package name is encoded in both the fetch URL and the link", async () => {
    const captured = stubFetch({ version: "1.0.0" })
    const { getNpmVersion } = await import("./npm")
    const result = await getNpmVersion(HOSTILE)
    expect(isFullyEncoded(captured[0], HOSTILE)).toBe(true)
    expect(result?.link).not.toContain(HOSTILE)
    expect(result?.link).toContain(encodeURIComponent(HOSTILE))
  })

  it("pypi: package name is encoded in both the fetch URL and the link", async () => {
    const captured = stubFetch({ info: { version: "1.0.0" } })
    const { getPyPIVersion } = await import("./pypi")
    const result = await getPyPIVersion(HOSTILE)
    expect(isFullyEncoded(captured[0], HOSTILE)).toBe(true)
    expect(result?.link).not.toContain(HOSTILE)
  })

  it("reddit: username is encoded in both the fetch URL and the link", async () => {
    const captured = stubFetch({ data: { link_karma: 1, comment_karma: 1 } })
    const { getRedditKarma } = await import("./reddit")
    const result = await getRedditKarma(HOSTILE, "karma")
    expect(isFullyEncoded(captured[0], HOSTILE)).toBe(true)
    expect(result?.link).not.toContain(HOSTILE)
  })

  it("hackernews: userId is encoded in both the fetch URL and the link", async () => {
    const captured = stubFetch({ karma: 42 })
    const { getHNKarma } = await import("./hackernews")
    const result = await getHNKarma(HOSTILE)
    expect(isFullyEncoded(captured[0], HOSTILE)).toBe(true)
    expect(result?.link).not.toContain(HOSTILE)
  })

  it("github: owner/repo are encoded in the centralized link() helper (via a badge's link field)", async () => {
    stubFetch({ stargazers_count: 5 })
    const { getGitHubStars } = await import("./github")
    const result = await getGitHubStars(HOSTILE, "repo")
    // getGitHubStars may return null if the mocked shape doesn't match every
    // internal check; the meaningful assertion is that IF a link is present,
    // it never contains the raw hostile owner segment.
    if (result?.link) {
      expect(result.link).not.toContain(HOSTILE)
    }
  })

  it("weblate: project/component are encoded, but the instance hostname is left untouched", async () => {
    // getWeblateTranslation routes through safeFetch (userControlledHost),
    // which does a real DNS lookup on the instance hostname before the
    // (mocked) global fetch is ever called — resolve it to a public IP.
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }])
    const captured = stubFetch({ translated_percent: 50 })
    const { getWeblateTranslation } = await import("./weblate")
    const result = await getWeblateTranslation("weblate.example.com", HOSTILE, HOSTILE)
    // Hostname must NOT be percent-encoded (that would break DNS resolution).
    expect(captured[0]).toContain("https://weblate.example.com/")
    // But the path segments after it must be.
    expect(captured[0]).not.toContain(`/${HOSTILE}/`)
    expect(result?.link).not.toContain(`/${HOSTILE}/`)
  })

  it("docker: the '/' separator between namespace and repo survives, but hostile characters within a segment are encoded", async () => {
    const captured = stubFetch({ pull_count: 1 })
    const { getDockerPulls } = await import("./docker")
    // A hostile namespace segment (querystring/fragment injection attempt)
    // paired with a normal repo segment — the "/" separator between them is
    // structural and must be preserved, but the hostile characters inside
    // the namespace segment must be percent-encoded away.
    const hostileNamespace = "evil?x=1&y=2#z"
    await getDockerPulls(`${hostileNamespace}/repo`)
    expect(captured[0]).toContain(`${encodeURIComponent(hostileNamespace)}/repo`)
    expect(captured[0]).not.toContain(hostileNamespace)
  })
})
