/**
 * shieldcn
 * lib/cache
 *
 * Two-tier caching layer for provider responses.
 *
 * Tier 1: In-memory LRU cache (fast, dies on cold start)
 * Tier 2: Upstash Redis (persistent across invocations, optional)
 *
 * If UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
 * both tiers are used. Otherwise falls back to memory-only.
 *
 * Also handles per-provider backoff when upstreams return 429/503.
 */

import { LRUCache } from "lru-cache"
import { Redis } from "@upstash/redis"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CachedValue<T> {
  data: T
  ts: number // timestamp when cached
}

// ---------------------------------------------------------------------------
// In-memory LRU (Tier 1)
// ---------------------------------------------------------------------------

const memoryCache = new LRUCache<string, CachedValue<unknown>>({
  max: 2000,          // max entries
  ttl: 1000 * 60 * 5, // 5 min default TTL
})

// ---------------------------------------------------------------------------
// Upstash Redis (Tier 2, optional)
// ---------------------------------------------------------------------------

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// ---------------------------------------------------------------------------
// Provider backoff tracking
// ---------------------------------------------------------------------------

interface BackoffState {
  until: number   // don't hit this provider until this timestamp
  count: number   // consecutive failures
}

const backoff = new Map<string, BackoffState>()

/** Max backoff: 5 minutes */
const MAX_BACKOFF_MS = 5 * 60 * 1000

/**
 * Check if a provider is currently in backoff.
 */
export function isBackedOff(provider: string): boolean {
  const state = backoff.get(provider)
  if (!state) return false
  if (Date.now() >= state.until) {
    backoff.delete(provider)
    return false
  }
  return true
}

/**
 * Record a rate limit or server error for a provider.
 * Applies exponential backoff: 15s, 30s, 60s, 120s, 300s.
 *
 * Also surfaces a provider alert (Sentry issue) on the request that *starts*
 * a backoff cycle — when there is no active backoff window. Subsequent
 * blocked requests within the same window don't re-alert, so this stays
 * roughly one alert per outage rather than one per request. This is the
 * single chokepoint every provider funnels rate limits / 5xx through (via
 * githubFetch, handleUpstreamStatus, or provider-fetch), so adding it here
 * gives every provider rate-limit alerting, not just GitHub.
 *
 * @param provider - provider name (e.g. "github", "npm")
 * @param status - upstream HTTP status that triggered the backoff, if known
 */
export function recordBackoff(provider: string, status?: number): void {
  const state = backoff.get(provider)
  // A new cycle = no backoff state, or the previous window has elapsed.
  const newCycle = !state || Date.now() >= state.until
  const count = (state?.count ?? 0) + 1
  const delay = Math.min(15000 * Math.pow(2, count - 1), MAX_BACKOFF_MS)
  backoff.set(provider, {
    until: Date.now() + delay,
    count,
  })

  if (newCycle) {
    reportProviderAlert({
      provider,
      reason: status === 503 ? "unavailable" : "rate_limit",
      status,
      message: status === 503
        ? `${provider} API unavailable (503)`
        : status
          ? `${provider} API rate limited (${status})`
          : `${provider} API rate limited`,
    })
  }
}

/**
 * Clear backoff for a provider (on successful request).
 */
export function clearBackoff(provider: string): void {
  backoff.delete(provider)
}

// ---------------------------------------------------------------------------
// Per-provider rate limit budgets
// ---------------------------------------------------------------------------

interface RateBudget {
  tokens: number       // current tokens available
  max: number          // max tokens
  refillRate: number   // tokens per second
  lastRefill: number   // last refill timestamp
}

const budgets = new Map<string, RateBudget>()

/**
 * Default rate budgets per provider.
 * These are conservative estimates to stay well under upstream limits.
 * Providers not listed here have no budget (unlimited).
 */
