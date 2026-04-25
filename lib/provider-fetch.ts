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
 * Fetch JSON from an upstream provider with caching + resilience.
 * Returns parsed JSON or null on failure.
 */
export async function providerFetch<T = Record<string, unknown>>(
  opts: ProviderFetchOptions
): Promise<T | null> {
  const { provider, cacheKey, url, ttl = 300, headers = {}, revalidate } = opts

  return cachedFetch<T>(
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

      handleUpstreamStatus(provider, response.status)

      if (!response.ok) return null
      return response.json() as Promise<T>
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
  const { provider, cacheKey, url, ttl = 300, headers = {}, revalidate } = opts

  return cachedFetch<string>(
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

      handleUpstreamStatus(provider, response.status)

      if (!response.ok) return null
      return response.text()
    },
    ttl,
  )
}
