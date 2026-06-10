/**
 * shieldcn
 * lib/token-pool
 *
 * GitHub token pool for distributing API requests across many tokens.
 *
 * Inspired by shields.io's token pool system:
 * https://shields.io/blog/2024-11-14-how-shields-io-uses-the-github-api
 *
 * Users authorize the shieldcn OAuth app, which gives us a read-only token.
 * We add it to a pool and rotate through tokens to stay under GitHub's
 * 5,000 requests/hour/token rate limit.
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { getPool, initDB } from "./db"

let initialized = false

async function ensureInit() {
  if (!initialized) {
    await initDB()
    initialized = true
  }
}

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------
//
// Decrypted tokens are cached in process memory only — never in Redis or any
// external store. The process already holds decrypted tokens transiently on
// every request (and the encryption key lives in the same env), so this adds
// no new exposure. Tokens are zero-scope (read-only public data).
//
// The cache exists so badge traffic doesn't query the database on every
// request: without it, the Neon endpoint can never autosuspend and burns
// compute 24/7. The TTL is deliberately longer than Neon's 5-minute
// autosuspend window. Revoked tokens self-heal faster than the TTL because
// invalidateToken() also drops them from this cache.

let tokenCache: string[] = []
let tokenCacheExpires = 0

/** How long to serve tokens from memory before re-reading the pool. */
const TOKEN_CACHE_TTL_MS = 10 * 60 * 1000

/** Re-check an empty pool (or an unreachable DB) sooner than a full pool. */
const EMPTY_POOL_TTL_MS = 5 * 60 * 1000

/** Max tokens held in memory per refresh. */
const TOKEN_CACHE_SIZE = 25

/** Fraction of pool refreshes that also sweep old invalid tokens. */
const CLEANUP_PROBABILITY = 0.02

/** Expire the cache so the next pick re-reads the pool. */
function expireTokenCache() {
  tokenCacheExpires = 0
}

// Tokens invalidated recently (e.g. 401 from GitHub), keyed by invalidation
// time. A cache refresh racing with invalidateToken can SELECT a snapshot
// from before the invalidation committed and would re-admit the revoked
// token — refreshes filter against this set to prevent that. Entries expire
// after one cache TTL, by which point the DB row is marked invalid.
const recentlyInvalidated = new Map<string, number>()

function pruneRecentlyInvalidated(now: number) {
  for (const [token, at] of recentlyInvalidated) {
    if (now - at > TOKEN_CACHE_TTL_MS) recentlyInvalidated.delete(token)
  }
}

