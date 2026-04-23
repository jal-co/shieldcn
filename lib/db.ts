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
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: process.env.DATABASE_URL?.includes("railway")
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
