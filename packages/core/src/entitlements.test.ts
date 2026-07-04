/**
 * @shieldcn/core
 * src/entitlements.test.ts
 */

import { describe, it, expect, afterEach } from "vitest"
import { planForProduct, getPlan } from "./entitlements"

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