const PROVIDER_BUDGETS: Record<string, { max: number; refillRate: number }> = {
  npm:           { max: 50, refillRate: 5 },      // npm is generous but let's be safe
  pypi:          { max: 30, refillRate: 3 },
  discord:       { max: 20, refillRate: 2 },
  docker:        { max: 30, refillRate: 3 },
  bluesky:       { max: 30, refillRate: 3 },
  youtube:       { max: 10, refillRate: 1 },      // YouTube API is strict
  reddit:        { max: 20, refillRate: 2 },
  crates:        { max: 30, refillRate: 3 },
  homebrew:      { max: 30, refillRate: 3 },
  packagist:     { max: 30, refillRate: 3 },
  rubygems:      { max: 30, refillRate: 3 },
  nuget:         { max: 30, refillRate: 3 },
  pub:           { max: 30, refillRate: 3 },
  mastodon:      { max: 20, refillRate: 2 },
  lemmy:         { max: 20, refillRate: 2 },
  hackernews:    { max: 20, refillRate: 2 },
  opencollective:{ max: 20, refillRate: 2 },
  vscode:        { max: 20, refillRate: 2 },
  codecov:       { max: 20, refillRate: 2 },
  wakatime:      { max: 10, refillRate: 1 },
  bundlephobia:  { max: 20, refillRate: 2 },
  cocoapods:     { max: 20, refillRate: 2 },
  maven:         { max: 20, refillRate: 2 },
  jsr:           { max: 30, refillRate: 3 },
  // github is handled by the token pool, not budgeted here
}

/**
 * Try to consume a rate limit token for a provider.
 * Returns true if the request is allowed, false if budget exhausted.
 */
export function consumeBudget(provider: string): boolean {
  const config = PROVIDER_BUDGETS[provider]
  if (!config) return true // no budget configured = unlimited

  let budget = budgets.get(provider)
  if (!budget) {
    budget = {
      tokens: config.max,
      max: config.max,
      refillRate: config.refillRate,
      lastRefill: Date.now(),
    }
    budgets.set(provider, budget)
  }

  // Refill tokens based on elapsed time
  const now = Date.now()
  const elapsed = (now - budget.lastRefill) / 1000
  budget.tokens = Math.min(budget.max, budget.tokens + elapsed * budget.refillRate)
  budget.lastRefill = now

  if (budget.tokens < 1) return false

  budget.tokens -= 1
  return true
}

// ---------------------------------------------------------------------------
// Cache key helpers
// ---------------------------------------------------------------------------

