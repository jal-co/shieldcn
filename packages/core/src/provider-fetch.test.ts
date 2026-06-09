/**
 * shieldcn
 * provider-fetch.test
 *
 * Locks the resilience contract shared by every API-backed provider:
 *   - a transient upstream status (429 / 5xx) serves the last-known-good value
 *   - a definitive negative (e.g. 404) surfaces "not found" (null), never stale
 *   - a healthy 2xx returns parsed data
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { providerFetch } from "./provider-fetch"
import { cacheSet, clearBackoff } from "./cache"

let n = 0
const uniq = () => `pf-${Date.now()}-${n++}`

function mockResponse(status: number, body: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Map<string, string>(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("providerFetch resilience", () => {
  it("serves last-known-good on a transient 5xx instead of breaking", async () => {
    const provider = uniq()
    const key = "pkg:react"
    clearBackoff(provider)
    // Seed the last-known-good store directly.
    await cacheSet(`shieldcn:${provider}:stale:${key}`, { version: "18.0.0" }, 3600)

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(503)))

    const data = await providerFetch({ provider, cacheKey: key, url: "https://x" })
    expect(data).toEqual({ version: "18.0.0" })
    clearBackoff(provider)
  })

  it("returns null (not stale) on a definitive 404", async () => {
    const provider = uniq()
    const key = "pkg:does-not-exist"
    clearBackoff(provider)
    // Even with a stale value present, a genuine 404 must surface as not-found.
    await cacheSet(`shieldcn:${provider}:stale:${key}`, { version: "1.0.0" }, 3600)

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(404)))

    const data = await providerFetch({ provider, cacheKey: key, url: "https://x" })
    expect(data).toBeNull()
  })

  it("returns parsed data on a healthy 2xx", async () => {
    const provider = uniq()
    clearBackoff(provider)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, { version: "19.0.0" })))

    const data = await providerFetch({ provider, cacheKey: "pkg:next", url: "https://x" })
    expect(data).toEqual({ version: "19.0.0" })
    clearBackoff(provider)
  })
})
