/**
 * @shieldcn/core
 * src/providers/discourse
 *
 * Discourse forum API client.
 * Supports: topics, posts, users, likes.
 *
 * Uses the public Discourse API (no auth required for public instances).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function discourseFetch(server: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "discourse",
    cacheKey: `stats:${server}`,
    url: `https://${server}/site/statistics.json`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export async function getDiscourseTopics(server: string): Promise<BadgeData | null> {
  const data = await discourseFetch(server)
  if (!data) return null

  const count = data.topic_count as number | undefined
  if (count === undefined) return null

  return {
    label: "topics",
    value: formatCount(count),
    link: `https://${server}`,
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function getDiscoursePosts(server: string): Promise<BadgeData | null> {
  const data = await discourseFetch(server)
  if (!data) return null

  const count = data.post_count as number | undefined
  if (count === undefined) return null

  return {
    label: "posts",
    value: formatCount(count),
    link: `https://${server}`,
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getDiscourseUsers(server: string): Promise<BadgeData | null> {
  const data = await discourseFetch(server)
  if (!data) return null

  const count = data.user_count as number | undefined
  if (count === undefined) return null

  return {
    label: "users",
    value: formatCount(count),
    link: `https://${server}`,
  }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

export async function getDiscourseLikes(server: string): Promise<BadgeData | null> {
  const data = await discourseFetch(server)
  if (!data) return null

  const count = data.like_count as number | undefined
  if (count === undefined) return null

  return {
    label: "likes",
    value: formatCount(count),
    link: `https://${server}`,
  }
}
