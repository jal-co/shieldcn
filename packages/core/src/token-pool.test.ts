/**
 * shieldcn
 * token-pool.test
 *
 * Covers the encryption-key selection/failure behavior only (encryptToken /
 * decryptToken round-trip via TOKEN_ENCRYPTION_KEY / GITHUB_OAUTH_CLIENT_SECRET,
 * and the production fail-loud path when neither is configured). Pool
 * read/write behavior (addToken, pickToken, invalidateToken) requires DB
 * mocking and is tracked separately as broader token-pool coverage.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
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
