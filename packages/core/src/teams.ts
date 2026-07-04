/**
 * @shieldcn/core
 * src/teams.ts
 *
 * Team-creation cap. A user gets their personal account plus any teams they're
 * invited to; they may *create* only a limited number themselves (abuse
 * prevention). Team/member data lives in the hosted Neon Auth store, so we
 * can't cheaply count "teams I own" there — instead we record each creation in
 * our own Postgres (keyed by the created org id) and count against that.
 *
 * All reads fail open (never block a request on a DB hiccup); enforcement is
 * best-effort-strict: the count is authoritative when the DB is reachable.
 */

import { query, initDB } from "./db"

/** How many teams a single user may create. More come only via invitation. */
export const TEAM_CREATE_LIMIT = 1

/** Number of teams this user has created (owns). Fail-open to 0. */
export async function countTeamsCreated(userId: string): Promise<number> {
  if (!userId) return 0
  try {
    await initDB()
    const { rows } = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM team_creations WHERE creator_user_id = $1`,
      [userId],
    )
    return Number(rows[0]?.n ?? 0)
  } catch {
    return 0
  }
}

/** Whether the user is under their team-creation cap. */
export async function canCreateTeam(userId: string): Promise<boolean> {
  return (await countTeamsCreated(userId)) < TEAM_CREATE_LIMIT
}

/**
 * Record that a user created a team. Idempotent on the org id, so a retried
 * webhook / double-submit doesn't double-count. Best-effort.
 */
export async function recordTeamCreation(orgId: string, userId: string): Promise<void> {
  if (!orgId || !userId) return
  try {
    await initDB()
    await query(
      `INSERT INTO team_creations (org_id, creator_user_id)
         VALUES ($1, $2)
       ON CONFLICT (org_id) DO NOTHING`,
      [orgId, userId],
    )
  } catch {
    /* best-effort */
  }
}
