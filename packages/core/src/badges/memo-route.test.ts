/**
 * shieldcn
 * src/badges/memo-route.test
 *
 * Route-level validation for PUT /memo/... (handleBadgePUT). These all
 * short-circuit before touching Postgres, so they run without DATABASE_URL —
 * unlike providers/memo.test.ts, which covers the DB-backed upsert semantics
 * and is skipped without a real database.
 */

import { describe, it, expect } from "vitest"
import { handleBadgePUT } from "../route-handler"

function put(path: string, slug: string[], opts: { auth?: string; ip?: string } = {}) {
  const headers: Record<string, string> = {}
  if (opts.auth !== undefined) headers.authorization = opts.auth
  if (opts.ip) headers["x-forwarded-for"] = opts.ip
  return handleBadgePUT(new Request(`https://x.dev${path}`, { method: "PUT", headers }), slug)
}

describe("handleBadgePUT /memo validation", () => {
  it("400s on an incomplete memo path", async () => {
    const res = await put("/memo/key", ["memo", "key"], { auth: "Bearer t", ip: "1.1.1.1" })
    expect(res.status).toBe(400)
  })

  it("401s when the Authorization header is missing", async () => {
    const res = await put("/memo/k/l/v", ["memo", "k", "l", "v"], { ip: "1.1.1.2" })
    expect(res.status).toBe(401)
  })

  it("401s on an empty bearer token", async () => {
    const res = await put("/memo/k/l/v", ["memo", "k", "l", "v"], { auth: "Bearer ", ip: "1.1.1.3" })
    expect(res.status).toBe(401)
  })

  it("400s when the key exceeds 200 characters", async () => {
    const longKey = "k".repeat(201)
    const res = await put(`/memo/${longKey}/l/v`, ["memo", longKey, "l", "v"], { auth: "Bearer t", ip: "1.1.1.4" })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/too long/i)
  })

  it("400s on malformed percent-encoding instead of throwing an unhandled 500", async () => {
    // "%zz" is not valid percent-encoding — decodeURIComponent throws a raw URIError on this.
    const res = await put("/memo/k/%zz/v", ["memo", "k", "%zz", "v"], { auth: "Bearer t", ip: "1.1.1.5" })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/invalid url encoding/i)
  })

  it("400s when label/value/color exceed 100 characters", async () => {
    const longValue = "v".repeat(101)
    const res = await put(`/memo/k/l/${longValue}`, ["memo", "k", "l", longValue], { auth: "Bearer t", ip: "1.1.1.6" })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/100 characters/i)
  })

  it("429s after exceeding the per-IP write rate limit", async () => {
    // The 20 requests under the limit still reach upsertMemoBadge, which — with
    // no DATABASE_URL configured — retries once after a 250ms pause on each
    // connection error (db.ts's query(), a deliberate serverless-Postgres-
    // wake-up retry, not a bug). 20 × ~250ms comes in right at vitest's 5s
    // default, so this needs real headroom rather than a tighter budget.
    const ip = "1.1.1.7"
    let lastStatus = 0
    for (let i = 0; i < 21; i++) {
      const res = await put("/memo/k/l/v", ["memo", "k", "l", "v"], { auth: "Bearer t", ip })
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  }, 15_000)
})
