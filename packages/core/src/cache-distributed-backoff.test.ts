/**
 * shieldcn
 * cache-distributed-backoff.test
 *
 * Backoff state used to live only in a per-instance in-memory Map, so under
 * N concurrent serverless instances a 429 recorded on one did nothing to
 * protect the others (see IMPROVEMENTS.md item B18). These tests simulate
 * two separate instances — via vi.resetModules() + a fresh dynamic import of
 * ./cache for each, so each gets its own private module-level backoff Map —
 * sharing one mocked Redis backing store, and verify state written by one
 * "instance" is visible to the other.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const { redisStore } = vi.hoisted(() => ({
  redisStore: new Map<string, { value: unknown; expiresAt: number }>(),
}))

vi.mock("@upstash/redis", () => {
  class FakeRedis {
    async get(key: string) {
      const entry = redisStore.get(key)
      if (!entry) return null
      if (Date.now() > entry.expiresAt) {
        redisStore.delete(key)
        return null
      }
      return entry.value
    }
    async set(key: string, value: unknown, opts?: { ex?: number }) {
      const ttlMs = (opts?.ex ?? 3600) * 1000
      redisStore.set(key, { value, expiresAt: Date.now() + ttlMs })
      return "OK"
    }
    async del(key: string) {
      redisStore.delete(key)
      return 1
    }
  }
  return { Redis: FakeRedis }
})

async function freshCacheInstance() {
  vi.resetModules()
  return import("./cache")
}

beforeEach(() => {
  redisStore.clear()
  process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.example.com"
  process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"
})

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  vi.resetModules()
})

describe("distributed backoff via Redis", () => {
  it("a backoff recorded by one instance is seen by a second instance", async () => {
    const instanceA = await freshCacheInstance()
    const instanceB = await freshCacheInstance()

    const provider = "cross-instance-test-provider"
    expect(await instanceB.isBackedOff(provider)).toBe(false)

    await instanceA.recordBackoff(provider, 429)

    // Instance B has never called recordBackoff itself — its own local Map
    // is empty — but it must still see the backoff via the shared Redis state.
    expect(await instanceB.isBackedOff(provider)).toBe(true)
  })

  it("clearing backoff on one instance clears the shared state for an instance that hasn't hydrated it yet", async () => {
    // Deliberate eventual-consistency tradeoff (documented on isBackedOff):
    // an instance that already hydrated a window from Redis trusts its local
    // copy for the rest of that window rather than re-checking Redis on
    // every call, so an early clear only reaches instances that read the
    // (now-cleared) state fresh — not ones that cached the old window.
    const instanceA = await freshCacheInstance()
    const instanceB = await freshCacheInstance()

    const provider = "cross-instance-clear-test"
    await instanceA.recordBackoff(provider, 503)
    await instanceA.clearBackoff(provider)

    // B never hydrated the (now-cleared) window, so its first read goes
    // straight to Redis and correctly finds nothing.
    expect(await instanceB.isBackedOff(provider)).toBe(false)
  })

  it("an instance that already hydrated a window keeps trusting it until it locally expires, even after another instance clears it", async () => {
    vi.useFakeTimers()
    try {
      const instanceA = await freshCacheInstance()
      const instanceB = await freshCacheInstance()

      const provider = "cross-instance-stale-hydration-test"
      await instanceA.recordBackoff(provider, 503) // ~15s window
      expect(await instanceB.isBackedOff(provider)).toBe(true) // B hydrates its local copy here

      await instanceA.clearBackoff(provider) // upstream recovered early; A clears Redis
      // B's local hydrated copy hasn't expired yet — it still reports backed off.
      expect(await instanceB.isBackedOff(provider)).toBe(true)

      vi.advanceTimersByTime(16_000) // past the ~15s window B hydrated
      expect(await instanceB.isBackedOff(provider)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("a second instance's recordBackoff does not re-alert within the same cycle another instance started", async () => {
    const instanceA = await freshCacheInstance()
    const instanceB = await freshCacheInstance()

    const provider = "cross-instance-alert-test"
    const alertsA: unknown[] = []
    const alertsB: unknown[] = []
    instanceA.setProviderAlertCallback((a) => alertsA.push(a))
    instanceB.setProviderAlertCallback((a) => alertsB.push(a))

    await instanceA.recordBackoff(provider, 429) // starts the cycle on A, alerts once
    await instanceB.recordBackoff(provider, 429) // same cycle, seen via Redis — must NOT alert again

    expect(alertsA).toHaveLength(1)
    expect(alertsB).toHaveLength(0)
  })

  it("falls back to memory-only behavior when Redis is not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN

    const instanceA = await freshCacheInstance()
    const instanceB = await freshCacheInstance()

    const provider = "no-redis-test-provider"
    await instanceA.recordBackoff(provider, 429)

    // No shared store configured — B genuinely can't see A's state.
    expect(await instanceB.isBackedOff(provider)).toBe(false)
    // But A itself still works locally.
    expect(await instanceA.isBackedOff(provider)).toBe(true)
  })
})
