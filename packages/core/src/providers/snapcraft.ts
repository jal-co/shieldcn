/**
 * @shieldcn/core
 * src/providers/snapcraft
 *
 * Snapcraft (Snap Store) API client.
 * Supports: version.
 *
 * Uses the public Snap Store API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getSnapcraftVersion(snap: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "snapcraft",
    cacheKey: `snap:${snap}`,
    url: `https://api.snapcraft.io/v2/snaps/info/${encodeURIComponent(snap)}`,
    ttl: 3600,
    headers: {
      "Snap-Device-Series": "16",
    },
  })
  if (!data) return null

  const channelMap = data["channel-map"] as Array<Record<string, unknown>> | undefined
  if (!channelMap || channelMap.length === 0) return null

  // Find the stable channel version
  const stable = channelMap.find(c => {
    const channel = c.channel as Record<string, string> | undefined
    return channel?.risk === "stable" && channel?.architecture === "amd64"
  })

  const entry = stable ?? channelMap[0]
  const version = entry?.version as string | undefined

  return {
    label: "snap",
    value: version ? `v${version}` : "unknown",
    link: `https://snapcraft.io/${snap}`,
  }
}
