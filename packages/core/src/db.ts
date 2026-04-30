/**
 * @shieldcn/core
 * src/db.ts
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
      // Enable SSL for known cloud providers or explicit sslmode=require.
      // Docker/local Postgres connections default to no SSL.
      ssl: connString && (
        connString.includes("sslmode=require")
        || connString.includes("neon")
        || connString.includes("railway")
        || connString.includes("supabase")
      )
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

    CREATE TABLE IF NOT EXISTS gen_counter (
      id TEXT PRIMARY KEY DEFAULT 'badges',
      count BIGINT NOT NULL DEFAULT 0
    );
    INSERT INTO gen_counter (id, count) VALUES ('badges', 16000) ON CONFLICT DO NOTHING;

    CREATE TABLE IF NOT EXISTS gen_users (
      owner TEXT PRIMARY KEY,
      avatar_url TEXT NOT NULL,
      repo TEXT NOT NULL,
      badge_count INT NOT NULL DEFAULT 0,
      last_used_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_gen_users_recent
      ON gen_users (last_used_at DESC);
  `)
}
