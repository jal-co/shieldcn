/**
 * shieldcn
 * lib/providers/reddit
 *
 * Reddit API client for user karma and subreddit subscribers.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function redditFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "reddit",
    cacheKey: key,
    url,
    ttl: 3600,
    headers: { "User-Agent": "shieldcn/1.0" },
  })
}

export async function getRedditKarma(user: string, type: string): Promise<BadgeData | null> {
  const data = await redditFetch(`https://www.reddit.com/user/${user}/about.json`, `karma:${user}:${type}`)
  if (!data) return null
  const d = data.data as Record<string, unknown> | undefined
  if (!d) return null

  let value: number
  let label: string

  switch (type) {
    case "post-karma":
      value = (d.link_karma as number) || 0
      label = "post karma"
      break
    case "comment-karma":
      value = (d.comment_karma as number) || 0
      label = "comment karma"
      break
    default: // "karma" — total
      value = ((d.link_karma as number) || 0) + ((d.comment_karma as number) || 0)
      label = "karma"
      break
  }

  return {
    label,
    value: formatCount(value),
    link: `https://www.reddit.com/user/${user}`,
  }
}

export async function getRedditSubscribers(subreddit: string): Promise<BadgeData | null> {
  const data = await redditFetch(`https://www.reddit.com/r/${subreddit}/about.json`, `subs:${subreddit}`)
  if (!data) return null
  const d = data.data as Record<string, unknown> | undefined
  if (!d || typeof d.subscribers !== "number") return null

  return {
    label: `r/${subreddit}`,
    value: `${formatCount(d.subscribers as number)} subscribers`,
    link: `https://www.reddit.com/r/${subreddit}`,
  }
}
