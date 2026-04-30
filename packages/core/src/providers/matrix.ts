/**
 * @shieldcn/core
 * src/providers/matrix
 *
 * Matrix chat API client.
 * Supports: room members count.
 *
 * Uses the public Matrix Client API (no auth required for public rooms).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Room Members
// ---------------------------------------------------------------------------

export async function getMatrixMembers(
  roomAlias: string,
  server: string = "matrix.org",
): Promise<BadgeData | null> {
  // First, resolve the room alias to a room ID
  const aliasData = await providerFetch<Record<string, unknown>>({
    provider: "matrix",
    cacheKey: `alias:${server}:${roomAlias}`,
    url: `https://${server}/_matrix/client/v3/directory/room/${encodeURIComponent(`#${roomAlias}:${server}`)}`,
    ttl: 3600,
  })

  // Fallback: try without server suffix in the alias (user might provide full alias)
  if (!aliasData) {
    const fullAlias = roomAlias.includes(":") ? roomAlias : `${roomAlias}:${server}`
    const data = await providerFetch<Record<string, unknown>>({
      provider: "matrix",
      cacheKey: `alias-full:${server}:${fullAlias}`,
      url: `https://${server}/_matrix/client/v3/directory/room/${encodeURIComponent(`#${fullAlias}`)}`,
      ttl: 3600,
    })
    if (!data) return null

    const roomId = data.room_id as string | undefined
    if (!roomId) return null

    return await fetchRoomMembers(server, roomId, roomAlias)
  }

  const roomId = aliasData.room_id as string | undefined
  if (!roomId) return null

  return await fetchRoomMembers(server, roomId, roomAlias)
}

async function fetchRoomMembers(
  server: string,
  roomId: string,
  roomAlias: string,
): Promise<BadgeData | null> {
  // Get room summary/state to find member count
  const summaryData = await providerFetch<Record<string, unknown>>({
    provider: "matrix",
    cacheKey: `summary:${server}:${roomId}`,
    url: `https://${server}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`,
    ttl: 3600,
  })

  if (summaryData) {
    const joined = summaryData.joined as Record<string, unknown> | undefined
    if (joined) {
      const count = Object.keys(joined).length
      return {
        label: "matrix",
        value: `${formatCount(count)} members`,
        link: `https://matrix.to/#/#${roomAlias}:${server}`,
      }
    }
  }

  // Fallback: try the public rooms endpoint
  return {
    label: "matrix",
    value: "join",
    link: `https://matrix.to/#/#${roomAlias}:${server}`,
  }
}
