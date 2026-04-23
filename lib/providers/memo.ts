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

import type { BadgeData } from "@/lib/badges/types"
import { getPool, initDB } from "@/lib/db"

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
  // Simple hash for token comparison (not crypto-grade, but sufficient for badge auth)
  let hash = 0
  for (let i = 0; i < token.length; i++) {
    const chr = token.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return hash.toString(36)
}

/**
 * Get a memo badge by key.
 */
export async function getMemoBadge(key: string): Promise<BadgeData | null> {
  try {
    await ensureTable()
    const db = getPool()
    // Clean expired badges
    await db.query(`DELETE FROM memo_badges WHERE expires_at < NOW()`)

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

    // Check if badge exists and token matches
    const existing = await db.query(
      `SELECT token_hash FROM memo_badges WHERE key = $1 AND expires_at > NOW()`,
      [key]
    )

    if (existing.rows.length > 0 && existing.rows[0].token_hash !== hash) {
      return { ok: false, error: "Token mismatch. This badge was created with a different token." }
    }

    await db.query(
      `INSERT INTO memo_badges (key, label, value, color, token_hash, updated_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '32 days')
       ON CONFLICT (key) DO UPDATE SET
         label = $2, value = $3, color = $4,
         updated_at = NOW(),
         expires_at = NOW() + INTERVAL '32 days'`,
      [key, label, value, color || null, hash]
    )

    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
