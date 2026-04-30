/**
 * @shieldcn/core
 * src/providers/stackexchange
 *
 * Stack Exchange / Stack Overflow API client.
 * Supports: tag question count, user reputation.
 *
 * Uses the public Stack Exchange API v2.3 (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Tag questions count
// ---------------------------------------------------------------------------

export async function getStackExchangeTagQuestions(
  tag: string,
  site: string = "stackoverflow",
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "stackexchange",
    cacheKey: `tag:${site}:${tag}`,
    url: `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/info?site=${site}`,
    ttl: 3600,
  })
  if (!data) return null

  const items = data.items as Array<Record<string, unknown>> | undefined
  if (!items || items.length === 0) return null

  const count = items[0].count as number | undefined
  if (count === undefined) return null

  const siteName = site === "stackoverflow" ? "Stack Overflow" : site

  return {
    label: `${siteName} [${tag}]`,
    value: `${formatCount(count)} questions`,
    link: `https://${site === "stackoverflow" ? "stackoverflow.com" : `${site}.stackexchange.com`}/questions/tagged/${tag}`,
  }
}

// ---------------------------------------------------------------------------
// User reputation
// ---------------------------------------------------------------------------

export async function getStackExchangeReputation(
  userId: string,
  site: string = "stackoverflow",
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "stackexchange",
    cacheKey: `user:${site}:${userId}`,
    url: `https://api.stackexchange.com/2.3/users/${userId}?site=${site}`,
    ttl: 3600,
  })
  if (!data) return null

  const items = data.items as Array<Record<string, unknown>> | undefined
  if (!items || items.length === 0) return null

  const reputation = items[0].reputation as number | undefined
  const displayName = items[0].display_name as string | undefined

  if (reputation === undefined) return null

  return {
    label: displayName ?? "reputation",
    value: formatCount(reputation),
    link: `https://${site === "stackoverflow" ? "stackoverflow.com" : `${site}.stackexchange.com`}/users/${userId}`,
  }
}
