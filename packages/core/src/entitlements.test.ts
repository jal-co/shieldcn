/**
 * @shieldcn/core
 * src/entitlements.test.ts
 */

import { describe, it, expect, afterEach } from "vitest"
import {
  planForProduct,
  getPlan,
  ownerIdFromSubscription,
  syncSubscriptionFromPolar,
  syncCustomerStateFromPolar,
  deleteSubscriptionForCustomer,
} from "./entitlements"

describe("planForProduct", () => {
  const prev = { plus: process.env.POLAR_PRODUCT_PLUS }
  afterEach(() => {
    process.env.POLAR_PRODUCT_PLUS = prev.plus
  })

  it("maps configured product ids to plans", () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    expect(planForProduct("prod_plus")).toBe("plus")
  })

  it("falls back to free for unknown / missing products", () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    expect(planForProduct("prod_other")).toBe("free")
    expect(planForProduct(null)).toBe("free")
    expect(planForProduct(undefined)).toBe("free")
  })
})

describe("getPlan dev override", () => {
  const prev = { env: process.env.NODE_ENV, dev: process.env.DEV_PLAN }
  afterEach(() => {
    // Restore (NODE_ENV is readonly-typed; assign through a cast).
    ;(process.env as Record<string, string | undefined>).NODE_ENV = prev.env
    process.env.DEV_PLAN = prev.dev
  })

  it("forces the plan in non-production when DEV_PLAN is set", async () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "development"
    process.env.DEV_PLAN = "plus"
    // Returns before touching the DB, so this needs no database.
    expect(await getPlan("dev-owner")).toBe("plus")
  })

  it("NEVER fires in production, even with DEV_PLAN set", async () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
    process.env.DEV_PLAN = "plus"
    // No DB configured in tests → getPlan fails open to "free". The override
    // must not short-circuit that to "plus".
    expect(await getPlan("prod-owner-" + Date.now())).toBe("free")
  })

  it("ignores invalid DEV_PLAN values", async () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = "development"
    process.env.DEV_PLAN = "pro"
    expect(await getPlan("dev-owner-" + Date.now())).toBe("free")
  })
})

describe("ownerIdFromSubscription", () => {
  it("prefers the customer externalId (the user id)", () => {
    expect(ownerIdFromSubscription({ customer: { externalId: "user_123" } })).toBe("user_123")
  })

  it("falls back to metadata ownerId/orgId for legacy checkouts", () => {
    expect(ownerIdFromSubscription({ metadata: { ownerId: "legacy_1" } })).toBe("legacy_1")
    expect(ownerIdFromSubscription({ metadata: { orgId: "legacy_2" } })).toBe("legacy_2")
  })

  it("returns null when no owner can be resolved", () => {
    expect(ownerIdFromSubscription({})).toBeNull()
    expect(ownerIdFromSubscription({ customer: { externalId: null } })).toBeNull()
  })
})

describe("syncSubscriptionFromPolar", () => {
  const prev = process.env.POLAR_PRODUCT_PLUS
  afterEach(() => { process.env.POLAR_PRODUCT_PLUS = prev })

  it("upserts by owner with the plan mapped from the product", async () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    const calls: { text: string; params: unknown[] }[] = []
    const fakeQuery = async (text: string, params: unknown[]) => { calls.push({ text, params }) }
    await syncSubscriptionFromPolar(fakeQuery, {
      id: "sub_1",
      status: "active",
      productId: "prod_plus",
      customer: { id: "cus_1", externalId: "user_1" },
    })
    expect(calls).toHaveLength(1)
    // params: [owner, customerId, subId, plan, status, periodEnd]
    expect(calls[0].params[0]).toBe("user_1")
    expect(calls[0].params[3]).toBe("plus")
    expect(calls[0].params[4]).toBe("active")
  })

  it("no-ops when the owner can't be resolved", async () => {
    let called = false
    await syncSubscriptionFromPolar(async () => { called = true }, {})
    expect(called).toBe(false)
  })
})

describe("syncCustomerStateFromPolar", () => {
  const prev = process.env.POLAR_PRODUCT_PLUS
  afterEach(() => { process.env.POLAR_PRODUCT_PLUS = prev })

  it("upserts plus from the active subscription in the customer state", async () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    const calls: unknown[][] = []
    await syncCustomerStateFromPolar(async (_t, p) => { calls.push(p) }, {
      id: "cus_1",
      externalId: "user_1",
      activeSubscriptions: [{ id: "sub_1", status: "active", productId: "prod_plus" }],
    })
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe("user_1") // owner
    expect(calls[0][3]).toBe("plus")  // plan
    expect(calls[0][4]).toBe("active")
  })

  it("drops to inactive/free when there is no active subscription", async () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    const calls: unknown[][] = []
    await syncCustomerStateFromPolar(async (_t, p) => { calls.push(p) }, {
      externalId: "user_2",
      activeSubscriptions: [],
    })
    expect(calls).toHaveLength(1)
    expect(calls[0][3]).toBe("free")
    expect(calls[0][4]).toBe("inactive")
  })

  it("no-ops without an externalId", async () => {
    let called = false
    await syncCustomerStateFromPolar(async () => { called = true }, { id: "cus_x" })
    expect(called).toBe(false)
  })
})

describe("deleteSubscriptionForCustomer", () => {
  it("deletes the owner's subscriptions row", async () => {
    const calls: { text: string; params: unknown[] }[] = []
    await deleteSubscriptionForCustomer(async (text, params) => { calls.push({ text, params }) }, {
      id: "cus_1",
      externalId: "user_1",
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].text).toContain("DELETE FROM subscriptions")
    expect(calls[0].params[0]).toBe("user_1")
  })

  it("no-ops without an externalId", async () => {
    let called = false
    await deleteSubscriptionForCustomer(async () => { called = true }, { id: "cus_x" })
    expect(called).toBe(false)
  })
})
