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
      // Docker/local Postgres connections default to no SSL. Certificate
      // verification is left ON (the pg default) — Neon/Railway/Supabase all
      // present publicly CA-signed certs, so there's no reason to accept a
      // MITM'd connection here. A self-hosted deployment terminating TLS with
      // a private CA should add it via the standard NODE_EXTRA_CA_CERTS env
      // var rather than disabling verification.
      ssl: connString && (
        connString.includes("sslmode=require")
        || connString.includes("neon")
        || connString.includes("railway")
        || connString.includes("supabase")
      )
        ? true
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
      token_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      is_valid BOOLEAN DEFAULT TRUE
    );
    -- token_hash didn't exist on earlier deployments — add it if migrating an
    -- existing table (CREATE TABLE IF NOT EXISTS above is a no-op for those).
    ALTER TABLE github_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
    CREATE INDEX IF NOT EXISTS idx_github_tokens_valid
      ON github_tokens (is_valid) WHERE is_valid = TRUE;
    CREATE INDEX IF NOT EXISTS idx_github_tokens_hash
      ON github_tokens (token_hash) WHERE token_hash IS NOT NULL;

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

    -- ─────────────────────────────────────────────────────────────────────
    -- Brand tables. Brands are admin-managed: owner_id is the admin user id
    -- (Better Auth "user".id). Plain TEXT (FK-by-convention, no hard FK)
    -- because the self-hosted engine may run without the auth tables (it only
    -- reads brands), so a hard FK to "user" would break that split.
    -- ─────────────────────────────────────────────────────────────────────

    -- Stored brands. A brand is a named, reusable set of badge/header style
    -- tokens referenced by URL (?brand=slug or /b/{slug}/...). Editing the
    -- config re-styles every embed that references it on next fetch.
    -- A brand is DB-canonical: config holds the style tokens applied to
    -- badges/headers, profile holds the human brand identity (title,
    -- description, palette) imported from Context.dev / edited on-site, and
    -- brand_md is the portable import/export view of the same record.
    CREATE TABLE IF NOT EXISTS brands (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL,
      name TEXT,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      profile JSONB NOT NULL DEFAULT '{}'::jsonb,
      brand_md TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    -- Add the newer columns to any pre-existing table, and rename a legacy
    -- org_id owner column to owner_id (guarded so re-runs are no-ops).
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_md TEXT;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'brands' AND column_name = 'org_id') THEN
        ALTER TABLE brands RENAME COLUMN org_id TO owner_id;
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_brands_owner ON brands (owner_id);

    -- Hosted brand assets. Served from stable URLs (/b/{slug}/logo-light.svg)
    -- so a rebrand propagates everywhere on next fetch. kind is free-form:
    --   logo-light | logo-dark | mark | wordmark          (images)
    --   font-sans | font-mono | font-heading               (uploaded fonts)
    CREATE TABLE IF NOT EXISTS brand_assets (
      id BIGSERIAL PRIMARY KEY,
      brand_id BIGINT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      content_type TEXT NOT NULL,       -- e.g. 'image/svg+xml', 'font/ttf'
      file_name TEXT,                   -- original upload name (fonts)
      data BYTEA NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (brand_id, kind)
    );
    ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS file_name TEXT;

    -- Per-day badge render rollup (retained for brand-level insight; not
    -- currently surfaced in a dashboard UI).
    -- Written fire-and-forget from the badge track path; queried per brand.
    CREATE TABLE IF NOT EXISTS badge_stats_daily (
      day DATE NOT NULL,
      brand_id BIGINT NOT NULL DEFAULT 0,  -- 0 = no brand (composite PK can't be null)
      provider TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'direct',
      count BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (day, brand_id, provider, subject, source)
    );
    CREATE INDEX IF NOT EXISTS idx_badge_stats_brand
      ON badge_stats_daily (brand_id, day DESC);

    -- Global key/value site settings (admin-controlled feature flags, e.g.
    -- whether brand badges show in the showcase). Tiny; one row per key.
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Cleanup: accounts + the paid tier were removed. Drop the tables that
    -- backed them (billing entitlements, saved badges, cloud Studio docs,
    -- usage metering, brand claims, and Better Auth's org/billing extras).
    -- Guarded IF EXISTS so fresh databases are a no-op.
    DROP TABLE IF EXISTS subscriptions;
    DROP TABLE IF EXISTS saved_badges;
    DROP TABLE IF EXISTS studio_documents;
    DROP TABLE IF EXISTS usage_counters;
    DROP TABLE IF EXISTS brand_claims;
    DROP TABLE IF EXISTS invitation;
    DROP TABLE IF EXISTS member;
    DROP TABLE IF EXISTS organization;
  `)
}
