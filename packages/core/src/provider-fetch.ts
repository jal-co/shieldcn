/**
 * shieldcn
 * lib/provider-fetch
 *
 * Cached fetch wrapper for upstream provider APIs.
 * Handles caching, backoff, and rate budgets automatically.
 *
 * Providers call `providerFetch()` instead of raw `fetch()`.
 * The response is cached in memory + Redis, and upstream errors
 * trigger exponential backoff per provider.
 */

import { cachedFetch, handleUpstreamStatus } from "./cache"
import { safeFetch, UnsafeUrlError, ResponseTooLargeError } from "./safe-fetch"

/**
 * Hard cap on upstream latency. A hung upstream must fail fast so the badge
 * route can fall back instead of hanging until the platform kills the request
 * (README image proxies time out and show a broken image). Implemented as a
 * race rather than an AbortSignal so the `next: { revalidate }` fetch cache
 * behavior is untouched.
 */
export const UPSTREAM_TIMEOUT_MS = 8_000

/** Resolve to `null` if `promise` takes longer than `ms`. */
export function raceTimeout<T>(promise: Promise<T>, ms: number = UPSTREAM_TIMEOUT_MS): Promise<T | null> {
  // Swallow the late rejection if the timeout wins the race.
  promise.catch(() => {})
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ])
}

interface ProviderFetchOptions {
  /** Provider name (e.g. "npm", "discord"). Used for backoff + budgets. */
  provider: string
  /** Unique cache key for this specific request (e.g. "v:react"). */
  cacheKey: string
  /** URL to fetch. */
  url: string
  /** Cache TTL in seconds. @default 300 */
  ttl?: number
  /** Additional fetch headers. */
  headers?: HeadersInit
  /** Next.js revalidate value. @default matches ttl */
  revalidate?: number
  /**
   * Set when the hostname in `url` was chosen by the badge caller rather than
   * hardcoded (e.g. Mastodon/Lemmy/Discourse/Matrix/Weblate/Sonar instance
   * badges). Routes the request through {@link safeFetch} instead of raw
   * `fetch`, rejecting private/loopback/link-local/metadata addresses (on the
   * initial host and on every redirect hop) and capping the response size.
   * Hardcoded-host providers (npm, GitHub, ...) must NOT set this.
   */
  userControlledHost?: boolean
}

/**
 * Fetch JSON from an upstream provider with caching + resilience.
 * Returns parsed JSON or null on failure.
 */
export async function providerFetch<T = Record<string, unknown>>(
  opts: ProviderFetchOptions
): Promise<T | null> {
  const { provider, cacheKey, url, ttl = 300, headers = {}, revalidate, userControlledHost } = opts

  return cachedFetch<T>(
    provider,
    cacheKey,
    async () => {
      const requestHeaders = {
        Accept: "application/json",
        "User-Agent": "shieldcn/1.0",
        ...headers,
      }

      let response: Response | null
      try {
        response = userControlledHost
          ? await raceTimeout(safeFetch(url, { headers: requestHeaders }))
          : await raceTimeout(fetch(url, { headers: requestHeaders, next: { revalidate: revalidate ?? ttl } }))
      } catch (err) {
        if (err instanceof UnsafeUrlError || err instanceof ResponseTooLargeError) return null
        throw err
      }
      if (!response) return null

      handleUpstreamStatus(provider, response.status)

      if (!response.ok) return null
      try {
        return await (response.json() as Promise<T>)
      } catch {
        // Truncated / malformed body — treat as a transient failure.
        return null
      }
    },
    ttl,
  )
}

/**
 * Fetch text from an upstream provider with caching + resilience.
 * Used for APIs that return non-JSON (XML, plain text, etc.).
 */
export async function providerFetchText(
  opts: ProviderFetchOptions
): Promise<string | null> {
  const { provider, cacheKey, url, ttl = 300, headers = {}, revalidate, userControlledHost } = opts

  return cachedFetch<string>(
    provider,
    cacheKey,
    async () => {
      const requestHeaders = {
        "User-Agent": "shieldcn/1.0",
        ...headers,
      }

      let response: Response | null
      try {
        response = userControlledHost
          ? await raceTimeout(safeFetch(url, { headers: requestHeaders }))
          : await raceTimeout(fetch(url, { headers: requestHeaders, next: { revalidate: revalidate ?? ttl } }))
      } catch (err) {
        if (err instanceof UnsafeUrlError || err instanceof ResponseTooLargeError) return null
        throw err
      }
      if (!response) return null

      handleUpstreamStatus(provider, response.status)

      if (!response.ok) return null
      try {
        return await response.text()
      } catch {
        return null
      }
    },
    ttl,
  )
}

/**
 * Coerce an unknown upstream JSON value to a string, or `undefined` if it
 * isn't one — replaces `value as string` casts on parsed JSON, which lie to
 * the type checker rather than checking anything. A schema shift upstream
 * (a field turning into an object/number/null) then surfaces as a missing
 * value instead of a `"[object Object]"` badge or a malformed fetch URL.
 */
export function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

/**
 * Coerce an unknown upstream JSON value to a finite number, or `undefined`
 * if it isn't one — replaces `value as number` casts on parsed JSON. See
 * {@link str}.
 */
export function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/**
 * True when a GitHub API response is a rate limit. GitHub signals primary and
 * secondary rate limits as 403 (with an exhausted quota header or a
 * Retry-After), not just 429 — a plain 403 (e.g. a blocked repo) is NOT a
 * rate limit. Shared by providers/github.ts and providers/starhistory.ts,
 * both of which hit the GitHub API directly.
 */
export function isRateLimitResponse(response: Response): boolean {
  if (response.status === 429) return true
  return (
    response.status === 403 &&
    (response.headers.get("x-ratelimit-remaining") === "0" ||
      response.headers.get("retry-after") !== null)
  )
}
