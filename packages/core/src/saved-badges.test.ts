/**
 * @shieldcn/core
 * src/saved-badges.test.ts
 *
 * Pure-function tests for the saved-badge plan caps (no DB).
 */

import { describe, it, expect } from "vitest"
import { badgeLimitForPlan, FREE_BADGE_LIMIT, PLUS_BADGE_LIMIT } from "./saved-badges"

describe("badgeLimitForPlan", () => {
  it("maps each plan to its cap", () => {
    expect(badgeLimitForPlan("free")).toBe(FREE_BADGE_LIMIT)
    expect(badgeLimitForPlan("plus")).toBe(PLUS_BADGE_LIMIT)
  })

  it("treats unknown plans as free", () => {
    expect(badgeLimitForPlan("pro")).toBe(FREE_BADGE_LIMIT)
    expect(badgeLimitForPlan("")).toBe(FREE_BADGE_LIMIT)
  })

  it("keeps Plus above Free", () => {
    expect(PLUS_BADGE_LIMIT).toBeGreaterThan(FREE_BADGE_LIMIT)
  })
})
