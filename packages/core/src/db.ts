/**
 * @shieldcn/core
 * src/db.ts
 *
 * Postgres connection + schema initialization.
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg"

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const connString = process.env.DATABASE_URL
    pool = new Pool({
      connectionString: connString,
      max: 5,
      // The pool is designed to let a serverless Postgres (e.g. Neon) autosuspend
      // when badge traffic is served from the in-memory token cache. Two settings
      // make the next request after a suspend reliable rather than handing out a
      // dead socket:
      //   - idleTimeoutMillis: close our own idle connections quickly, before the
      //     provider tears them down on suspend, so we rarely hold a dead client.
      //   - connectionTimeoutMillis: bound how long a brand-new connection waits
      //     while the database wakes, so a hung connect fails fast and `query()`
      //     can retry instead of stalling the request.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
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
    // node-postgres emits 'error' on idle clients that the server drops (exactly
    // what happens when a serverless DB suspends). Without a listener this throws
    // and can crash the process; swallow it — the dead client is removed from the
    // pool and the next checkout opens a fresh one.
    pool.on("error", () => {})
  }
  return pool
}

/**
 * True when an error looks like a transient connection failure (server dropped
 * an idle socket, a wake-from-suspend race, a connect timeout) rather than a
 * real query/logic error. These are safe to retry once with a fresh connection.
 */
function isTransientConnectionError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined
  if (!e) return false
  const code = e.code
  if (code && [
    "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ENOTFOUND",
    "57P01", // admin_shutdown — server terminated the connection
    "57P03", // cannot_connect_now — server still starting up (waking)
    "08006", // connection_failure
    "08001", // sqlclient_unable_to_establish_sqlconnection
    "08003", // connection_does_not_exist
  ].includes(code)) return true
  const msg = e.message ?? ""
  return (
    msg.includes("Connection terminated") ||
    msg.includes("connection timeout") ||
    msg.includes("timeout exceeded when trying to connect") ||
    msg.includes("terminating connection") ||
    msg.includes("Client has encountered a connection error")
  )
}

/**
 * Run a query with one retry on a transient connection failure.
 *
 * A serverless Postgres that has autosuspended often rejects the very first
 * query (the pool hands out a socket the server already closed, or the connect
 * races the wake) but succeeds on the retry once it's awake. Routing all DB
 * access through here means a wake-from-suspend shows up as a ~1s slower request
 * instead of a hard failure — which is what surfaced as "db store failed" when
 * users tried to add a token to the pool.
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<R>> {
  const db = getPool()
  try {
    return await db.query<R>(text, params as never)
  } catch (err) {
    if (!isTransientConnectionError(err)) throw err
    // Brief pause to let the database finish waking, then retry once on a fresh
    // connection from the pool.
    await new Promise((r) => setTimeout(r, 250))
    return await db.query<R>(text, params as never)
  }
}

export type { PoolClient }

/**
 * Initialize the database schema.
 * Called on first request or at startup.
 */
export async function initDB() {
  await query(`
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