function cacheKey(provider: string, ...parts: string[]): string {
  return `shieldcn:${provider}:${parts.join(":")}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a cached value. Checks memory first, then Redis.
 * Returns undefined on miss.
 */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  // Tier 1: memory
  const mem = memoryCache.get(key) as CachedValue<T> | undefined
  if (mem) return mem.data

  // Tier 2: Redis
  const r = getRedis()
  if (r) {
    try {
      const val = await r.get<CachedValue<T>>(key)
      if (val) {
        // Backfill memory cache
        memoryCache.set(key, val as CachedValue<unknown>)
        return val.data
      }
    } catch {
      // Redis unavailable, continue without it
    }
  }

  return undefined
}

/**
 * Set a cached value in both tiers.
 * @param key - cache key
 * @param data - value to cache
 * @param ttlSeconds - TTL in seconds (default 300 = 5 min)
 */
export async function cacheSet<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
  const entry: CachedValue<T> = { data, ts: Date.now() }

  // Tier 1: memory
  memoryCache.set(key, entry as CachedValue<unknown>, { ttl: ttlSeconds * 1000 })

  // Tier 2: Redis
  const r = getRedis()
  if (r) {
    try {
      await r.set(key, entry, { ex: ttlSeconds })
    } catch {
      // Redis unavailable, memory-only is fine
    }
  }
}

/**
 * Cached provider fetch. Wraps a data-fetching function with:
 * 1. Cache lookup (memory + Redis)
 * 2. Backoff check (skip if provider is rate-limited)
 * 3. Budget check (skip if budget exhausted)
 * 4. Fetch + cache on success
 * 5. Backoff on 429/503
 *
 * @param provider - provider name (e.g. "npm", "discord")
 * @param key - unique cache key for this request
 * @param fetcher - async function that fetches the data
 * @param ttlSeconds - cache TTL (default 300)
 * @returns data or null
 */
/**
 * Optional metrics callback for cache instrumentation.
 * Set by the app layer (Sentry, etc.) before any requests flow.
 */
let cacheMetricsCallback: ((metric: {
  type: "counter"
  name: string
  value: number
  tags?: Record<string, string>
}) => void) | null = null

/**
 * Register a callback to receive cache metrics (hit/miss/backoff/budget).
 * Call once at app startup.
 */
export function setCacheMetricsCallback(cb: typeof cacheMetricsCallback): void {
  cacheMetricsCallback = cb
}

// ---------------------------------------------------------------------------
// Provider alerts (Sentry issues, not just metrics)
// ---------------------------------------------------------------------------

/**
 * A provider-level alert worth surfacing as a Sentry issue (not just a
 * metric counter). Examples: an upstream rate limit (429), or a badge that
 * could not be served at all because the upstream failed and there was no
 * last-known-good value to fall back to.
 *
 * `reason` and `message` are kept stable so Sentry groups recurring alerts
 * into a single issue; `context` carries the variable detail (path, url).
 */
export interface ProviderAlert {
  /** Provider name, e.g. "github". */
  provider: string
  /** What went wrong — used for triage and Sentry grouping. */
  reason: "rate_limit" | "unavailable" | "badge_unavailable"
  /** HTTP status, when applicable (e.g. 429, 503). */
  status?: number
  /** Stable human-readable summary (avoid per-request detail here). */
  message: string
  /** Variable context (badge path, url) — not used for grouping. */
  context?: Record<string, string>
}

let providerAlertCallback: ((alert: ProviderAlert) => void) | null = null

/**
 * Register a callback to receive provider alerts. Apps wire this to
 * Sentry.captureMessage (or any alerting backend); core stays
 * dependency-free. Call once at app startup.
 */
export function setProviderAlertCallback(cb: ((alert: ProviderAlert) => void) | null): void {
  providerAlertCallback = cb
}

/** Emit a provider alert. No-op if no callback is registered; never throws. */
export function reportProviderAlert(alert: ProviderAlert): void {
  try {
    providerAlertCallback?.(alert)
  } catch {
    // Alerting must never break a badge response.
  }
}

export async function cachedFetch<T>(
  provider: string,
  key: string,
  fetcher: () => Promise<T | null>,
  ttlSeconds: number = 300,
): Promise<T | null> {
  const fullKey = cacheKey(provider, key)

  // 1. Cache hit?
  const cached = await cacheGet<T>(fullKey)
  if (cached !== undefined) {
    cacheMetricsCallback?.({
      type: "counter", name: "badge.cache", value: 1,
      tags: { provider, result: "hit" },
    })
    return cached
  }

  cacheMetricsCallback?.({
    type: "counter", name: "badge.cache", value: 1,
    tags: { provider, result: "miss" },
  })

  // 2. Is the provider backed off?
  if (isBackedOff(provider)) {
    cacheMetricsCallback?.({
      type: "counter", name: "badge.backoff", value: 1,
      tags: { provider },
    })
    return null
  }

  // 3. Rate budget check
  if (!consumeBudget(provider)) {
    cacheMetricsCallback?.({
      type: "counter", name: "badge.budget_exhausted", value: 1,
      tags: { provider },
    })
    return null
  }

  // 4. Fetch
  try {
    const data = await fetcher()
    if (data !== null) {
      clearBackoff(provider)
      await cacheSet(fullKey, data, ttlSeconds)
    }
    return data
  } catch (err) {
    // Check for rate limit / server error signals
    if (err instanceof Response) {
      const status = err.status
      if (status === 429 || status === 503) {
        recordBackoff(provider, status)
      }
    }
    return null
  }
}

/**
 * Cached provider fetch with last-known-good fallback ("stale on error").
 *
 * Unlike {@link cachedFetch}, this keeps two copies of every successful
 * result:
 *   - a "fresh" copy with a short TTL (`freshTtl`), and
 *   - a "stale" copy with a long TTL (`staleTtl`).
 *
 * When a fetch fails (returns `null`) or the provider is currently backed
 * off, the stale copy is served instead of failing. This prevents a
 * transient upstream blip (429/503, network error, empty token pool) from
 * collapsing a previously-good badge into a "not found" — the badge keeps
 * showing its last-known value until the upstream recovers.
 *
 * Only non-null results are cached; a genuine miss with no prior good value
 * still returns `null` (caller decides how to render / cache that).
 *
 * A fetched result may be a "terminal error" — a real value that nonetheless
 * represents a definitive error state (e.g. GitHub 404 → "invalid
 * repository"). Pass `opts.isError` to mark these: they are cached only
 * briefly (`opts.errorTtl`) so repeated requests don't re-hit the upstream,
 * but they are NEVER written to the long-lived stale store and never
 * overwrite an existing good value — so they self-heal quickly and can't be
 * served later as a fake last-known-good.
 *
 * @param provider - provider name (e.g. "github")
 * @param key - unique cache key for this request
 * @param fetcher - async function that fetches the data
 * @param freshTtl - fresh-copy TTL in seconds (default 300)
 * @param staleTtl - last-known-good TTL in seconds (default 7 days)
 * @param opts - optional terminal-error handling
 */
export async function cachedFetchStale<T>(
  provider: string,
  key: string,
  fetcher: () => Promise<T | null>,
  freshTtl: number = 300,
  staleTtl: number = 60 * 60 * 24 * 7,
  opts?: { isError?: (data: T) => boolean; errorTtl?: number },
): Promise<T | null> {
  const freshKey = cacheKey(provider, key)
  const staleKey = cacheKey(provider, "stale", key)

  // 1. Fresh cache hit?
  const fresh = await cacheGet<T>(freshKey)
  if (fresh !== undefined) {
    cacheMetricsCallback?.({
      type: "counter", name: "badge.cache", value: 1,
      tags: { provider, result: "hit" },
    })
    return fresh
  }
  cacheMetricsCallback?.({
    type: "counter", name: "badge.cache", value: 1,
    tags: { provider, result: "miss" },
  })

  // Helper: serve last-known-good if we have it, otherwise surface that the
  // badge could not be served at all (upstream failed and there is no cached
  // value to fall back to) so it shows up in Sentry rather than silently
  // rendering "not found".
  const serveStale = async (): Promise<T | null> => {
    const stale = await cacheGet<T>(staleKey)
    if (stale !== undefined) {
      cacheMetricsCallback?.({
        type: "counter", name: "badge.cache", value: 1,
        tags: { provider, result: "stale" },
      })
      return stale
    }
    reportProviderAlert({
      provider,
      reason: "badge_unavailable",
      message: `${provider} badge unavailable (upstream failed, no cached value)`,
      context: { key },
    })
    return null
  }

  // 2. Provider backed off — don't hammer it, serve last-known-good.
  if (isBackedOff(provider)) {
    cacheMetricsCallback?.({
      type: "counter", name: "badge.backoff", value: 1,
      tags: { provider },
    })
    return serveStale()
  }

  // 3. Fetch.
  let data: T | null = null
  try {
    data = await fetcher()
  } catch (err) {
    if (err instanceof Response && (err.status === 429 || err.status === 503)) {
      recordBackoff(provider, err.status)
    }
    data = null
  }

  if (data !== null) {
    clearBackoff(provider)
    if (opts?.isError?.(data)) {
      // Terminal error verdict: cache briefly so we don't re-hit the upstream
      // on every request, but never persist it as last-known-good and never
      // clobber an existing good value — so it self-heals fast.
      await cacheSet(freshKey, data, opts.errorTtl ?? 60)
    } else {
      // Good value: refresh both the short-lived and the long-lived copy.
      await cacheSet(freshKey, data, freshTtl)
      await cacheSet(staleKey, data, staleTtl)
    }
    return data
  }

  // 4. Fetch failed — fall back to last-known-good rather than failing.
  return serveStale()
}

/**
 * Record a fetch response status for backoff tracking.
 * Call this from provider fetch helpers when they get a response.
 */
export function handleUpstreamStatus(provider: string, status: number): void {
  if (status === 429 || status === 503) {
    recordBackoff(provider, status)
  } else if (status >= 200 && status < 400) {
    clearBackoff(provider)
  }
}
