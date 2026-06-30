import { describe, it, expect } from "vitest"
import { renderBadge, sanitizeBadgeText } from "./render"
import type { BadgeConfig, BadgeStyle } from "./types"

function badgeConfig(style: BadgeStyle, overrides: Partial<BadgeConfig> = {}): BadgeConfig {
  return {
    label: "license",
    value: "MIT",
    style,
    size: "sm",
    mode: "light",
    colors: {
      labelBg: "#facc15",
      labelFg: "#ffffff",
      valueBg: "#eab308",
      valueFg: "#18181b",
      border: "#facc15",
    },
    ...overrides,
  }
}

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

describe("light mode transparent variants", () => {
  it("renders outline with dark text in light mode", async () => {
    const svg = await renderBadge(badgeConfig("outline"))

    expect(svg).toContain('fill="#18181b"')
    expect(svg).not.toContain('fill="#fafafa"')
    expect(svg).not.toContain('fill="#ffffff"')
  })

  it("renders ghost with dark text in light mode", async () => {
    const svg = await renderBadge(badgeConfig("ghost"))

    expect(svg).toContain('fill="#18181b"')
    expect(svg).not.toContain('fill="#fafafa"')
    expect(svg).not.toContain('fill="#ffffff"')
  })

  it("keeps outline label text mode-aware when a custom accent color is set", async () => {
    const svg = await renderBadge(badgeConfig("outline", { hasThemeOverride: true }))

    expect(svg).toContain('fill="#18181b"')
    expect(svg).toContain('fill="#8a700c"')
    expect(svg).not.toContain('fill="#facc15"')
  })

  it("keeps ghost label text mode-aware when a custom accent color is set", async () => {
    const svg = await renderBadge(badgeConfig("ghost", { hasThemeOverride: true }))

    expect(svg).toContain('fill="#18181b"')
    expect(svg).toContain('fill="#8a700c"')
    expect(svg).not.toContain('fill="#facc15"')
  })
})
