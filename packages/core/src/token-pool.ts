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
}

/**
 * Pick a random valid token from the pool.
 * Falls back to GITHUB_TOKEN env var if pool is empty.
 * Returns undefined if no tokens available.
 */
export async function pickToken(): Promise<string | undefined> {
  // Try the pool first
  try {
    await ensureInit()
    const db = getPool()

    // Periodically clean up invalid tokens older than 7 days
    await db.query(
      `DELETE FROM github_tokens WHERE is_valid = FALSE AND last_used_at < NOW() - INTERVAL '7 days'`
    )

    const result = await db.query(
      `UPDATE github_tokens
       SET last_used_at = NOW()
       WHERE id = (
         SELECT id FROM github_tokens
         WHERE is_valid = TRUE
         ORDER BY last_used_at ASC NULLS FIRST
         LIMIT 1
       )
       RETURNING access_token`
    )
    if (result.rows.length > 0) {
      return decryptToken(result.rows[0].access_token)
    }
  } catch {
    // DB not available — fall through to env var
  }

  // Fallback to env var
  return process.env.GITHUB_TOKEN || undefined
}

/**
 * Mark a token as invalid (e.g. after a 401 response from GitHub).
 */
export async function invalidateToken(accessToken: string) {
  try {
    await ensureInit()
    const db = getPool()
    // We can't match on encrypted token directly, so find by decrypting
    // For efficiency, mark all tokens invalid that fail auth — GitHub will
    // reject them anyway. In practice, the caller retries without auth.
    // Better approach: store a hash of the plaintext for lookup.
    const result = await db.query(
      `SELECT id, access_token FROM github_tokens WHERE is_valid = TRUE`
    )
    for (const row of result.rows) {
      try {
        if (decryptToken(row.access_token) === accessToken) {
          await db.query(`UPDATE github_tokens SET is_valid = FALSE WHERE id = $1`, [row.id])
          return
        }
      } catch {
        // Decryption failed — token was stored with different key, mark invalid
        await db.query(`UPDATE github_tokens SET is_valid = FALSE WHERE id = $1`, [row.id])
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
