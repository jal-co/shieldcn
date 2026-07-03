/**
 * shieldcn
 * lib/context-dev.test.ts
 *
 * Pure-function tests for the Context.dev normalization + brand.md rendering.
 * Does not hit the live API.
 */

import { describe, it, expect } from "vitest"
import { normalizeBrand, brandProfileToMarkdown, type RawBrand } from "./context-dev"

const AIRBNB: RawBrand = {
  domain: "airbnb.com",
  title: "Airbnb",
  description: "A global marketplace.",
  slogan: "Belong Anywhere",
  colors: [
    { hex: "#fc3c5c", name: "Radical Red" },
    { hex: "#fb5c74", name: "Ponceau" },
  ],
  logos: [
    { url: "https://cdn/icon-light.png", mode: "light", type: "icon" },
    { url: "https://cdn/wordmark-dark.png", mode: "dark", type: "logo" },
    { url: "https://cdn/wordmark-light.png", mode: "light", type: "logo" },
  ],
  socials: [{ type: "x", url: "https://x.com/airbnb" }],
  primary_language: "english",
}

describe("normalizeBrand", () => {
  it("prefers a wordmark logo over an icon for the light/dark logo", () => {
    const p = normalizeBrand(AIRBNB)
    expect(p.lightLogoUrl).toBe("https://cdn/wordmark-light.png")
    expect(p.darkLogoUrl).toBe("https://cdn/wordmark-dark.png")
    expect(p.iconUrl).toBe("https://cdn/icon-light.png")
  })

  it("maps title, palette, and socials", () => {
    const p = normalizeBrand(AIRBNB)
    expect(p.title).toBe("Airbnb")
    expect(p.colors.map((c) => c.hex)).toEqual(["#fc3c5c", "#fb5c74"])
    expect(p.socials[0]).toEqual({ type: "x", url: "https://x.com/airbnb" })
  })

  it("falls back to the first logo when no mode matches", () => {
    const p = normalizeBrand({ logos: [{ url: "https://cdn/only.png", type: "icon" }] })
    expect(p.lightLogoUrl).toBe("https://cdn/only.png")
    expect(p.darkLogoUrl).toBeUndefined()
  })

  it("drops colors/logos without required fields", () => {
    const p = normalizeBrand({ colors: [{ name: "no hex" }], logos: [{ mode: "light" }] })
    expect(p.colors).toEqual([])
    expect(p.lightLogoUrl).toBeUndefined()
  })
})

describe("brandProfileToMarkdown", () => {
  it("renders a brand.md with palette, logos, and socials sections", () => {
    const md = brandProfileToMarkdown(normalizeBrand(AIRBNB))
    expect(md).toContain("# Airbnb")
    expect(md).toContain("> Belong Anywhere")
    expect(md).toContain("## Palette")
    expect(md).toContain("`#fc3c5c` — Radical Red")
    expect(md).toContain("**Light background:** https://cdn/wordmark-light.png")
    expect(md).toContain("**Dark background:** https://cdn/wordmark-dark.png")
    expect(md).toContain("**x:** https://x.com/airbnb")
  })
})
