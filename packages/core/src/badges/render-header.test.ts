/**
 * shieldcn
 * src/badges/render-header.test
 *
 * Unit tests for the repository header renderer + premade background presets.
 * All pure — no network.
 */

import { describe, it, expect } from "vitest"
import { renderHeader } from "./render-header"
import {
  resolveHeaderBackground,
  HEADER_PRESET_NAMES,
  DEFAULT_HEADER_PRESET,
  type HeaderMode,
} from "./header-backgrounds"

function bg(opts: Partial<Parameters<typeof resolveHeaderBackground>[0]> = {}) {
  return resolveHeaderBackground({
    preset: opts.preset ?? null,
    mode: (opts.mode ?? "dark") as HeaderMode,
    width: opts.width ?? 1280,
    height: opts.height ?? 400,
    radius: opts.radius ?? 24,
    theme: opts.theme ?? null,
    bg: opts.bg ?? null,
    gradient: opts.gradient ?? null,
    pattern: opts.pattern ?? null,
    glow: opts.glow ?? null,
    accent: opts.accent ?? null,
  })
}

describe("resolveHeaderBackground", () => {
  it("ships a sensible default preset", () => {
    expect(HEADER_PRESET_NAMES).toContain(DEFAULT_HEADER_PRESET)
    const r = bg({ preset: null })
    expect(r.layers).toContain("<rect")
    expect(r.accent.startsWith("#")).toBe(true)
  })

  it("renders valid fragments for every preset in both modes", () => {
    for (const name of HEADER_PRESET_NAMES) {
      for (const mode of ["dark", "light"] as HeaderMode[]) {
        const r = bg({ preset: name, mode })
        // Every preset except `transparent` paints a full-canvas surface.
        if (name !== "transparent") {
          expect(r.layers, `${name}/${mode} layers`).toContain("<rect")
        }
        expect(r.layers).not.toContain("NaN")
        expect(r.defs).not.toContain("NaN")
        // Contrast follows the mode (neutral surfaces in both).
        expect(r.isLight).toBe(mode === "light")
        expect(r.border.startsWith("#")).toBe(true)
      }
    }
  })

  it("transparent preset paints no surface fill", () => {
    const r = bg({ preset: "transparent" })
    expect(r.layers).not.toContain("<rect")
  })

  it("derives a themed accent from the theme param", () => {
    const blue = bg({ theme: "blue" })
    const zinc = bg({ theme: "zinc" })
    expect(blue.accent).not.toBe(zinc.accent)
  })

  it("applies a custom gradient override", () => {
    const r = bg({ gradient: "ff0000,00ff00,45" })
    expect(r.defs).toContain("linearGradient")
    expect(r.defs).toContain("#ff0000")
    expect(r.defs).toContain("#00ff00")
  })

  it("applies a solid bg override and recomputes contrast", () => {
    const light = bg({ bg: "ffffff", mode: "dark" })
    expect(light.layers).toContain("#ffffff")
    expect(light.isLight).toBe(true)
    const dark = bg({ bg: "000000", mode: "light" })
    expect(dark.isLight).toBe(false)
  })

  it("supports pattern overrides and pattern=none", () => {
    const dots = bg({ pattern: "dots" })
    expect(dots.defs).toContain("<pattern")
    expect(dots.defs).toContain("<circle")
    const grid = bg({ pattern: "grid" })
    expect(grid.defs).toContain("<pattern")
    const none = bg({ preset: "dots", pattern: "none" })
    expect(none.defs).not.toContain("<pattern")
  })

  it("adds a spotlight glow via ?glow", () => {
    const r = bg({ glow: "3b82f6" })
    expect(r.defs).toContain("radialGradient")
  })

  it("falls back to the default preset for an unknown name", () => {
    const unknown = bg({ preset: "definitely-not-a-preset" })
    const def = bg({ preset: DEFAULT_HEADER_PRESET })
    expect(unknown.accent).toBe(def.accent)
  })
})

describe("renderHeader", () => {
  function render(over: Partial<Parameters<typeof renderHeader>[0]> = {}) {
    return renderHeader({
      title: over.title ?? "My Project",
      subtitle: over.subtitle,
      width: over.width ?? 1280,
      height: over.height ?? 400,
      mode: over.mode ?? "dark",
      align: over.align ?? "center",
      radius: over.radius ?? 24,
      background: over.background ?? bg(),
      logo: over.logo,
      fontFamily: over.fontFamily,
      titleColor: over.titleColor,
      subtitleColor: over.subtitleColor,
      border: over.border,
      watermark: over.watermark,
    })
  }

  it("renders a valid SVG with the title", () => {
    const svg = render({ title: "Acme Toolkit", subtitle: "Build faster" })
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg).toContain('role="img"')
    expect(svg).toContain("Acme Toolkit")
    expect(svg).toContain("Build faster")
    expect(svg).not.toContain("NaN")
    expect(svg).toContain('width="1280"')
    expect(svg).toContain('height="400"')
  })

  it("escapes special characters in title/subtitle", () => {
    const svg = render({ title: "A & B", subtitle: "<x>" })
    expect(svg).toContain("A &amp; B")
    expect(svg).toContain("&lt;x&gt;")
    expect(svg).not.toContain("<x>")
  })

  it("centers by default and left-aligns on request", () => {
    expect(render({ align: "center" })).toContain('text-anchor="middle"')
    expect(render({ align: "left" })).toContain('text-anchor="start"')
  })

  it("uses dark text on light backgrounds", () => {
    const svg = render({ background: bg({ mode: "light" }), mode: "light" })
    expect(svg).toContain("#18181b")
  })

  it("uses light text on dark backgrounds", () => {
    const svg = render({ background: bg({ mode: "dark" }), mode: "dark" })
    expect(svg).toContain("#fafafa")
  })

  it("embeds an image logo via data URI", () => {
    const svg = render({
      logo: { imageDataUri: "data:image/png;base64,AAAA" },
    })
    expect(svg).toContain("<image")
    expect(svg).toContain("data:image/png;base64,AAAA")
  })

  it("embeds a path icon logo with the given color", () => {
    const svg = render({
      logo: { icon: { viewBox: "0 0 24 24", path: "M0 0h24v24H0z" }, color: "ff0000" },
    })
    expect(svg).toContain("M0 0h24v24H0z")
    expect(svg).toContain("#ff0000")
  })

  it("wraps and ellipsizes an overly long title", () => {
    const longTitle = "word ".repeat(60).trim()
    const svg = render({ title: longTitle, width: 600, height: 300 })
    expect(svg).toContain("…")
    expect(svg).not.toContain("NaN")
  })

  it("adds a watermark only when requested", () => {
    expect(render({ watermark: true })).toContain("shieldcn.dev")
    expect(render({ watermark: false })).not.toContain("shieldcn.dev")
  })

  it("respects the corner radius in the clip path", () => {
    const svg = render({ radius: 0 })
    expect(svg).toContain('rx="0"')
  })
})
