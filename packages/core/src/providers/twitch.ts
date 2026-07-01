/**
 * shieldcn
 * lib/providers/twitch
 *
 * Twitch Helix API client.
 * Supports: status (live/offline), viewer count, followers.
 *
 * Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET env vars.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { str, num } from "../provider-fetch"

const CLIENT_ID = process.env.TWITCH_CLIENT_ID
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET

let cachedToken: { token: string; expires: number } | null = null

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  try {
    const r = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
      { method: "POST" }
    )
    if (!r.ok) return null
    const data = await r.json()
    cachedToken = {
      token: data.access_token,
      expires: Date.now() + (data.expires_in - 60) * 1000,
    }
    return cachedToken.token
  } catch {
    return null
  }
}

async function twitchFetch(endpoint: string): Promise<Record<string, unknown> | null> {
  const token = await getAccessToken()
  if (!token || !CLIENT_ID) return null

  try {
    const r = await fetch(`https://api.twitch.tv/helix/${endpoint}`, {
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": `Bearer ${token}`,
      },
      next: { revalidate: 300 }, // 5 min cache for live status
    })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Status (live/offline + viewer count)
// ---------------------------------------------------------------------------

export async function getTwitchStatus(login: string): Promise<BadgeData | null> {
  const data = await twitchFetch(`streams?user_login=${encodeURIComponent(login)}`)
  if (!data) return null

  const streams = data.data as Array<Record<string, unknown>> | undefined
  if (streams && streams.length > 0) {
    const viewers = num(streams[0].viewer_count) ?? 0
    return {
      label: login,
      value: `🔴 live · ${formatCount(viewers)} viewers`,
      color: "green",
      link: `https://twitch.tv/${encodeURIComponent(login)}`,
    }
  }

  return {
    label: login,
    value: "offline",
    link: `https://twitch.tv/${encodeURIComponent(login)}`,
  }
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export async function getTwitchFollowers(login: string): Promise<BadgeData | null> {
  // First get user ID from login
  const userData = await twitchFetch(`users?login=${encodeURIComponent(login)}`)
  if (!userData) return null
  const users = userData.data as Array<Record<string, unknown>> | undefined
  if (!users || users.length === 0) return null

  const userId = str(users[0].id)
  if (!userId) return null
  const data = await twitchFetch(`channels/followers?broadcaster_id=${encodeURIComponent(userId)}&first=1`)
  if (!data) return null

  const total = num(data.total) ?? 0
  return {
    label: login,
    value: `${formatCount(total)} followers`,
    link: `https://twitch.tv/${encodeURIComponent(login)}`,
  }
}
