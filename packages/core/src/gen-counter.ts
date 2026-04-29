/**
 * shieldcn
 * lib/gen-counter
 *
 * Tracks total badges generated across both generators (repo + profile).
 * Uses a single row in Postgres for fast reads on the homepage.
 */

import { getPool } from "./db"

/**
 * Increment the badge counter by a given amount.
 * Called after each successful generation.
 */
export async function incrementGenCounter(badgeCount: number): Promise<void> {
  if (badgeCount <= 0) return
  try {
    const db = getPool()
    await db.query(
      `INSERT INTO gen_counter (id, count) VALUES ('badges', $1)
       ON CONFLICT (id) DO UPDATE SET count = gen_counter.count + $1`,
      [badgeCount],
    )
  } catch {
    // Silently fail — don't block the response for a counter
  }
}

/**
 * Get the current badge generation count.
 * Returns null if the DB is unavailable.
 */
export async function getGenCount(): Promise<number | null> {
  try {
    const db = getPool()
    const result = await db.query(
      `SELECT count FROM gen_counter WHERE id = 'badges'`,
    )
    if (result.rows.length === 0) return 0
    return Number(result.rows[0].count)
  } catch {
    return null
  }
}
