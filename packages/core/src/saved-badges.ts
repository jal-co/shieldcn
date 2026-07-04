/**
 * @shieldcn/core
 * src/saved-badges.ts
 *
 * Saved badges library (Plus). A personal, reusable collection of single
 * badges. Each saved badge stores its BuilderState `config` (path + style
 * params) plus an optional rendered SVG snapshot so the library can thumbnail
 * without re-hitting the badge engine. Ownership is personal-first (a user id
 * or an active organization id).
 *
 * Mirrors studio-docs.ts: fail-open reads (a DB blip shows an empty list, never
 * a crashed dashboard), cap-enforced creates, and owner-scoped writes.
 */

import { query, initDB } from "./db"

/**
 * Saved-badge caps. Free gets a small allowance so signing up is worthwhile
 * (the account-creation hook); Plus raises it. Kept in step with the saved-
 * README caps so the two libraries feel consistent.
 */
export const FREE_BADGE_LIMIT = 2
export const PLUS_BADGE_LIMIT = 50

/** Saved-badge cap for a plan. Single source of truth for route + dashboard. */
export function badgeLimitForPlan(plan: string): number {
  if (plan === "plus") return PLUS_BADGE_LIMIT
  return FREE_BADGE_LIMIT
}

export interface SavedBadge {
  id: number
  ownerId: string
  userId: string | null
  name: string
  alt: string
  /** The badge's BuilderState (path + style params). Opaque JSON to core. */
  config: unknown
  /** True when a rendered SVG snapshot is stored (fetch via getSavedBadgeSvg). */
  hasSvg: boolean
  updatedAt: string
}

interface BadgeRow {
  id: string | number
  owner_id: string
  user_id: string | null
  name: string
  alt: string
  config: unknown
  has_svg: boolean
  updated_at: string | Date
}

function rowToBadge(row: BadgeRow): SavedBadge {
  return {
    id: Number(row.id),
    ownerId: row.owner_id,
    userId: row.user_id,
    name: row.name,
    alt: row.alt,
    config: row.config,
    hasSvg: row.has_svg === true,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

/** Column list that reports svg presence without shipping the bytes. */
const LIST_COLS =
  "id, owner_id, user_id, name, alt, config, (svg IS NOT NULL) AS has_svg, updated_at"

export async function listSavedBadges(ownerId: string): Promise<SavedBadge[]> {
  // Fail-open: a DB blip on a dashboard read shows an empty list, never a
  // crashed page (the write paths still surface real errors).
  try {
    await initDB()
    const { rows } = await query<BadgeRow>(
      `SELECT ${LIST_COLS}
         FROM saved_badges WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [ownerId],
    )
    return rows.map(rowToBadge)
  } catch {
    return []
  }
}

export async function getSavedBadge(ownerId: string, id: number): Promise<SavedBadge | null> {
  await initDB()
  const { rows } = await query<BadgeRow>(
    `SELECT ${LIST_COLS}
       FROM saved_badges WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  )
  return rows[0] ? rowToBadge(rows[0]) : null
}

/** Fetch the stored SVG snapshot bytes for a saved badge, or null. */
export async function getSavedBadgeSvg(ownerId: string, id: number): Promise<Buffer | null> {
  try {
    await initDB()
    const { rows } = await query<{ svg: Buffer | null }>(
      `SELECT svg FROM saved_badges WHERE id = $1 AND owner_id = $2`,
      [id, ownerId],
    )
    return rows[0]?.svg ?? null
  } catch {
    return null
  }
}

export async function countSavedBadges(ownerId: string): Promise<number> {
  await initDB()
  const { rows } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM saved_badges WHERE owner_id = $1`,
    [ownerId],
  )
  return Number(rows[0]?.n ?? 0)
}

export interface SavedBadgeInput {
  name: string
  alt: string
  config: unknown
  /** Optional rendered SVG snapshot bytes. */
  svg?: Buffer | null
}

/**
 * Create a new saved badge. Enforces `limit` (the plan's cap) — throws
 * "badge limit reached" when the owner is already at the cap.
 */
export async function createSavedBadge(
  ownerId: string,
  userId: string | null,
  input: SavedBadgeInput,
  limit: number,
): Promise<SavedBadge> {
  if ((await countSavedBadges(ownerId)) >= limit) {
    throw new Error("badge limit reached")
  }
  const { rows } = await query<BadgeRow>(
    `INSERT INTO saved_badges (owner_id, user_id, name, alt, config, svg)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING ${LIST_COLS}`,
    [
      ownerId,
      userId,
      input.name.slice(0, 200),
      input.alt.slice(0, 300),
      JSON.stringify(input.config ?? {}),
      input.svg ?? null,
    ],
  )
  return rowToBadge(rows[0])
}

/**
 * Update a saved badge. `svg === undefined` leaves the stored snapshot as-is;
 * pass a Buffer to replace it or `null` to clear it.
 */
export async function updateSavedBadge(
  ownerId: string,
  id: number,
  input: SavedBadgeInput,
): Promise<SavedBadge | null> {
  await initDB()
  const setSvg = input.svg !== undefined
  const { rows } = await query<BadgeRow>(
    `UPDATE saved_badges
        SET name = $3, alt = $4, config = $5::jsonb,
            svg = CASE WHEN $6 THEN $7 ELSE svg END,
            updated_at = NOW()
      WHERE id = $1 AND owner_id = $2
     RETURNING ${LIST_COLS}`,
    [
      id,
      ownerId,
      input.name.slice(0, 200),
      input.alt.slice(0, 300),
      JSON.stringify(input.config ?? {}),
      setSvg,
      setSvg ? (input.svg ?? null) : null,
    ],
  )
  return rows[0] ? rowToBadge(rows[0]) : null
}

export async function deleteSavedBadge(ownerId: string, id: number): Promise<boolean> {
  await initDB()
  const { rowCount } = await query(
    `DELETE FROM saved_badges WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  )
  return (rowCount ?? 0) > 0
}
