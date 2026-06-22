/**
 * shieldcn
 * lib/providers/github.test
 *
 * Verifies the GitHub Sponsors provider against the GraphQL API:
 * `repositoryOwner(login:) { ...on Sponsorable { sponsors { totalCount } } }`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getGitHubSponsors } from "./github"
import { clearBackoff } from "../cache"

// login → { count, type }. A login absent from this map models a nonexistent
// account: GraphQL returns `repositoryOwner: null`.
const SPONSORS: Record<string, { count: number; type: "User" | "Organization" }> = {
  "jal-co": { count: 42, type: "User" },
  newbie: { count: 0, type: "User" },
  bigorg: { count: 1234, type: "Organization" },
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "https://api.github.com/graphql" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { variables?: { login?: string } }
        const login = body.variables?.login ?? ""
        // Transient/server failure path.
        if (login === "boom") return new Response("oops", { status: 500 })
        // GraphQL-level error: HTTP 200 with an `errors` array and null data.
        if (login === "gherror") {
          return new Response(JSON.stringify({ data: null, errors: [{ message: "boom" }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        }
        const entry = SPONSORS[login]
        const repositoryOwner = entry
          ? { __typename: entry.type, sponsors: { totalCount: entry.count } }
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
  // Don't leak a recorded rate-limit backoff into later tests.
  clearBackoff("github")
})

describe("GitHub Sponsors provider", () => {
  it("returns label, formatted count, and sponsor link for a sponsored user", async () => {
    const data = await getGitHubSponsors("jal-co")
    expect(data?.label).toBe("Sponsors")
    expect(data?.value).toBe("42")
    expect(data?.link).toBe("https://github.com/sponsors/jal-co")
  })

  it("shows 0 (not an error) for an account with no active sponsors", async () => {
    const data = await getGitHubSponsors("newbie")
    expect(data?.value).toBe("0")
    expect(data?.link).toBe("https://github.com/sponsors/newbie")
  })

  it("resolves organization accounts and formats large counts", async () => {
    const data = await getGitHubSponsors("bigorg")
    expect(data?.label).toBe("Sponsors")
    expect(data?.value).toBe("1.2k")
  })

  it("returns null for a nonexistent login (repositoryOwner: null)", async () => {
    expect(await getGitHubSponsors("ghost-user-xyz")).toBeNull()
  })

  it("returns null on a transient server failure", async () => {
    expect(await getGitHubSponsors("boom")).toBeNull()
  })

  it("returns null on a GraphQL-level error (HTTP 200 with errors)", async () => {
    expect(await getGitHubSponsors("gherror")).toBeNull()
  })

  it("backs off on a GraphQL rate limit (HTTP 200 + x-ratelimit-remaining: 0)", async () => {
    // GitHub signals a GraphQL *primary* rate limit as a 200 with no data and
    // x-ratelimit-remaining: 0 — REST-style 429/403 detection misses it.
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: null, errors: [{ type: "RATE_LIMITED" }] }), {
          status: 200,
          headers: { "content-type": "application/json", "x-ratelimit-remaining": "0" },
        }),
    )
    vi.stubGlobal("fetch", fetchMock)

    expect(await getGitHubSponsors("jal-co")).toBeNull()
    // Backoff must engage so the next call short-circuits without another fetch.
    expect(await getGitHubSponsors("jal-co")).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
