/**
 * shieldcn
 * provider-fetch.test
 *
 * Regression lock for item P7: str()/num() replace unchecked `as string`/
 * `as number` casts on parsed upstream JSON, so a schema shift (a field
 * turning into an object/null/NaN) surfaces as a missing value instead of
 * a "[object Object]" badge or a cast that silently lies to the type
 * checker.
 */

import { describe, it, expect } from "vitest"
import { str, num } from "./provider-fetch"

describe("str", () => {
  it("passes a string through unchanged", () => {
    expect(str("MIT")).toBe("MIT")
    expect(str("")).toBe("")
  })

  it("returns undefined for non-string JSON values", () => {
    expect(str(42)).toBeUndefined()
    expect(str(null)).toBeUndefined()
    expect(str(undefined)).toBeUndefined()
    expect(str({ spdx_id: "MIT" })).toBeUndefined()
    expect(str(["MIT"])).toBeUndefined()
    expect(str(true)).toBeUndefined()
  })
})

describe("num", () => {
  it("passes a finite number through unchanged", () => {
    expect(num(0)).toBe(0)
    expect(num(-5)).toBe(-5)
    expect(num(1234.5)).toBe(1234.5)
  })

  it("returns undefined for non-number JSON values", () => {
    expect(num("42")).toBeUndefined()
    expect(num(null)).toBeUndefined()
    expect(num(undefined)).toBeUndefined()
    expect(num({ count: 5 })).toBeUndefined()
  })

  it("returns undefined for non-finite numbers (NaN, Infinity)", () => {
    expect(num(NaN)).toBeUndefined()
    expect(num(Infinity)).toBeUndefined()
    expect(num(-Infinity)).toBeUndefined()
  })
})
