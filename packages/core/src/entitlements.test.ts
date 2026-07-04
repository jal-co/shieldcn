/**
 * @shieldcn/core
 * src/entitlements.test.ts
 */

import { describe, it, expect, afterEach } from "vitest"
import { planForProduct } from "./entitlements"

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
    process.env.POLAR_PRODUCT_PRO = "prod_pro"
    expect(planForProduct("prod_other")).toBe("free")
    expect(planForProduct(null)).toBe("free")
    expect(planForProduct(undefined)).toBe("free")
  })
})
