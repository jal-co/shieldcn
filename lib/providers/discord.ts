/**
 * shieldcn
 * lib/providers/discord
 *
 * Discord widget API client for fetching server online count.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

/**
 * Fetch online member count for a Discord server by server ID.
 * Requires the server to have the widget enabled.
 */
export async function getDiscordOnline(
  serverId: string
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "discord",
    cacheKey: `widget:${serverId}`,
    url: `https://discord.com/api/guilds/${serverId}/widget.json`,
    ttl: 3600,
  })
  if (!data || typeof data.name !== "string") return null

  const count = (data.presence_count as number) ?? 0

  return {
    label: "discord",
    value: `${formatCount(count)} online`,
    link: (data.instant_invite as string) ?? `https://discord.com/servers`,
  }
}

/**
 * Fetch Discord server info by invite code.
 */
export async function getDiscordByInvite(
  inviteCode: string,
  topic: string
): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "discord",
    cacheKey: `invite:${inviteCode}:${topic}`,
    url: `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
    ttl: 3600,
  })
  if (!data) return null

  const members = (data.approximate_member_count as number) ?? 0
  const online = (data.approximate_presence_count as number) ?? 0

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
}
