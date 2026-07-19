/**
 * shieldcn
 * lib/brand-assets.test
 */

import { describe, it, expect } from "vitest"
import { recolorSvgForOppositeMode } from "./brand-assets"

describe("recolorSvgForOppositeMode", () => {
  it("flips a black-ink logo to white for dark badges", () => {
    const svg = `<svg><path fill="#000000" d="M0 0"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-light")
    expect(out).toContain("#ffffff")
    expect(out).not.toContain('fill="#000000"')
  })

  it("flips a white-ink logo to black for light badges", () => {
    const svg = `<svg><path fill="#FFFFFF" d="M0 0"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-dark")
    expect(out).toContain("#000000")
  })

  it("handles keyword colors (black/white)", () => {
    expect(recolorSvgForOppositeMode(`<svg><rect fill="black"/></svg>`, "to-light")).toContain("#ffffff")
    expect(recolorSvgForOppositeMode(`<svg><rect fill="white"/></svg>`, "to-dark")).toContain("#000000")
  })

  it("recolors style-attribute fills too", () => {
    const svg = `<svg><path style="fill:#000000;stroke:none"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-light")
    expect(out).toContain("#ffffff")
  })

  it("leaves colored (non-ink) logos untouched", () => {
    const svg = `<svg><path fill="#e11d48"/></svg>`
    expect(recolorSvgForOppositeMode(svg, "to-light")).toBeNull()
  })

  it("returns null for non-SVG input", () => {
    expect(recolorSvgForOppositeMode("not an svg", "to-light")).toBeNull()
  })

  it("does not touch fill=none", () => {
    const svg = `<svg><path fill="none" stroke="#000000"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-light")
    expect(out).toContain('fill="none"')
    expect(out).toContain("#ffffff") // stroke flipped
  })

  it("injects a root fill on a fill-less SVG (default black ink) for to-light", () => {
    // SVG's presentational default ink is black — no attribute to rewrite, but
    // the mark is still invisible on a dark badge without an explicit flip.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 1L2 2"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-light")
    expect(out).toContain('<svg fill="#ffffff"')
  })

  it("returns null for a fill-less SVG for to-dark (already dark ink)", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1L2 2"/></svg>`
    expect(recolorSvgForOppositeMode(svg, "to-dark")).toBeNull()
  })

  it("flips rgb() dark inks", () => {
    const svg = `<svg><path fill="rgb(10, 10, 10)" d="M0 0"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-light")
    expect(out).toContain("#ffffff")
  })

  it("leaves colored rgb() fills untouched", () => {
    const svg = `<svg><path fill="rgb(225, 29, 72)" d="M0 0"/></svg>`
    expect(recolorSvgForOppositeMode(svg, "to-light")).toBeNull()
  })

  it("flips 3-digit hex inks", () => {
    const svg = `<svg><path fill="#111" d="M0 0"/></svg>`
    const out = recolorSvgForOppositeMode(svg, "to-light")
    expect(out).toContain("#ffffff")
  })
})