function randomCachedToken(): string | undefined {
  if (tokenCache.length === 0) return undefined
  return tokenCache[Math.floor(Math.random() * tokenCache.length)]
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/** Encryption key derived from GITHUB_OAUTH_CLIENT_SECRET or a fallback. */
function getEncryptionKey(): Buffer {
  const secret = process.env.GITHUB_OAUTH_CLIENT_SECRET || process.env.GITHUB_TOKEN || "shieldcn-dev-key"
  return createHash("sha256").update(secret).digest()
}

/** Encrypt a token for storage. Returns "iv:encrypted" hex string. */
function encryptToken(token: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-cbc", key, iv)
  let encrypted = cipher.update(token, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

/** Decrypt a stored token. */
function decryptToken(stored: string): string {
  const key = getEncryptionKey()
  const [ivHex, encrypted] = stored.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const decipher = createDecipheriv("aes-256-cbc", key, iv)
  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

/** SHA-256 hash for token identity (used for auth matching, not reversible). */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Add or update a token in the pool.
 */
export async function addToken(githubUser: string, accessToken: string) {
  await ensureInit()
  const db = getPool()
  const encrypted = encryptToken(accessToken)
  await db.query(
    `INSERT INTO github_tokens (github_user, access_token, is_valid)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (github_user)
     DO UPDATE SET access_token = $2, is_valid = TRUE, created_at = NOW()`,
    [githubUser, encrypted]
  )
  expireTokenCache()
}

/**
 * Pick a random valid token from the pool.
 * Falls back to GITHUB_TOKEN env var if pool is empty.
 * Returns undefined if no tokens available.
 *
 * Reads the pool from the in-memory cache; the database is only queried when
 * the cache expires, so badge traffic doesn't keep the DB awake. An empty
 * pool is cached too — while running on the env-var fallback, the badge path
 * makes no DB queries at all.
 */
export async function pickToken(): Promise<string | undefined> {
  if (Date.now() < tokenCacheExpires) {
    return randomCachedToken() ?? process.env.GITHUB_TOKEN ?? undefined
  }

  try {
    await ensureInit()
    const db = getPool()

    // Occasionally sweep invalid tokens that haven't healed in 7 days.
    // Kept off the per-request path — this is housekeeping, not serving.
    if (Math.random() < CLEANUP_PROBABILITY) {
      await db.query(
        `DELETE FROM github_tokens
         WHERE is_valid = FALSE
           AND COALESCE(last_used_at, created_at) < NOW() - INTERVAL '7 days'`
      )
    }

    const result = await db.query(
      `SELECT access_token FROM github_tokens
       WHERE is_valid = TRUE
       ORDER BY random()
       LIMIT $1`,
      [TOKEN_CACHE_SIZE]
    )

    const now = Date.now()
    pruneRecentlyInvalidated(now)
    const tokens: string[] = []
    for (const row of result.rows) {
      try {
        const token = decryptToken(row.access_token)
        // Skip tokens invalidated while this SELECT was in flight — the
        // snapshot may predate the invalidation commit.
        if (!recentlyInvalidated.has(token)) {
          tokens.push(token)
        }
      } catch {
        // Stored with a different key — unusable, skip. The cleanup sweep
        // (via invalidateToken on 401) eventually removes these.
      }
    }
    tokenCache = tokens
    tokenCacheExpires =
      Date.now() + (tokens.length > 0 ? TOKEN_CACHE_TTL_MS : EMPTY_POOL_TTL_MS)
  } catch {
    // DB not available — back off briefly so we don't hammer a down DB,
    // then fall through to the env var.
    tokenCache = []
    tokenCacheExpires = Date.now() + EMPTY_POOL_TTL_MS
  }

  return randomCachedToken() ?? process.env.GITHUB_TOKEN ?? undefined
}

/**
 * Mark a token as invalid (e.g. after a 401 response from GitHub).
 */
export async function invalidateToken(accessToken: string) {
  // Drop it from the in-memory cache immediately so this instance stops
  // using it without waiting for the cache TTL, and remember it so a
  // concurrent cache refresh can't re-admit it from a pre-commit snapshot.
  recentlyInvalidated.set(accessToken, Date.now())
  tokenCache = tokenCache.filter((t) => t !== accessToken)

  try {
    await ensureInit()
    const db = getPool()
    // We can't match on encrypted token directly, so find by decrypting
    // For efficiency, mark all tokens invalid that fail auth — GitHub will
    // reject them anyway. In practice, the caller retries without auth.
    // Better approach: store a hash of the plaintext for lookup.
    // last_used_at records when the token was invalidated, so the cleanup
    // sweep in pickToken can remove it 7 days later.
    const result = await db.query(
      `SELECT id, access_token FROM github_tokens WHERE is_valid = TRUE`
    )
    for (const row of result.rows) {
      try {
        if (decryptToken(row.access_token) === accessToken) {
          await db.query(
            `UPDATE github_tokens SET is_valid = FALSE, last_used_at = NOW() WHERE id = $1`,
            [row.id]
          )
          return
        }
      } catch {
        // Decryption failed — token was stored with different key, mark invalid
        await db.query(
          `UPDATE github_tokens SET is_valid = FALSE, last_used_at = NOW() WHERE id = $1`,
          [row.id]
        )
      }
    }
  } catch {
    // Silently ignore DB errors
  }
}

/**
 * Remove a user's token from the pool (when they revoke OAuth).
 */
export async function removeToken(githubUser: string) {
  await ensureInit()
  const db = getPool()
  await db.query(
    `DELETE FROM github_tokens WHERE github_user = $1`,
    [githubUser]
  )
  expireTokenCache()
}

/**
 * Get pool stats.
 */
export async function getPoolStats(): Promise<{
  total: number
  valid: number
  invalid: number
}> {
  try {
    await ensureInit()
    const db = getPool()
    const result = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE is_valid = TRUE) as valid,
         COUNT(*) FILTER (WHERE is_valid = FALSE) as invalid
       FROM github_tokens`
    )
    const row = result.rows[0]
    return {
      total: parseInt(row.total),
      valid: parseInt(row.valid),
      invalid: parseInt(row.invalid),
    }
  } catch {
    return { total: 0, valid: 0, invalid: 0 }
  }
}
