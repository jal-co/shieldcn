/**
 * shieldcn
 * lib/badges/twemoji.test
 *
 * Covers emoji detection and codepoint resolution (the pure logic). The CDN
 * fetch in resolveTwemojiSvg is not exercised here.
 */

import { describe, expect, it } from "vitest"
import { isTwemojiLogo, twemojiCodepoint } from "./twemoji"

describe("isTwemojiLogo", () => {
  it("detects the explicit twemoji: prefix", () => {
    expect(isTwemojiLogo("twemoji:🚀")).toBe(true)
    expect(isTwemojiLogo("twemoji:1f680")).toBe(true)
  })

  it("auto-detects a bare emoji char", () => {
    expect(isTwemojiLogo("🚀")).toBe(true)
    expect(isTwemojiLogo("🇺🇸")).toBe(true)
    expect(isTwemojiLogo("👨‍💻")).toBe(true)
  })

  it("does not treat slugs, prefixed icons, or data URIs as emoji", () => {
    expect(isTwemojiLogo("react")).toBe(false)
    expect(isTwemojiLogo("ri:FaReact")).toBe(false)
    expect(isTwemojiLogo("lu:Check")).toBe(false)
    expect(isTwemojiLogo("data:image/svg+xml;base64,abc")).toBe(false)
  })
})

describe("twemojiCodepoint", () => {
  it("converts a simple emoji to its codepoint", () => {
    expect(twemojiCodepoint("🚀")).toBe("1f680")
    expect(twemojiCodepoint("twemoji:🚀")).toBe("1f680")
  })

  it("passes through a hex codepoint (lowercased)", () => {
    expect(twemojiCodepoint("twemoji:1F680")).toBe("1f680")
    expect(twemojiCodepoint("twemoji:1f1fa-1f1f8")).toBe("1f1fa-1f1f8")
  })

  it("strips the FE0F variation selector when there is no ZWJ", () => {
    // ❤️ = U+2764 U+FE0F → twemoji asset is "2764"
    expect(twemojiCodepoint("❤️")).toBe("2764")
  })

  it("keeps FE0F inside a ZWJ sequence", () => {
    // 👨‍💻 = man + ZWJ + computer
    expect(twemojiCodepoint("👨‍💻")).toBe("1f468-200d-1f4bb")
  })

  it("handles regional-indicator flags (surrogate pairs)", () => {
    expect(twemojiCodepoint("🇺🇸")).toBe("1f1fa-1f1f8")
  })

  it("returns null for an empty value", () => {
    expect(twemojiCodepoint("twemoji:")).toBeNull()
  })
})
