import { describe, it, expect } from "vitest"
import { resolveColor, applyColorOverrides, themes } from "./themes"

describe("resolveColor", () => {
  it("resolves named colors to hex", () => {
    expect(resolveColor("brightgreen")).toBe("44cc11")
    expect(resolveColor("red")).toBe("dc2626")
    expect(resolveColor("BLUE")).toBe("2563eb")
  })

  it("accepts hex with or without #", () => {
    expect(resolveColor("ff6b6b")).toBe("ff6b6b")
    expect(resolveColor("#ff6b6b")).toBe("ff6b6b")
    expect(resolveColor("FF6B6B")).toBe("ff6b6b")
    expect(resolveColor("ff6b6b80")).toBe("ff6b6b80")
  })

  it("expands short hex so luminance math sees full channels", () => {
    expect(resolveColor("fff")).toBe("ffffff")
    expect(resolveColor("#abc")).toBe("aabbcc")
    expect(resolveColor("abcd")).toBe("aabbccdd")
  })

  it("rejects anything invalid", () => {
    expect(resolveColor("not-a-color")).toBeUndefined()
    expect(resolveColor("zzz")).toBeUndefined()
    expect(resolveColor("12345")).toBeUndefined() // 5 hex digits is not a CSS color
    expect(resolveColor("1234567")).toBeUndefined()
    expect(resolveColor("")).toBeUndefined()
    expect(resolveColor(undefined)).toBeUndefined()
    expect(resolveColor(null)).toBeUndefined()
    expect(resolveColor('"><script>')).toBeUndefined()
  })
})

describe("applyColorOverrides", () => {
  const base = themes.zinc

  it("applies a valid color override", () => {
    const result = applyColorOverrides(base, { color: "ff6b6b" })
    expect(result.labelBg).toBe("#ff6b6b")
    expect(result.valueBg).toBe("#ff6b6b")
  })

  it("resolves named color overrides", () => {
    const result = applyColorOverrides(base, { color: "brightgreen" })
    expect(result.labelBg).toBe("#44cc11")
  })

  it("drops invalid overrides instead of passing garbage to the renderer", () => {
    const result = applyColorOverrides(base, { color: "not-a-color", labelColor: "zzz" })
    expect(result).toEqual(base)
  })

  it("picks dark text on light backgrounds", () => {
    const result = applyColorOverrides(base, { color: "ffffff" })
    expect(result.valueFg).toBe("#18181b")
  })
})
