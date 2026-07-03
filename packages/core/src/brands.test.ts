/**
 * @shieldcn/core
 * src/brands.test.ts
 *
 * Pure-function tests for brand slug validation and param merging (no DB).
 */

import { describe, it, expect } from "vitest"
import { isValidBrandSlug, applyBrandToParams, type BrandConfig } from "./brands"

describe("isValidBrandSlug", () => {
  it("accepts lowercase alphanumeric slugs with internal hyphens", () => {
    expect(isValidBrandSlug("acme")).toBe(true)
    expect(isValidBrandSlug("acme-corp")).toBe(true)
    expect(isValidBrandSlug("a1")).toBe(true)
  })

  it("rejects uppercase, edge hyphens, and too-short/long slugs", () => {
    expect(isValidBrandSlug("Acme")).toBe(false)
    expect(isValidBrandSlug("-acme")).toBe(false)
    expect(isValidBrandSlug("acme-")).toBe(false)
    expect(isValidBrandSlug("acme--corp")).toBe(true) // internal hyphens allowed
    expect(isValidBrandSlug("a".repeat(41))).toBe(false)
  })

  it("rejects reserved slugs", () => {
    expect(isValidBrandSlug("logo")).toBe(false)
    expect(isValidBrandSlug("api")).toBe(false)
    expect(isValidBrandSlug("shieldcn")).toBe(false)
  })
})

describe("applyBrandToParams", () => {
  const config: BrandConfig = { theme: "blue", variant: "branded", font: "geist" }

  it("fills in brand values when the param is absent", () => {
    const merged = applyBrandToParams(new URLSearchParams(""), config)
    expect(merged.get("theme")).toBe("blue")
    expect(merged.get("variant")).toBe("branded")
    expect(merged.get("font")).toBe("geist")
  })

  it("lets explicit query params win over brand values", () => {
    const merged = applyBrandToParams(new URLSearchParams("theme=rose"), config)
    expect(merged.get("theme")).toBe("rose") // query wins
    expect(merged.get("variant")).toBe("branded") // brand fills the gap
  })

  it("does not mutate the input params", () => {
    const input = new URLSearchParams("theme=rose")
    applyBrandToParams(input, config)
    expect(input.get("variant")).toBeNull()
  })
})
