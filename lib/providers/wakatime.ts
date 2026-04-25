/**
 * shieldcn
 * lib/providers/wakatime
 *
 * WakaTime API client for developer coding stats.
 * Supports: coding hours (all time).
 */

import type { BadgeData } from "@/lib/badges/types"

// ---------------------------------------------------------------------------
// Coding hours (all time)
// ---------------------------------------------------------------------------

export async function getWakaTimeCodingTime(username: string): Promise<BadgeData | null> {
  try {
    const r = await fetch(
      `https://wakatime.com/api/v1/users/${encodeURIComponent(username)}/stats`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    const data = await r.json()

    const stats = data.data as Record<string, unknown> | undefined
    if (!stats) return null

    const text = stats.human_readable_total_including_other_language as string
      || stats.human_readable_total as string
      || "unknown"

    return {
      label: "wakatime",
      value: text,
      link: `https://wakatime.com/@${username}`,
    }
  } catch {
    return null
  }
}
