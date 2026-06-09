/**
 * shieldcn
 * cache.test
 *
 * Covers the last-known-good ("stale on error") behavior that keeps GitHub
 * badges from collapsing into "not found" on a transient upstream failure.
 */

import { describe, it, expect, vi } from "vitest"
import { cachedFetchStale } from "./cache"

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
