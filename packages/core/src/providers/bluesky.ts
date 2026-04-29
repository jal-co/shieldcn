/**
 * shieldcn
 * lib/providers/bluesky
 *
 * Bluesky (AT Protocol) public API client.
 * Supports: followers, following, posts.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function bskyFetch(handle: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "bluesky",
    cacheKey: `profile:${handle}`,
    url: `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export async function getBlueskyFollowers(handle: string): Promise<BadgeData | null> {
  const data = await bskyFetch(handle)
  if (!data) return null

  const count = (data.followersCount as number) ?? 0
  return {
    label: "bluesky",
    value: `${formatCount(count)} followers`,
    link: `https://bsky.app/profile/${handle}`,
  }
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

export async function getBlueskyFollowing(handle: string): Promise<BadgeData | null> {
  const data = await bskyFetch(handle)
  if (!data) return null

  const count = (data.followsCount as number) ?? 0
  return {
    label: "bluesky",
    value: `${formatCount(count)} following`,
    link: `https://bsky.app/profile/${handle}`,
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function getBlueskyPosts(handle: string): Promise<BadgeData | null> {
  const data = await bskyFetch(handle)
  if (!data) return null

  const count = (data.postsCount as number) ?? 0
  return {
    label: "bluesky",
    value: `${formatCount(count)} posts`,
    link: `https://bsky.app/profile/${handle}`,
  }
}
