/**
 * shieldcn
 * lib/db
 *
 * Postgres connection + schema initialization.
 */

import { Pool } from "pg"

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const connString = process.env.DATABASE_URL
    pool = new Pool({
      connectionString: connString,
      max: 5,
      // Neon, Railway, Supabase all need SSL
      ssl: connString && (connString.includes("neon") || connString.includes("railway") || connString.includes("supabase"))
        ? { rejectUnauthorized: false }
        : undefined,
    })
  }
  return pool
}

/**
 * Initialize the database schema.
 * Called on first request or at startup.
 */
export async function initDB() {
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS github_tokens (
      id SERIAL PRIMARY KEY,
      github_user TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      is_valid BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_github_tokens_valid
      ON github_tokens (is_valid) WHERE is_valid = TRUE;
  `)
}
