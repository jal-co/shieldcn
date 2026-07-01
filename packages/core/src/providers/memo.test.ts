/**
 * shieldcn
 * providers/memo.test
 *
 * Covers the atomic-upsert fix for the memo badge provider: token_hash is
 * now updated on takeover of an expired badge, and the previous
 * check-then-write is a single conditional upsert (no TOCTOU race).
 *
 * Runs for real against Postgres when DATABASE_URL is set (skipped
 * otherwise, same convention as views-route.test.ts's DB-less fallback
 * path) — these assertions depend on exact Postgres ON CONFLICT ... WHERE
 * semantics that a hand-rolled mock can't faithfully reproduce.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)("memo badge provider (real Postgres)", () => {
  let getMemoBadge: typeof import("./memo").getMemoBadge
  let upsertMemoBadge: typeof import("./memo").upsertMemoBadge
  let getPool: typeof import("../db").getPool

  beforeAll(async () => {
    const memo = await import("./memo")
    const db = await import("../db")
    getMemoBadge = memo.getMemoBadge
    upsertMemoBadge = memo.upsertMemoBadge
    getPool = db.getPool
    // Force table creation before the first test.
    await upsertMemoBadge("__init__", "x", "1", undefined, "t")
  })

  afterEach(async () => {
    await getPool().query(`DELETE FROM memo_badges WHERE key LIKE 'test-%' OR key = '__init__'`)
  })

  afterAll(async () => {
    await getPool().end()
  })

  it("creates a new badge and reads it back", async () => {
    const result = await upsertMemoBadge("test-create", "builds", "42", "green", "token-a")
    expect(result.ok).toBe(true)

    const badge = await getMemoBadge("test-create")
    expect(badge).toEqual({ label: "builds", value: "42", color: "green" })
  })

  it("allows the same token to update its own badge", async () => {
    await upsertMemoBadge("test-update", "builds", "1", undefined, "token-b")
    const result = await upsertMemoBadge("test-update", "builds", "2", undefined, "token-b")
    expect(result.ok).toBe(true)

    const badge = await getMemoBadge("test-update")
    expect(badge?.value).toBe("2")
  })

  it("rejects a different token trying to update a live badge", async () => {
    await upsertMemoBadge("test-mismatch", "builds", "1", undefined, "token-owner")
    const result = await upsertMemoBadge("test-mismatch", "builds", "2", undefined, "token-attacker")
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/token mismatch/i)

    // The value must be unchanged — the blocked write had no effect.
    const badge = await getMemoBadge("test-mismatch")
    expect(badge?.value).toBe("1")
  })

  it("does not leak internal error detail on failure", async () => {
    const result = await upsertMemoBadge("test-mismatch2", "builds", "1", undefined, "owner")
    await upsertMemoBadge("test-mismatch2", "builds", "1", undefined, "owner")
    const blocked = await upsertMemoBadge("test-mismatch2", "builds", "2", undefined, "someone-else")
    expect(result.ok).toBe(true)
    expect(blocked.error).toBe("Token mismatch. This badge was created with a different token.")
    // No stack traces, driver error codes, or raw exception text.
    expect(blocked.error).not.toMatch(/error:|at |PostgresError|node_modules/i)
  })

  it("lets a new token take over an EXPIRED badge and updates token_hash (the bug this fixes)", async () => {
    const pool = getPool()
    await upsertMemoBadge("test-expired", "builds", "old", undefined, "old-token")
    // Force it into the past — simulates the 32-day expiry window elapsing.
    await pool.query(`UPDATE memo_badges SET expires_at = NOW() - INTERVAL '1 day' WHERE key = $1`, ["test-expired"])

    // A NEW token takes over the expired key.
    const takeover = await upsertMemoBadge("test-expired", "builds", "new", undefined, "new-token")
    expect(takeover.ok).toBe(true)
    const badge = await getMemoBadge("test-expired")
    expect(badge?.value).toBe("new")

    // The bug this fixes: token_hash must now be the NEW token's hash, so
    // the new owner's next write isn't rejected as a "mismatch" against the
    // stale old token_hash.
    const secondUpdate = await upsertMemoBadge("test-expired", "builds", "newer", undefined, "new-token")
    expect(secondUpdate.ok).toBe(true)
    expect((await getMemoBadge("test-expired"))?.value).toBe("newer")

    // And the OLD token must no longer work.
    const oldTokenRejected = await upsertMemoBadge("test-expired", "builds", "old-again", undefined, "old-token")
    expect(oldTokenRejected.ok).toBe(false)
  })
})

describe.skipIf(hasDb)("memo badge provider (no DATABASE_URL)", () => {
  it("is skipped in this environment — see the real-Postgres suite above", () => {
    expect(hasDb).toBe(false)
  })
})
