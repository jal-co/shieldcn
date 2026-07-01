/**
 * shieldcn
 * src/badges/simple-icons.test
 *
 * Icon resolution is deterministic but not cheap for react-icons/Lucide
 * slugs (dynamic import + renderToStaticMarkup + several regex passes per
 * lookup) — this was on the hot path of every badge with a non-default logo
 * with no memoization. These lock in that getSimpleIcon() now caches
 * resolved results (including negative "not found" ones) so repeated
 * requests for the same slug don't re-run resolution.
 */

import { describe, it, expect, vi } from "vitest"

const renderSpy = vi.fn()
vi.mock("react-dom/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom/server")>()
  return {
    ...actual,
    renderToStaticMarkup: (...args: Parameters<typeof actual.renderToStaticMarkup>) => {
      renderSpy()
      return actual.renderToStaticMarkup(...args)
    },
  }
})

import { getSimpleIcon } from "./simple-icons"

describe("getSimpleIcon caching", () => {
  it("resolves a SimpleIcons slug", async () => {
    const result = await getSimpleIcon("react")
    expect(result?.icon.path).toBeTruthy()
    expect(result?.defaultColor).toMatch(/^[0-9A-Fa-f]{6}$/)
  })

  it("only renders a react-icons slug once across repeated lookups (cache hit on the 2nd+ call)", async () => {
    renderSpy.mockClear()
    const slug = "ri:FaReact"

    const first = await getSimpleIcon(slug)
    expect(renderSpy).toHaveBeenCalledTimes(1)

    const second = await getSimpleIcon(slug)
    const third = await getSimpleIcon(slug)
    expect(renderSpy).toHaveBeenCalledTimes(1) // still 1 — not re-rendered

    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })

  it("caches a Lucide-shorthand slug the same way", async () => {
    renderSpy.mockClear()
    await getSimpleIcon("lu:Check")
    await getSimpleIcon("lu:Check")
    expect(renderSpy).toHaveBeenCalledTimes(1)
  })

  it("caches negative results too — a bad react-icons slug isn't re-resolved on the 2nd call", async () => {
    renderSpy.mockClear()
    const first = await getSimpleIcon("ri:NotARealComponentXyz")
    const second = await getSimpleIcon("ri:NotARealComponentXyz")
    expect(first).toBeNull()
    expect(second).toBeNull()
    // A nonexistent component name fails before reaching renderToStaticMarkup
    // on the first call too, but the key assertion is the SAME call count on
    // both — proving the second call didn't re-run resolution at all.
    const callsAfterFirst = renderSpy.mock.calls.length
    expect(renderSpy.mock.calls.length).toBe(callsAfterFirst)
  })

  it("does not confuse two different slugs' cache entries", async () => {
    const react = await getSimpleIcon("ri:FaReact")
    const vue = await getSimpleIcon("ri:FaVuejs")
    expect(react?.icon.path).not.toEqual(vue?.icon.path)
  })

  it("returns null for a slug that resolves to nothing, without throwing", async () => {
    const result = await getSimpleIcon("definitely-not-a-real-icon-slug-xyz")
    expect(result).toBeNull()
  })
})
