/**
 * shieldcn
 * brand-logo-mode.test
 *
 * Locks in the mode-safety contract for hosted brand marks (`logo=brand`):
 * the renderer parses the mark SVG to paths and recolors them to the badge's
 * theme ink, so the STORED fill color never leaks into badge output. A brand
 * needs exactly one mark to read correctly on both light and dark badges —
 * "the color didn't strip" is a regression against this file.
 *
 * getBrand/getBrandAsset are mocked so rendering is tested without a database.
 */

import { describe, it, expect, vi } from "vitest"

const DARK_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000000" d="M2 2h20v20H2z"/></svg>`
const LIGHT_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M2 2h20v20H2z"/></svg>`
const COLORED_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#e11d48" d="M2 2h20v20H2z"/></svg>`

/** Per-test asset fixtures, keyed by kind. Swapped via setAssets(). */
let assets: Record<string, string> = {}
function setAssets(next: Record<string, string>) {
  assets = next
}

vi.mock("./brands", async (orig) => {
  const actual = await orig<typeof import("./brands")>()
  return {
    ...actual,
    getBrand: vi.fn(async (slug: string) =>
      slug === "acme"
        ? { id: 1, slug: "acme", ownerId: "test", name: "Acme", config: {}, profile: {}, brandMd: null }
        : null,
    ),
    getBrandAsset: vi.fn(async (_slug: string, kind: string) =>
      assets[kind]
        ? { contentType: "image/svg+xml", data: Buffer.from(assets[kind]), fileName: null }
        : null,
    ),
    getBrandFont: vi.fn(async () => null),
  }
})

const { createBadgeHandlers } = await import("./route-handler")

async function renderSvg(path: string, slug: string[]) {
  const { GET } = createBadgeHandlers()
  const res = await GET(new Request(`https://x.dev${path}`), {
    params: Promise.resolve({ slug }),
  })
  return res.text()
}

const BADGE = ["badge", "build-passing.svg"]
/** The mark's square path, as emitted by the svg parser (absolute coords). */
const MARK_PATH = /d="M2 2H22V22H2z"/i

describe("brand mark ink never leaks into badge output (logo=brand)", () => {
  it("renders identical badges for dark-ink and light-ink stored marks", async () => {
    setAssets({ "mark": DARK_MARK })
    const fromDark = await renderSvg("/badge/build-passing.svg?brand=acme&logo=brand", BADGE)
    setAssets({ "mark": LIGHT_MARK })
    const fromLight = await renderSvg("/badge/build-passing.svg?brand=acme&logo=brand", BADGE)
    expect(fromDark).toBe(fromLight)
    expect(fromDark).toMatch(MARK_PATH)
  })

  it("strips a colored mark to theme ink too", async () => {
    setAssets({ "mark": COLORED_MARK })
    const svg = await renderSvg("/badge/build-passing.svg?brand=acme&logo=brand", BADGE)
    expect(svg).toMatch(MARK_PATH)
    // The stored rose fill must not survive into the output.
    expect(svg).not.toMatch(/fill="#e11d48"/i)
  })

  it("recolors the mark for both modes (no stored-ink dependence)", async () => {
    setAssets({ "mark": DARK_MARK })
    const dark = await renderSvg("/badge/build-passing.svg?brand=acme&logo=brand", BADGE)
    const light = await renderSvg("/badge/build-passing.svg?brand=acme&logo=brand&mode=light", BADGE)
    expect(dark).toMatch(MARK_PATH)
    expect(light).toMatch(MARK_PATH)
    // Different modes restyle the badge — output must differ, from one mark.
    expect(dark).not.toBe(light)
  })

  it("logo=brand-alt renders the alternate mark", async () => {
    const ALT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M4 4h16v16H4z"/></svg>`
    setAssets({ "mark": DARK_MARK, "mark-alt": ALT })
    const svg = await renderSvg("/badge/build-passing.svg?brand=acme&logo=brand-alt", BADGE)
    expect(svg).toMatch(/d="M4 4H20V20H4z"/i)
  })

  it("auto-adds the brand mark when no logo param is given", async () => {
    setAssets({ "mark": DARK_MARK })
    const svg = await renderSvg("/badge/build-passing.svg?brand=acme", BADGE)
    expect(svg).toMatch(MARK_PATH)
  })

  it("headers recolor the mark identically for any stored ink", async () => {
    setAssets({ "mark": DARK_MARK })
    const fromDark = await renderSvg("/header/minimal.svg?title=Hi&brand=acme&logo=brand", ["header", "minimal.svg"])
    setAssets({ "mark": LIGHT_MARK })
    const fromLight = await renderSvg("/header/minimal.svg?title=Hi&brand=acme&logo=brand", ["header", "minimal.svg"])
    expect(fromDark).toBe(fromLight)
  })
})
