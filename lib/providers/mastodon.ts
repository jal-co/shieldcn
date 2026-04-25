/**
 * shieldcn
 * lib/providers/mastodon
 *
 * Mastodon API client (works with any Mastodon-compatible instance).
 * Supports: followers, following, posts (statuses).
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

async function mastodonFetch(instance: string, acct: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "mastodon",
    cacheKey: `profile:${instance}:${acct}`,
    url: `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export async function getMastodonFollowers(instance: string, acct: string): Promise<BadgeData | null> {
  const data = await mastodonFetch(instance, acct)
  if (!data) return null

  const count = (data.followers_count as number) ?? 0
  return {
    label: "mastodon",
    value: `${formatCount(count)} followers`,
    link: data.url as string || `https://${instance}/@${acct}`,
  }
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

export async function getMastodonFollowing(instance: string, acct: string): Promise<BadgeData | null> {
  const data = await mastodonFetch(instance, acct)
  if (!data) return null

  const count = (data.following_count as number) ?? 0
  return {
    label: "mastodon",
    value: `${formatCount(count)} following`,
    link: data.url as string || `https://${instance}/@${acct}`,
  }
}

// ---------------------------------------------------------------------------
// Posts (statuses)
// ---------------------------------------------------------------------------

export async function getMastodonPosts(instance: string, acct: string): Promise<BadgeData | null> {
  const data = await mastodonFetch(instance, acct)
  if (!data) return null

  const count = (data.statuses_count as number) ?? 0
  return {
    label: "mastodon",
    value: `${formatCount(count)} posts`,
    link: data.url as string || `https://${instance}/@${acct}`,
  }
}
