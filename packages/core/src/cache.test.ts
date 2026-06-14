/**
 * shieldcn
 * cache.test
 *
 * Covers the last-known-good ("stale on error") behavior that keeps GitHub
 * badges from collapsing into "not found" on a transient upstream failure.
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

  it("serves last-known-good when a later fetch fails", async () => {
    const key = freshKey()

    // Prime the stale store with a good value, using a tiny fresh TTL so the
    // fresh copy expires immediately but the stale copy survives.
    const good = await cachedFetchStale(
      "test", key,
      vi.fn().mockResolvedValue({ label: "stars", value: "325" }),
      0,        // fresh TTL: expire right away
      3600,     // stale TTL: keep last-known-good
    )
    expect(good).toEqual({ label: "stars", value: "325" })

    // Upstream now fails (returns null). We must still get the old value.
    const stale = await cachedFetchStale(
      "test", key,
      vi.fn().mockResolvedValue(null),
      0,
      3600,
    )
    expect(stale).toEqual({ label: "stars", value: "325" })
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

  it("invokes onStale only when it serves a last-known-good value, not on a fresh fetch", async () => {
    // Fresh success → onStale must NOT fire.
    const okKey = freshKey()
    let okStaleHits = 0
    const ok = await cachedFetchStale(
      "test", okKey,
      vi.fn().mockResolvedValue({ label: "stars", value: "1" }),
      300, 3600,
      { onStale: () => { okStaleHits++ } },
    )
    expect(ok).toEqual({ label: "stars", value: "1" })
    expect(okStaleHits).toBe(0)

    // Seed last-known-good directly (fresh store stays empty), then fail the
    // fetch → last-known-good is served → onStale fires exactly once.
    const key = freshKey()
    const staleKey = `shieldcn:test:stale:${key}`
    await cacheSet(staleKey, { label: "stars", value: "325" }, 3600)

    let staleHits = 0
    const stale = await cachedFetchStale(
      "test", key,
      vi.fn().mockResolvedValue(null),
      300, 3600,
      { onStale: () => { staleHits++ } },
    )
    expect(stale).toEqual({ label: "stars", value: "325" })
    expect(staleHits).toBe(1)
  })

  it("returns null when a fetch fails and there is no prior good value", async () => {
    const key = freshKey()
    const result = await cachedFetchStale(
      "test", key,
      vi.fn().mockResolvedValue(null),
    )
    expect(result).toBeNull()
  })

  it("treats a thrown error like a failed fetch (last-known-good or null)", async () => {
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

  it("fires a badge_unavailable alert when a fetch fails with no cached value", async () => {
    const alerts: ProviderAlert[] = []
    setProviderAlertCallback((a) => alerts.push(a))

    const result = await cachedFetchStale(
      "test", freshKey(),
      vi.fn().mockResolvedValue(null),
    )

    expect(result).toBeNull()
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({ provider: "test", reason: "badge_unavailable" })
  })

  it("does NOT alert when a stale value is available to serve", async () => {
    const key = freshKey()
    // Prime stale store, expire fresh immediately.
    await cachedFetchStale("test", key, vi.fn().mockResolvedValue({ label: "x", value: "1" }), 0, 3600)

    const alerts: ProviderAlert[] = []
    setProviderAlertCallback((a) => alerts.push(a))

    const result = await cachedFetchStale("test", key, vi.fn().mockResolvedValue(null), 0, 3600)

    expect(result).toEqual({ label: "x", value: "1" })
    expect(alerts).toHaveLength(0)
  })

  it("escalates a 'stale' alert when the last-known-good value served is very old", async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
      const key = freshKey()
      const staleKey = `shieldcn:test:stale:${key}`
      // Seed last-known-good "now"; fresh store stays empty so the fetch runs.
      // Long TTL keeps the entry alive (lru TTL uses performance.now, which the
      // fake Date clock doesn't advance) while its Date-based timestamp ages.
      await cacheSet(staleKey, { label: "x", value: "1" }, 7 * 24 * 3600)

      // 90 minutes pass with the upstream still broken.
      vi.setSystemTime(new Date("2026-01-01T01:30:00Z"))

      const alerts: ProviderAlert[] = []
      setProviderAlertCallback((a) => alerts.push(a))

      const stale = await cachedFetchStale(
        "test", key,
        vi.fn().mockResolvedValue(null),
        300, 7 * 24 * 3600,
      )
      expect(stale).toEqual({ label: "x", value: "1" })
      expect(alerts.filter((a) => a.reason === "stale")).toHaveLength(1)
      expect(alerts.find((a) => a.reason === "stale")).toMatchObject({ provider: "test" })
    } finally {
      vi.useRealTimers()
    }
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
