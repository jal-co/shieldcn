/**
 * shieldcn
 * lib/providers/discord
 *
 * Discord widget API client for fetching server online count.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch, str, num } from "../provider-fetch"

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
    url: `https://discord.com/api/guilds/${encodeURIComponent(serverId)}/widget.json`,
    ttl: 3600,
  })
  if (!data || typeof data.name !== "string") return null

  const count = num(data.presence_count) ?? 0

  return {
    label: "discord",
    value: `${formatCount(count)} online`,
    link: str(data.instant_invite) ?? `https://discord.com/servers`,
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
    url: `https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}?with_counts=true`,
    ttl: 3600,
  })
  if (!data) return null

  const members = num(data.approximate_member_count) ?? 0
  const online = num(data.approximate_presence_count) ?? 0

  if (topic === "online-members") {
    return {
      label: "discord",
      value: `${formatCount(online)} online`,
      link: `https://discord.gg/${encodeURIComponent(inviteCode)}`,
    }
  }

  return {
    label: "discord",
    value: `${formatCount(members)} members`,
    link: `https://discord.gg/${encodeURIComponent(inviteCode)}`,
  }
}
