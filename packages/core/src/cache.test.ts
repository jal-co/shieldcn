/**
 * shieldcn
 * cache.test
 *
 * Covers the last-known-good ("stale on error") behavior that keeps badges
 * from collapsing into "not found" on a transient upstream failure.
 *
 * Contract under test (cachedFetchStale):
 *   - fetcher THROWS        → transient failure → serve last-known-good
 *   - fetcher returns null  → definitive negative → "not found" (no stale)
 *   - fetcher returns value → success (cached fresh + stale)
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import {
  cachedFetchStale,
  setProviderAlertCallback,
  recordBackoff,
  clearBackoff,
  cacheGet,
  cacheSet,
  type ProviderAlert,
} from "./cache"

// Unique key per case so the process-wide memory LRU doesn't bleed between tests.
let n = 0
const freshKey = () => `test-key-${Date.now()}-${n++}`

describe("cachedFetchStale", () => {
  it("returns the fetched value and serves it from cache on the next call", async () => {
    const key = freshKey()
    const fetcher = vi.fn().mockResolvedValue({ label: "stars", value: "325" })

    const first = await cachedFetchStale("test", key, fetcher)
    expect(first).toEqual({ label: "stars", value: "325" })
    expect(fetcher).toHaveBeenCalledTimes(1)

    // Second call hits the fresh cache — fetcher is not invoked again.
    const second = await cachedFetchStale("test", key, fetcher)
    expect(second).toEqual({ label: "stars", value: "325" })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("serves last-known-good when a later fetch fails transiently (throws)", async () => {
    const key = freshKey()
    const staleKey = `shieldcn:test:stale:${key}`
    // Seed the last-known-good store directly (fresh cache stays empty, so the
    // next call actually runs the fetcher rather than serving a fresh hit).
    await cacheSet(staleKey, { label: "stars", value: "325" }, 3600)

    // Upstream now fails transiently (throws). We must still get the old value.
    const stale = await cachedFetchStale(
      "test", key,
      vi.fn().mockRejectedValue(new Error("network")),
      300, 3600,
    )
    expect(stale).toEqual({ label: "stars", value: "325" })
  })

  it("a definitive negative (null) returns null and never serves stale", async () => {
    const key = freshKey()
    const staleKey = `shieldcn:test:stale:${key}`
    // A good value sits in the stale store...
    await cacheSet(staleKey, { label: "stars", value: "325" }, 3600)

    // ...but a definitive negative (the resource genuinely isn't there) must
    // surface as "not found", NOT as some unrelated last-known-good value.
    const result = await cachedFetchStale(
      "test", key,
      vi.fn().mockResolvedValue(null),
      300, 3600,
    )
    expect(result).toBeNull()
  })

  it("returns a terminal-error result but never persists it as last-known-good", async () => {
    const key = freshKey()
    const staleKey = `shieldcn:test:stale:${key}`
    const isError = (d: { error?: boolean }) => d.error === true

    // Seed the last-known-good store directly (fresh cache stays empty).
    await cacheSet(staleKey, { label: "stars", value: "325" }, 3600)

    // Upstream now returns a terminal error verdict ("invalid repository").
    const errVal = await cachedFetchStale(
      "test", key,
      vi.fn().mockResolvedValue({ label: "github", value: "invalid repository", error: true }),
      300, 3600, { isError },
    )
    // It is returned to the caller...
    expect(errVal).toMatchObject({ value: "invalid repository" })
    // ...but must NOT have overwritten the last-known-good value, so a repo
    // that recovers self-heals instead of being stuck on the error verdict.
    expect(await cacheGet(staleKey)).toEqual({ label: "stars", value: "325" })
  })

  it("returns null when a transient failure has no prior good value", async () => {
    const key = freshKey()
    const result = await cachedFetchStale(
      "test", key,
      vi.fn().mockRejectedValue(new Error("network")),
    )
    expect(result).toBeNull()
  })
})

describe("provider alerts", () => {
  afterEach(() => setProviderAlertCallback(null))

  it("fires a badge_unavailable alert on a transient failure with no cached value", async () => {
    const alerts: ProviderAlert[] = []
    setProviderAlertCallback((a) => alerts.push(a))

    const result = await cachedFetchStale(
      "test", freshKey(),
      vi.fn().mockRejectedValue(new Error("network")),
    )

    expect(result).toBeNull()
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ provider: "test", reason: "badge_unavailable" })
  })

  it("does NOT alert on a definitive negative (a genuine not-found)", async () => {
    const alerts: ProviderAlert[] = []
    setProviderAlertCallback((a) => alerts.push(a))

    // A typo'd package returning null must not alert-storm Sentry.
    const result = await cachedFetchStale(
      "test", freshKey(),
      vi.fn().mockResolvedValue(null),
    )

    expect(result).toBeNull()
    expect(alerts).toHaveLength(0)
  })

  it("does NOT alert when a stale value is available to serve", async () => {
    const key = freshKey()
    const staleKey = `shieldcn:test:stale:${key}`
    await cacheSet(staleKey, { label: "x", value: "1" }, 3600)

    const alerts: ProviderAlert[] = []
    setProviderAlertCallback((a) => alerts.push(a))

    const result = await cachedFetchStale("test", key, vi.fn().mockRejectedValue(new Error("network")), 300, 3600)

    expect(result).toEqual({ label: "x", value: "1" })
    expect(alerts).toHaveLength(0)
  })

  it("alerts any provider once per backoff cycle on a rate limit", async () => {
    const provider = `prov-${Date.now()}-${n++}`
    clearBackoff(provider)
    const alerts: ProviderAlert[] = []
    setProviderAlertCallback((a) => alerts.push(a))

    // First failure starts a backoff cycle → one alert with the status.
    recordBackoff(provider, 429)
    // Subsequent failures within the same active window must NOT re-alert.
    recordBackoff(provider, 429)
    recordBackoff(provider, 429)

    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ provider, reason: "rate_limit", status: 429 })

    clearBackoff(provider)
  })
})
