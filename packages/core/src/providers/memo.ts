/**
 * shieldcn
 * lib/providers/memo
 *
 * Memoized badges — badges with memory.
 * Create/update via PUT with Bearer token, read via GET.
 * Expires after 32 days without update.
 *
 * Inspired by badgen.net/memo
 */

import { createHash } from "node:crypto"
import type { BadgeData } from "../badges/types"
import { getPool, initDB } from "../db"

let tableCreated = false

async function ensureTable() {
  if (tableCreated) return
  const db = getPool()
  await initDB()
  await db.query(`
    CREATE TABLE IF NOT EXISTS memo_badges (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      value TEXT NOT NULL,
      color TEXT,
      token_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '32 days')
    );
    CREATE INDEX IF NOT EXISTS idx_memo_expires ON memo_badges (expires_at);
  `)
  tableCreated = true
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Fraction of GETs that also sweep expired badges (was every single GET). */
const CLEANUP_PROBABILITY = 0.02

/**
 * Get a memo badge by key.
 */
export async function getMemoBadge(key: string): Promise<BadgeData | null> {
  try {
    await ensureTable()
    const db = getPool()
    // Occasionally sweep expired badges. Housekeeping, not serving — doesn't
    // need to run on every read.
    if (Math.random() < CLEANUP_PROBABILITY) {
      await db.query(`DELETE FROM memo_badges WHERE expires_at < NOW()`)
    }

    const result = await db.query(
      `SELECT label, value, color FROM memo_badges WHERE key = $1`,
      [key]
    )
    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      label: row.label,
      value: row.value,
      color: row.color || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Create or update a memo badge.
 * Returns true if successful, error string if not.
 */
export async function upsertMemoBadge(
  key: string,
  label: string,
  value: string,
  color: string | undefined,
  bearerToken: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureTable()
    const db = getPool()
    const hash = hashToken(bearerToken)

    // Single atomic conditional upsert instead of a separate check-then-write
    // (which raced: a concurrent request could change the row between the
    // SELECT and the INSERT). The ON CONFLICT WHERE clause only lets the
    // update through when the caller owns the badge (matching token) or the
    // existing badge has expired (up for grabs); otherwise Postgres leaves
    // the row untouched and RETURNING yields no rows, which we treat as a
    // token mismatch below. Also fixes token_hash never being updated on
    // takeover of an expired badge by a new token.
    const result = await db.query(
      `INSERT INTO memo_badges (key, label, value, color, token_hash, updated_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '32 days')
       ON CONFLICT (key) DO UPDATE SET
         label = EXCLUDED.label,
         value = EXCLUDED.value,
         color = EXCLUDED.color,
         token_hash = EXCLUDED.token_hash,
         updated_at = NOW(),
         expires_at = NOW() + INTERVAL '32 days'
       WHERE memo_badges.token_hash = EXCLUDED.token_hash OR memo_badges.expires_at < NOW()
       RETURNING key`,
      [key, label, value, color || null, hash]
    )

    if (result.rows.length === 0) {
      return { ok: false, error: "Token mismatch. This badge was created with a different token." }
    }

    return { ok: true }
  } catch {
    // Don't leak internal error detail (DB error messages, driver internals)
    // into the API response.
    return { ok: false, error: "Failed to save memo badge." }
  }
}
