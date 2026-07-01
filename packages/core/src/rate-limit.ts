/**
 * shieldcn
 * src/rate-limit
 *
 * Lightweight rate limiter for public write endpoints (memo PUT, gen-count
 * POST, PR-creating routes). None of these had any rate limiting before —
 * they're unauthenticated (or, for memo, authenticated only by a
 * caller-supplied bearer token with no throttling) and can be hit directly,
 * not just through a badge render.
 *
 * Redis-backed (shared across serverless instances) when Upstash is
 * configured — reusing the same env vars as the badge cache — so a limit
 * actually holds across concurrent Vercel lambdas. Falls back to an
 * in-memory per-process fixed window otherwise: good enough for a
 * single-process self-hosted engine, best-effort on serverless without Redis
 * configured (each instance gets its own budget rather than a shared one).
 */

import { Redis } from "@upstash/redis"

let redis: Redis | null | undefined

function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

export interface RateLimitResult {
  allowed: boolean
  /** Requests remaining in the current window (never negative). */
  remaining: number
  /** Milliseconds until the current window resets. */
  resetMs: number
}

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  max: number
  /** Window size in milliseconds. */
  windowMs: number
}

interface MemoryBucket {
  count: number
  resetAt: number
}

const memoryBuckets = new Map<string, MemoryBucket>()

/** Fraction of in-memory checks that also sweep expired buckets. */
const CLEANUP_PROBABILITY = 0.01

function pruneMemoryBuckets(now: number) {
  for (const [key, bucket] of memoryBuckets) {
    if (now >= bucket.resetAt) memoryBuckets.delete(key)
  }
}

function checkMemory(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  if (Math.random() < CLEANUP_PROBABILITY) pruneMemoryBuckets(now)

  const existing = memoryBuckets.get(key)
  if (!existing || now >= existing.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.max - 1, resetMs: opts.windowMs }
  }
  existing.count += 1
  return {
    allowed: existing.count <= opts.max,
    remaining: Math.max(0, opts.max - existing.count),
    resetMs: existing.resetAt - now,
  }
}

/**
 * Fixed-window rate limit check for `${bucket}:${identifier}`. A denied
 * request still increments the counter (so a client can't tell "denied"
 * from "free" and probe around the limit).
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const key = `shieldcn:ratelimit:${bucket}:${identifier}`
  const r = getRedis()

  if (r) {
    try {
      const windowId = Math.floor(Date.now() / opts.windowMs)
      const windowKey = `${key}:${windowId}`
      const count = await r.incr(windowKey)
      if (count === 1) {
        await r.expire(windowKey, Math.ceil(opts.windowMs / 1000))
      }
      const resetMs = opts.windowMs - (Date.now() % opts.windowMs)
      return { allowed: count <= opts.max, remaining: Math.max(0, opts.max - count), resetMs }
    } catch {
      // Redis unavailable — fall through to the in-memory limiter rather
      // than blocking legitimate traffic on an infra hiccup.
    }
  }

  return checkMemory(key, opts)
}

/**
 * Best-effort client identifier from standard proxy headers (Vercel, nginx,
 * Docker behind a reverse proxy). Falls back to a constant "unknown" bucket
 * shared by all such traffic — a missing/stripped header can't be used to
 * bypass the limit, it just means that traffic shares one budget.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get("x-real-ip")
  if (real) return real.trim()
  return "unknown"
}
