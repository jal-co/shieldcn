/**
 * @shieldcn/core
 * src/gen-users.ts
 *
 * Tracks GitHub users/orgs that have used the badge generator.
 * Stores owner, avatar URL, repo name, and badge count.
 */

import { getPool } from "./db"

export interface GenUser {
  owner: string
  avatar_url: string
  repo: string
  badge_count: number
}

/**
 * Record a generator usage. Upserts the owner —
 * updates repo, badge count, and timestamp on repeat visits.
 */
export async function trackGenUser(
  owner: string,
  repo: string,
  badgeCount: number
): Promise<void> {
  try {
    const db = getPool()
    const avatarUrl = `https://github.com/${owner}.png?size=64`
    await db.query(
      `INSERT INTO gen_users (owner, avatar_url, repo, badge_count, last_used_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (owner) DO UPDATE SET
         repo = $3,
         badge_count = gen_users.badge_count + $4,
         last_used_at = NOW()`,
      [owner, avatarUrl, repo, badgeCount]
    )
  } catch {
    // Silently fail — don't block the response
  }
}

/**
 * Get recent generator users for the avatar stack.
 * Returns up to `limit` users ordered by most recent usage.
 */
export async function getRecentGenUsers(limit = 30): Promise<GenUser[]> {
  try {
    const db = getPool()
    const result = await db.query(
      `SELECT owner, avatar_url, repo, badge_count
       FROM gen_users
       ORDER BY last_used_at DESC
       LIMIT $1`,
      [limit]
    )
    return result.rows
  } catch {
    return []
  }
}
