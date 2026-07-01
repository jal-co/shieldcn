/**
 * shieldcn
 * lib/providers/mastodon
 *
 * Mastodon API client (works with any Mastodon-compatible instance).
 * Supports: followers, following, posts (statuses).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch, str, num } from "../provider-fetch"

async function mastodonFetch(instance: string, acct: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "mastodon",
    cacheKey: `profile:${instance}:${acct}`,
    url: `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`,
    ttl: 3600,
    userControlledHost: true,
  })
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export async function getMastodonFollowers(instance: string, acct: string): Promise<BadgeData | null> {
  const data = await mastodonFetch(instance, acct)
  if (!data) return null

  const count = num(data.followers_count) ?? 0
  return {
    label: "mastodon",
    value: `${formatCount(count)} followers`,
    link: str(data.url) || `https://${instance}/@${encodeURIComponent(acct)}`,
  }
}

// ---------------------------------------------------------------------------
// Following
// ---------------------------------------------------------------------------

export async function getMastodonFollowing(instance: string, acct: string): Promise<BadgeData | null> {
  const data = await mastodonFetch(instance, acct)
  if (!data) return null

  const count = num(data.following_count) ?? 0
  return {
    label: "mastodon",
    value: `${formatCount(count)} following`,
    link: str(data.url) || `https://${instance}/@${encodeURIComponent(acct)}`,
  }
}

// ---------------------------------------------------------------------------
// Posts (statuses)
// ---------------------------------------------------------------------------

export async function getMastodonPosts(instance: string, acct: string): Promise<BadgeData | null> {
  const data = await mastodonFetch(instance, acct)
  if (!data) return null

  const count = num(data.statuses_count) ?? 0
  return {
    label: "mastodon",
    value: `${formatCount(count)} posts`,
    link: str(data.url) || `https://${instance}/@${encodeURIComponent(acct)}`,
  }
}
