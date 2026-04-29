/**
 * shieldcn
 * lib/providers/hackernews
 *
 * Hacker News Firebase API client.
 * Supports: user karma.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// User karma
// ---------------------------------------------------------------------------

export async function getHNKarma(userId: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "hackernews",
    cacheKey: `karma:${userId}`,
    url: `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(userId)}.json`,
    ttl: 3600,
  })
  if (!data || typeof data.karma !== "number") return null

  return {
    label: "HN karma",
    value: formatCount(data.karma as number),
    link: `https://news.ycombinator.com/user?id=${userId}`,
  }
}
