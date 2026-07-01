/**
 * shieldcn
 * badges/render-safety.test
 *
 * Regression lock for item P8: renderBadge/renderBadgeGroup dimension
 * overrides are clamped inside the renderer itself (not just at the route
 * layer), and a Satori failure degrades to a valid error badge instead of
 * propagating as an unhandled exception.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const satoriMock = vi.fn()
vi.mock("satori", () => ({ default: (...args: unknown[]) => satoriMock(...args) }))

import { renderBadge, clampBadgeDim, BADGE_DIM_BOUNDS } from "./render"
import type { BadgeConfig } from "./types"

function baseConfig(overrides: Partial<BadgeConfig> = {}): BadgeConfig {
  return {
    label: "test",
    value: "42",
    style: "default",
    colors: { labelBg: "#000000", labelFg: "#ffffff", valueBg: "#000000", valueFg: "#ffffff", border: "#000000" },
    ...overrides,
  }
}

const FALLBACK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'

describe("clampBadgeDim", () => {
  it("clamps a value above the max down to the max", () => {
    expect(clampBadgeDim("height", 1e9)).toBe(BADGE_DIM_BOUNDS.height[1])
  })

  it("clamps a negative value up to the min", () => {
    expect(clampBadgeDim("gap", -100)).toBe(BADGE_DIM_BOUNDS.gap[0])
  })

  it("passes an in-range value through unchanged", () => {
    expect(clampBadgeDim("fontSize", 14)).toBe(14)
  })

  it("falls back to the bound's min for non-finite input (NaN, Infinity)", () => {
    expect(clampBadgeDim("height", NaN)).toBe(BADGE_DIM_BOUNDS.height[0])
    expect(clampBadgeDim("height", Infinity)).toBe(BADGE_DIM_BOUNDS.height[0])
  })
})

describe("renderBadge — dimension overrides are clamped before reaching Satori", () => {
  beforeEach(() => {
    satoriMock.mockReset()
    satoriMock.mockResolvedValue(FALLBACK_SVG)
  })

  it("clamps an absurd height override instead of passing it through to Satori", async () => {
    await renderBadge(baseConfig({ height: 1e9 }))
    const call = satoriMock.mock.calls[0]
    const satoriOpts = call[1] as { height: number }
    expect(satoriOpts.height).toBeLessThanOrEqual(BADGE_DIM_BOUNDS.height[1])
  })
})

describe("renderBadge — Satori failure degrades to an error badge", () => {
  beforeEach(() => {
    satoriMock.mockReset()
  })

  it("returns a valid SVG instead of throwing when Satori fails once", async () => {
    satoriMock.mockRejectedValueOnce(new Error("satori exploded"))
    satoriMock.mockResolvedValueOnce(FALLBACK_SVG)

    const svg = await renderBadge(baseConfig({ iconPaths: ["not valid path data"] }))
    expect(svg).toContain("<svg")
    // First call is the real render (fails); second is the internal
    // renderErrorBadge fallback (succeeds) — never loops beyond that.
    expect(satoriMock).toHaveBeenCalledTimes(2)
  })

  it("rethrows rather than looping forever when Satori is completely broken", async () => {
    satoriMock.mockRejectedValue(new Error("satori is fundamentally broken"))
    await expect(renderBadge(baseConfig())).rejects.toThrow("satori is fundamentally broken")
    // One call for the real render, one for the error-badge fallback attempt
    // — the second failure is on an internally-built plain config, so it
    // propagates instead of recursing a third time.
    expect(satoriMock).toHaveBeenCalledTimes(2)
  })
})
