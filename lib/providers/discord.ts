/**
 * shieldcn
 * lib/providers/discord
 *
 * Discord widget API client for fetching server online count.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

/**
 * Fetch online member count for a Discord server by server ID.
 * Requires the server to have the widget enabled.
 */
export async function getDiscordOnline(
  serverId: string
): Promise<BadgeData | null> {
  try {
    const response = await fetch(
      `https://discord.com/api/guilds/${serverId}/widget.json`,
      { next: { revalidate: 3600 } }
    )
    if (!response.ok) return null
    const data = await response.json()

    if (typeof data.name !== "string") return null

    const count = data.presence_count ?? 0

    return {
      label: "discord",
      value: `${formatCount(count)} online`,
      link: data.instant_invite ?? `https://discord.com/servers`,
    }
  } catch {
    return null
  }
}

/**
 * Fetch Discord server info by invite code.
 */
export async function getDiscordByInvite(
  inviteCode: string,
  topic: string
): Promise<BadgeData | null> {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
      { next: { revalidate: 3600 } }
    )
    if (!response.ok) return null
    const data = await response.json()

    const members = data.approximate_member_count ?? 0
    const online = data.approximate_presence_count ?? 0

    if (topic === "online-members") {
      return {
        label: "discord",
        value: `${formatCount(online)} online`,
        link: `https://discord.gg/${inviteCode}`,
      }
    }

    return {
      label: "discord",
      value: `${formatCount(members)} members`,
      link: `https://discord.gg/${inviteCode}`,
    }
  } catch {
    return null
  }
}
