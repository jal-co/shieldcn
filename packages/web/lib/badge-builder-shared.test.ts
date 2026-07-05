/**
 * shieldcn
 * lib/badge-builder-shared.test
 */

import { describe, it, expect } from "vitest"
import { buildBadgeUrl, BUILDER_DEFAULTS } from "./badge-builder-shared"

const BASE = "https://shieldcn.dev"

describe("buildBadgeUrl — brand", () => {
  it("omits ?brand when the slug is empty", () => {
    const url = buildBadgeUrl({ ...BUILDER_DEFAULTS, path: "/badge/build-passing.svg" }, BASE)
    expect(url).not.toContain("brand=")
  })

  it("emits ?brand when a slug is set", () => {
    const url = buildBadgeUrl(
      { ...BUILDER_DEFAULTS, path: "/badge/build-passing.svg", brand: "acme" },
      BASE,
    )
    expect(url).toContain("brand=acme")
  })

  it("trims surrounding whitespace from the brand slug", () => {
    const url = buildBadgeUrl(
      { ...BUILDER_DEFAULTS, path: "/badge/build-passing.svg", brand: "  acme  " },
      BASE,
    )
    expect(url).toContain("brand=acme")
    expect(url).not.toContain("brand=+")
  })
})
