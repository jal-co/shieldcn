/**
 * shieldcn
 * lib/providers/indiedevs
 *
 * IndieDevs profile badge.
 * Supports: user profile link.
 */

import type { BadgeData } from "../badges/types"

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export async function getIndieDevsUser(username: string): Promise<BadgeData | null> {
  if (!username) return null

  return {
    label: "indiedevs",
    value: username,
    link: `https://www.indiedevs.me/${username}`,
  }
}
