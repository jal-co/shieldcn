/**
 * @shieldcn/core
 * src/entitlements.test.ts
 */

import { describe, it, expect, afterEach } from "vitest"
import { planForProduct } from "./entitlements"

describe("planForProduct", () => {
  const prev = { plus: process.env.POLAR_PRODUCT_PLUS, pro: process.env.POLAR_PRODUCT_PRO }
  afterEach(() => {
    process.env.POLAR_PRODUCT_PLUS = prev.plus
    process.env.POLAR_PRODUCT_PRO = prev.pro
  })

  it("maps configured product ids to plans", () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    process.env.POLAR_PRODUCT_PRO = "prod_pro"
    expect(planForProduct("prod_plus")).toBe("plus")
    expect(planForProduct("prod_pro")).toBe("pro")
  })

  it("falls back to free for unknown / missing products", () => {
    process.env.POLAR_PRODUCT_PLUS = "prod_plus"
    process.env.POLAR_PRODUCT_PRO = "prod_pro"
    expect(planForProduct("prod_other")).toBe("free")
    expect(planForProduct(null)).toBe("free")
    expect(planForProduct(undefined)).toBe("free")
  })
})
