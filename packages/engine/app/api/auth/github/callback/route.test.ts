/**
 * @shieldcn/engine
 * GET /api/auth/github/callback — test
 *
 * The token pool only ever holds zero-scope (read-only, public-data)
 * tokens; every guard in this route exists to keep it that way. Highest
 * blast radius: the CSRF state check (a mismatched/missing state lets an
 * attacker's OAuth code get bound to the victim's session) and the
 * `scoped_token` rejection (the authorize URL is user-visible and
 * tamperable, so what GitHub actually granted has to be re-checked here,
 * not trusted from the request). `next/headers` and `next/navigation` are
 * mocked since their real implementations need an active Next.js request
 * context that doesn't exist when the route is imported directly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const cookieStore = new Map<string, string>()
const deletedCookies: string[] = []
const redirectMock = vi.fn((path: string) => {
  throw new RedirectSignal(path)
})

class RedirectSignal extends Error {
  path: string
  constructor(path: string) {
    super("NEXT_REDIRECT")
    this.path = path
  }
}

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name)! } : undefined),
    delete: (name: string) => {
      deletedCookies.push(name)
      cookieStore.delete(name)
    },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

const addTokenMock = vi.fn()
vi.mock("@shieldcn/core/token-pool", () => ({
  addToken: addTokenMock,
}))

const ORIGINAL_ENV = { ...process.env }

function req(query: Record<string, string>): Request {
  const url = new URL("https://engine.shieldcn.dev/api/auth/github/callback")
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  return new Request(url)
}

describe("GET /api/auth/github/callback", () => {
  beforeEach(() => {
    cookieStore.clear()
    deletedCookies.length = 0
    redirectMock.mockClear()
    addTokenMock.mockReset()
    vi.unstubAllGlobals()
    process.env.GITHUB_OAUTH_CLIENT_ID = "test-client-id"
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "test-client-secret"
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.unstubAllGlobals()
  })

  it("rejects when no code is present", async () => {
    const { GET } = await import("./route")
    const res = await GET(req({ state: "s1" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "no_code" })
  })

  it("rejects when state is missing entirely (no saved cookie, no query state)", async () => {
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_state" })
  })

  it("rejects when the query state doesn't match the saved cookie (CSRF guard)", async () => {
    cookieStore.set("oauth_state", "expected-state")
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "attacker-supplied-state" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_state" })
  })

  it("always deletes the oauth_state cookie once read, even on failure (single-use CSRF token)", async () => {
    cookieStore.set("oauth_state", "s1")
    const { GET } = await import("./route")
    await GET(req({ code: "c1", state: "wrong" }))
    expect(deletedCookies).toContain("oauth_state")
  })

  it("rejects when a saved state exists but the query has none", async () => {
    cookieStore.set("oauth_state", "s1")
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "invalid_state" })
  })

  it("returns 503 when OAuth isn't configured", async () => {
    delete process.env.GITHUB_OAUTH_CLIENT_ID
    cookieStore.set("oauth_state", "s1")
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: "not_configured" })
  })

  it("returns 502 when the token exchange request itself fails (non-ok)", async () => {
    cookieStore.set("oauth_state", "s1")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })))
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "token_exchange_failed" })
  })

  it("surfaces GitHub's own error verdict when the exchange succeeds but grants no token", async () => {
    cookieStore.set("oauth_state", "s1")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "bad_verification_code" }), { status: 200 })),
    )
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "bad_verification_code" })
  })

  it("rejects a scoped token — the pool must only ever hold zero-scope tokens", async () => {
    cookieStore.set("oauth_state", "s1")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ access_token: "gho_xyz", scope: "repo" }), { status: 200 }),
      ),
    )
    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "scoped_token" })
    expect(addTokenMock).not.toHaveBeenCalled()
  })

  it("accepts an explicitly empty scope string as zero-scope", async () => {
    cookieStore.set("oauth_state", "s1")
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "gho_xyz", scope: "" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ login: "octocat" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    addTokenMock.mockResolvedValue(undefined)

    const { GET } = await import("./route")
    await expect(GET(req({ code: "c1", state: "s1" }))).rejects.toThrow(RedirectSignal)
    expect(addTokenMock).toHaveBeenCalledWith("octocat", "gho_xyz")
  })

  it("returns 502 when fetching the GitHub user fails", async () => {
    cookieStore.set("oauth_state", "s1")
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "gho_xyz" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("", { status: 401 }))
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: "user_fetch_failed" })
  })

  it("returns 400 when the user response has no login", async () => {
    cookieStore.set("oauth_state", "s1")
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "gho_xyz" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "no_user" })
  })

  it("returns 500 when the pool write itself fails, without crashing the route", async () => {
    cookieStore.set("oauth_state", "s1")
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "gho_xyz" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ login: "octocat" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    addTokenMock.mockRejectedValue(new Error("db unreachable"))

    const { GET } = await import("./route")
    const res = await GET(req({ code: "c1", state: "s1" }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "db_store_failed" })
  })

  it("on the full happy path: stores the token and redirects home", async () => {
    cookieStore.set("oauth_state", "s1")
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "gho_xyz" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ login: "octocat" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    addTokenMock.mockResolvedValue(undefined)

    const { GET } = await import("./route")
    await expect(GET(req({ code: "c1", state: "s1" }))).rejects.toThrow(RedirectSignal)
    expect(addTokenMock).toHaveBeenCalledWith("octocat", "gho_xyz")
    expect(redirectMock).toHaveBeenCalledWith("/")
  })
})
