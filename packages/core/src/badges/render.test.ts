import { describe, it, expect } from "vitest"
import { sanitizeBadgeText } from "./render"

describe("sanitizeBadgeText", () => {
  it("passes normal text through unchanged", () => {
    expect(sanitizeBadgeText("v19.1.0")).toBe("v19.1.0")
    expect(sanitizeBadgeText("")).toBe("")
  })

  it("coerces non-strings so a provider bug can't paint 'undefined'", () => {
    expect(sanitizeBadgeText(undefined)).toBe("")
    expect(sanitizeBadgeText(null)).toBe("")
    expect(sanitizeBadgeText(42)).toBe("42")
    expect(sanitizeBadgeText(false)).toBe("false")
  })

  it("truncates pathologically long text", () => {
    const long = "a".repeat(10_000)
    const result = sanitizeBadgeText(long)
    expect(result.length).toBe(256)
    expect(result.endsWith("…")).toBe(true)
  })
})
