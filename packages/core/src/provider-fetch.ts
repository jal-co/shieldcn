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

import { cachedFetchStale, handleUpstreamStatus } from "./cache"

/** Last-known-good fallback window for provider data (7 days). */
const PROVIDER_STALE_TTL = 60 * 60 * 24 * 7

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
}

/**
 * Classify a response status. A 429 or any 5xx is a TRANSIENT upstream
 * problem: we throw the response so the caller (cachedFetchStale) serves the
 * last-known-good value and backs the provider off, instead of letting a
 * blip collapse a working badge to "not found". Any other non-2xx (e.g. a
 * genuine 404) is a DEFINITIVE negative: return null for a short-lived
 * "not found".
 */
function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500
}

/**
 * Fetch JSON from an upstream provider with caching + resilience.
 * Returns parsed JSON, or null when the resource genuinely doesn't exist.
 * On a transient upstream failure it serves the last-known-good value.
 */
export async function providerFetch<T = Record<string, unknown>>(
  opts: ProviderFetchOptions
): Promise<T | null> {
  const { provider, cacheKey, url, ttl = 300, headers = {}, revalidate } = opts

  return cachedFetchStale<T>(
    provider,
    cacheKey,
    async () => {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "shieldcn/1.0",
          ...headers,
        },
        next: { revalidate: revalidate ?? ttl },
      })

      // Transient → throw so the caller falls back to last-known-good.
      if (isTransientStatus(response.status)) throw response

      handleUpstreamStatus(provider, response.status)
      if (!response.ok) return null // definitive negative (e.g. 404)
      return response.json() as Promise<T>
    },
    ttl,
    PROVIDER_STALE_TTL,
  )
}

/**
 * Fetch text from an upstream provider with caching + resilience.
 * Used for APIs that return non-JSON (XML, plain text, etc.).
 */
export async function providerFetchText(
  opts: ProviderFetchOptions
): Promise<string | null> {
  const { provider, cacheKey, url, ttl = 300, headers = {}, revalidate } = opts

  return cachedFetchStale<string>(
    provider,
    cacheKey,
    async () => {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "shieldcn/1.0",
          ...headers,
        },
        next: { revalidate: revalidate ?? ttl },
      })

      // Transient → throw so the caller falls back to last-known-good.
      if (isTransientStatus(response.status)) throw response

      handleUpstreamStatus(provider, response.status)
      if (!response.ok) return null // definitive negative (e.g. 404)
      return response.text()
    },
    ttl,
    PROVIDER_STALE_TTL,
  )
}
