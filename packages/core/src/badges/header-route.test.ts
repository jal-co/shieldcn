/**
 * shieldcn
 * src/badges/header-route.test
 *
 * End-to-end: handleBadgeGET routes /header/... through the header renderer.
 * Icon resolution uses the local `simple-icons` package (no network).
 */

import { describe, it, expect } from "vitest"
import { handleBadgeGET } from "../route-handler"

describe("handleBadgeGET /header", () => {
  it("renders a preset banner SVG with title + subtitle", async () => {
    const req = new Request(
      "https://x.dev/header/dots.svg?title=Acme%20Toolkit&subtitle=Build%20faster",
    )
    const res = await handleBadgeGET(req, ["header", "dots.svg"])
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    const svg = await res.text()
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg).toContain("Acme Toolkit")
    expect(svg).toContain("Build faster")
    expect(svg).not.toContain("NaN")
  })

  it("renders the default preset for a bare /header.svg", async () => {
    const req = new Request("https://x.dev/header.svg?title=Hello")
    const res = await handleBadgeGET(req, ["header.svg"])
    expect(res.status).toBe(200)
    const svg = await res.text()
    expect(svg).toContain("Hello")
  })

  it("applies the social size preset (1280x640)", async () => {
    const req = new Request("https://x.dev/header.svg?title=X&size=social")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    expect(svg).toContain('width="1280"')
    expect(svg).toContain('height="640"')
  })

  it("honors width/height overrides", async () => {
    const req = new Request("https://x.dev/header.svg?title=X&width=800&height=300")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="300"')
  })

  it("renders an icon logo from a SimpleIcons slug", async () => {
    const req = new Request("https://x.dev/header.svg?title=React&logo=react")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    // A path-based icon group is present.
    expect(svg).toContain("<g transform=")
    expect(svg).not.toContain("NaN")
  })

  it("left-aligns content with align=left", async () => {
    const req = new Request("https://x.dev/header.svg?title=Left&align=left")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    expect(svg).toContain('text-anchor="start"')
  })

  it("uses dark text in light mode", async () => {
    const req = new Request("https://x.dev/header.svg?title=Light&mode=light")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    expect(svg).toContain("#18181b")
  })

  it("renders with no surface fill when bg=transparent", async () => {
    const req = new Request("https://x.dev/header.svg?title=Ghost&bg=transparent")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    expect(svg).toContain("Ghost")
    // No full-canvas surface rect (only the clip rect at x=0 inside defs).
    expect(svg).not.toMatch(/<rect x="0" y="0" width="750" height="260" fill="#/)
  })

  it("tints the glow from the theme param", async () => {
    const req = new Request("https://x.dev/header/glow.svg?title=Blue&theme=blue")
    const res = await handleBadgeGET(req, ["header", "glow.svg"])
    const svg = await res.text()
    expect(svg).toContain("radialGradient")
  })

  it("returns header config JSON for .json", async () => {
    const req = new Request("https://x.dev/header/glow.json?title=Hello&subtitle=World")
    const res = await handleBadgeGET(req, ["header", "glow.json"])
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.type).toBe("header")
    expect(data.preset).toBe("glow")
    expect(data.title).toBe("Hello")
    expect(data.subtitle).toBe("World")
    expect(data.width).toBe(750) // default "banner" preset
  })

  it("applies a custom gradient override", async () => {
    const req = new Request("https://x.dev/header.svg?title=Grad&gradient=ff0000,0000ff,90")
    const res = await handleBadgeGET(req, ["header.svg"])
    const svg = await res.text()
    expect(svg).toContain("#ff0000")
    expect(svg).toContain("#0000ff")
  })
})
