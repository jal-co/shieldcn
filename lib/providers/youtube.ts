/**
 * shieldcn
 * lib/providers/youtube
 *
 * YouTube Data API v3 client.
 * Supports: channel subscribers, channel views, video views, video likes.
 *
 * Requires YOUTUBE_API_KEY env var.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

const API_KEY = process.env.YOUTUBE_API_KEY

async function ytFetch(url: string, key: string): Promise<Record<string, unknown> | null> {
  if (!API_KEY) return null
  return providerFetch({ provider: "youtube", cacheKey: key, url, ttl: 3600 })
}

// ---------------------------------------------------------------------------
// Channel subscribers
// ---------------------------------------------------------------------------

export async function getYouTubeSubscribers(channelId: string): Promise<BadgeData | null> {
  const data = await ytFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${API_KEY}`, `subs:${channelId}`
  )
  if (!data) return null
  const items = data.items as Array<Record<string, unknown>> | undefined
  const stats = items?.[0]?.statistics as Record<string, string> | undefined
  if (!stats) return null

  const count = parseInt(stats.subscriberCount || "0", 10)
  return {
    label: "subscribers",
    value: formatCount(count),
    link: `https://youtube.com/channel/${channelId}`,
  }
}

// ---------------------------------------------------------------------------
// Channel views
// ---------------------------------------------------------------------------

export async function getYouTubeChannelViews(channelId: string): Promise<BadgeData | null> {
  const data = await ytFetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${API_KEY}`, `channel-views:${channelId}`
  )
  if (!data) return null
  const items = data.items as Array<Record<string, unknown>> | undefined
  const stats = items?.[0]?.statistics as Record<string, string> | undefined
  if (!stats) return null

  const count = parseInt(stats.viewCount || "0", 10)
  return {
    label: "views",
    value: formatCount(count),
    link: `https://youtube.com/channel/${channelId}`,
  }
}

// ---------------------------------------------------------------------------
// Video views
// ---------------------------------------------------------------------------

export async function getYouTubeVideoViews(videoId: string): Promise<BadgeData | null> {
  const data = await ytFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`, `views:${videoId}`
  )
  if (!data) return null
  const items = data.items as Array<Record<string, unknown>> | undefined
  const stats = items?.[0]?.statistics as Record<string, string> | undefined
  if (!stats) return null

  const count = parseInt(stats.viewCount || "0", 10)
  return {
    label: "views",
    value: formatCount(count),
    link: `https://youtube.com/watch?v=${videoId}`,
  }
}

// ---------------------------------------------------------------------------
// Video likes
// ---------------------------------------------------------------------------

export async function getYouTubeLikes(videoId: string): Promise<BadgeData | null> {
  const data = await ytFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`, `likes:${videoId}`
  )
  if (!data) return null
  const items = data.items as Array<Record<string, unknown>> | undefined
  const stats = items?.[0]?.statistics as Record<string, string> | undefined
  if (!stats) return null

  const count = parseInt(stats.likeCount || "0", 10)
  return {
    label: "likes",
    value: formatCount(count),
    link: `https://youtube.com/watch?v=${videoId}`,
  }
}

// ---------------------------------------------------------------------------
// Video comments
// ---------------------------------------------------------------------------

export async function getYouTubeComments(videoId: string): Promise<BadgeData | null> {
  const data = await ytFetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`, `comments:${videoId}`
  )
  if (!data) return null
  const items = data.items as Array<Record<string, unknown>> | undefined
  const stats = items?.[0]?.statistics as Record<string, string> | undefined
  if (!stats) return null

  const count = parseInt(stats.commentCount || "0", 10)
  return {
    label: "comments",
    value: formatCount(count),
    link: `https://youtube.com/watch?v=${videoId}`,
  }
}
