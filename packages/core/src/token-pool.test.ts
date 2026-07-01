/**
 * shieldcn
 * token-pool.test
 *
 * Covers the encryption-key selection/failure behavior (encryptToken /
 * decryptToken round-trip via TOKEN_ENCRYPTION_KEY / GITHUB_OAUTH_CLIENT_SECRET,
 * and the production fail-loud path when neither is configured), plus the
 * token_hash indexed-lookup fix for invalidateToken() against a real
 * Postgres (skipped without DATABASE_URL — see providers/memo.test.ts for
 * the same convention and rationale).
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest"
import { encryptToken, decryptToken } from "./token-pool"

const ENV_KEYS = ["TOKEN_ENCRYPTION_KEY", "GITHUB_OAUTH_CLIENT_SECRET", "GITHUB_TOKEN", "NODE_ENV"] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe("token-pool encryption key selection", () => {
  it("round-trips a token when TOKEN_ENCRYPTION_KEY is set", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "a-real-secret-key"
    const encrypted = encryptToken("ghp_example123")
    expect(encrypted).toContain(":")
    expect(decryptToken(encrypted)).toBe("ghp_example123")
  })

  it("round-trips a token when only GITHUB_OAUTH_CLIENT_SECRET is set", () => {
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "oauth-app-secret"
    const encrypted = encryptToken("ghp_example456")
    expect(decryptToken(encrypted)).toBe("ghp_example456")
  })

  it("prefers TOKEN_ENCRYPTION_KEY over GITHUB_OAUTH_CLIENT_SECRET when both are set", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "key-a"
    process.env.GITHUB_OAUTH_CLIENT_SECRET = "key-b"
    const encrypted = encryptToken("ghp_pref")

    // Decrypting under key-b alone must fail (garbage or throw) — proves key-a won.
    delete process.env.TOKEN_ENCRYPTION_KEY
    let decryptedWithWrongKey: string | undefined
    try {
      decryptedWithWrongKey = decryptToken(encrypted)
    } catch {
      decryptedWithWrongKey = undefined
    }
    expect(decryptedWithWrongKey).not.toBe("ghp_pref")

    process.env.TOKEN_ENCRYPTION_KEY = "key-a"
    expect(decryptToken(encrypted)).toBe("ghp_pref")
  })

  it("throws in production when no encryption key is configured", () => {
    process.env.NODE_ENV = "production"
    expect(() => encryptToken("ghp_shouldfail")).toThrow(/encryption key is not configured/i)
  })

  it("falls back to a dev key outside production so local dev works unconfigured", () => {
    process.env.NODE_ENV = "test"
    const encrypted = encryptToken("ghp_devfallback")
    expect(decryptToken(encrypted)).toBe("ghp_devfallback")
  })

  it("uses GITHUB_TOKEN as the dev-mode fallback key when set", () => {
    process.env.NODE_ENV = "test"
    process.env.GITHUB_TOKEN = "gho_personalaccesstoken"
    const encrypted = encryptToken("ghp_viagithubtoken")
    expect(decryptToken(encrypted)).toBe("ghp_viagithubtoken")
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)("token_hash indexed lookup (real Postgres)", () => {
  let addToken: typeof import("./token-pool").addToken
  let invalidateToken: typeof import("./token-pool").invalidateToken
  let getPool: typeof import("./db").getPool

  beforeAll(async () => {
    const pool = await import("./token-pool")
    const db = await import("./db")
    addToken = pool.addToken
    invalidateToken = pool.invalidateToken
    getPool = db.getPool
  })

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-key-for-token-pool-db-tests"
  })

  afterEach(async () => {
    await getPool().query(`DELETE FROM github_tokens WHERE github_user LIKE 'test-%'`)
  })

  afterAll(async () => {
    await getPool().end()
  })

  it("stores a token_hash when a token is added", async () => {
    await addToken("test-user-1", "ghp_tokenone")
    const row = await getPool().query(`SELECT token_hash FROM github_tokens WHERE github_user = $1`, ["test-user-1"])
    expect(row.rows[0].token_hash).toBeTruthy()
    expect(row.rows[0].token_hash).toHaveLength(64) // sha256 hex
  })

  it("updates token_hash when a user re-authorizes with a new token (ON CONFLICT path)", async () => {
    await addToken("test-user-2", "ghp_original")
    const first = await getPool().query(`SELECT token_hash FROM github_tokens WHERE github_user = $1`, ["test-user-2"])

    await addToken("test-user-2", "ghp_replacement")
    const second = await getPool().query(`SELECT token_hash FROM github_tokens WHERE github_user = $1`, ["test-user-2"])

    expect(second.rows[0].token_hash).not.toBe(first.rows[0].token_hash)
  })

  it("invalidates the correct row via the fast token_hash path, without touching others", async () => {
    await addToken("test-user-3", "ghp_target")
    await addToken("test-user-4", "ghp_bystander")

    await invalidateToken("ghp_target")

    const target = await getPool().query(`SELECT is_valid FROM github_tokens WHERE github_user = $1`, ["test-user-3"])
    const bystander = await getPool().query(`SELECT is_valid FROM github_tokens WHERE github_user = $1`, ["test-user-4"])
    expect(target.rows[0].is_valid).toBe(false)
    expect(bystander.rows[0].is_valid).toBe(true)
  })

  it("falls back to the legacy scan for a pre-migration row with no token_hash", async () => {
    // Simulate a row written before the token_hash column existed: insert
    // directly with token_hash left NULL, bypassing addToken().
    const { encryptToken: encrypt } = await import("./token-pool")
    const encrypted = encrypt("ghp_legacy")
    await getPool().query(
      `INSERT INTO github_tokens (github_user, access_token, token_hash, is_valid) VALUES ($1, $2, NULL, TRUE)`,
      ["test-user-legacy", encrypted],
    )

    await invalidateToken("ghp_legacy")

    const row = await getPool().query(`SELECT is_valid FROM github_tokens WHERE github_user = $1`, ["test-user-legacy"])
    expect(row.rows[0].is_valid).toBe(false)
  })

  it("does not throw when invalidating a token that isn't in the pool", async () => {
    await expect(invalidateToken("ghp_never_added")).resolves.toBeUndefined()
  })
})
