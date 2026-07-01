/**
 * shieldcn
 * rate-limit.test
 *
 * No UPSTASH_REDIS_REST_URL/TOKEN are set in the test environment, so these
 * exercise the in-memory fallback path — the same path a self-hosted engine
 * without Redis configured runs in production.
 */

import { describe, it, expect, vi } from "vitest"
import { checkRateLimit, getClientIdentifier } from "./rate-limit"

let n = 0
const freshBucket = () => `test-bucket-${Date.now()}-${n++}`

describe("checkRateLimit", () => {
  it("allows requests under the limit", async () => {
    const bucket = freshBucket()
    const first = await checkRateLimit(bucket, "1.2.3.4", { max: 3, windowMs: 60_000 })
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)

    const second = await checkRateLimit(bucket, "1.2.3.4", { max: 3, windowMs: 60_000 })
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)
  })

  it("denies requests once the limit is exceeded within the window", async () => {
    const bucket = freshBucket()
    const opts = { max: 2, windowMs: 60_000 }
    await checkRateLimit(bucket, "5.5.5.5", opts)
    await checkRateLimit(bucket, "5.5.5.5", opts)
    const third = await checkRateLimit(bucket, "5.5.5.5", opts)
    expect(third.allowed).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it("still increments the counter on a denied request (no free probing)", async () => {
    const bucket = freshBucket()
    const opts = { max: 1, windowMs: 60_000 }
    await checkRateLimit(bucket, "9.9.9.9", opts)
    const denied1 = await checkRateLimit(bucket, "9.9.9.9", opts)
    const denied2 = await checkRateLimit(bucket, "9.9.9.9", opts)
    expect(denied1.allowed).toBe(false)
    expect(denied2.allowed).toBe(false)
  })

  it("keeps separate budgets per identifier within the same bucket", async () => {
    const bucket = freshBucket()
    const opts = { max: 1, windowMs: 60_000 }
    const a = await checkRateLimit(bucket, "1.1.1.1", opts)
    const b = await checkRateLimit(bucket, "2.2.2.2", opts)
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
  })

  it("keeps separate budgets per bucket for the same identifier", async () => {
    const opts = { max: 1, windowMs: 60_000 }
    const a = await checkRateLimit(freshBucket(), "3.3.3.3", opts)
    const b = await checkRateLimit(freshBucket(), "3.3.3.3", opts)
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
  })

  it("resets after the window elapses", async () => {
    vi.useFakeTimers()
    try {
      const bucket = freshBucket()
      const opts = { max: 1, windowMs: 1000 }
      const first = await checkRateLimit(bucket, "7.7.7.7", opts)
      expect(first.allowed).toBe(true)
      const blocked = await checkRateLimit(bucket, "7.7.7.7", opts)
      expect(blocked.allowed).toBe(false)

      vi.advanceTimersByTime(1001)

      const afterReset = await checkRateLimit(bucket, "7.7.7.7", opts)
      expect(afterReset.allowed).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe("getClientIdentifier", () => {
  it("uses the first address in x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    })
    expect(getClientIdentifier(req)).toBe("203.0.113.5")
  })

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "203.0.113.9" },
    })
    expect(getClientIdentifier(req)).toBe("203.0.113.9")
  })

  it("falls back to a constant 'unknown' when no proxy header is present", () => {
    const req = new Request("https://example.com")
    expect(getClientIdentifier(req)).toBe("unknown")
  })
})
