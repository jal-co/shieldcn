/**
 * shieldcn
 * lib/providers/lemmy
 *
 * Lemmy (Fediverse) API client.
 * Supports: community subscribers, community posts, community comments.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

async function lemmyFetch(instance: string, community: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(
      `https://${instance}/api/v3/community?name=${encodeURIComponent(community)}`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------

export async function getLemmySubscribers(instance: string, community: string): Promise<BadgeData | null> {
  const data = await lemmyFetch(instance, community)
  if (!data) return null

  const view = data.community_view as Record<string, unknown> | undefined
  const counts = view?.counts as Record<string, number> | undefined
  if (!counts) return null

  return {
    label: `!${community}`,
    value: `${formatCount(counts.subscribers ?? 0)} subscribers`,
    link: `https://${instance}/c/${community}`,
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function getLemmyPosts(instance: string, community: string): Promise<BadgeData | null> {
  const data = await lemmyFetch(instance, community)
  if (!data) return null

  const view = data.community_view as Record<string, unknown> | undefined
  const counts = view?.counts as Record<string, number> | undefined
  if (!counts) return null

  return {
    label: `!${community}`,
    value: `${formatCount(counts.posts ?? 0)} posts`,
    link: `https://${instance}/c/${community}`,
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function getLemmyComments(instance: string, community: string): Promise<BadgeData | null> {
  const data = await lemmyFetch(instance, community)
  if (!data) return null

  const view = data.community_view as Record<string, unknown> | undefined
  const counts = view?.counts as Record<string, number> | undefined
  if (!counts) return null

  return {
    label: `!${community}`,
    value: `${formatCount(counts.comments ?? 0)} comments`,
    link: `https://${instance}/c/${community}`,
  }
}
