/**
 * shieldcn
 * lib/providers/hackernews
 *
 * Hacker News Firebase API client.
 * Supports: user karma.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

// ---------------------------------------------------------------------------
// User karma
// ---------------------------------------------------------------------------

export async function getHNKarma(userId: string): Promise<BadgeData | null> {
  try {
    const r = await fetch(
      `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(userId)}.json`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    const data = await r.json()
    if (!data || typeof data.karma !== "number") return null

    return {
      label: "HN karma",
      value: formatCount(data.karma as number),
      link: `https://news.ycombinator.com/user?id=${userId}`,
    }
  } catch {
    return null
  }
}
