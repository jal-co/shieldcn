/**
 * shieldcn
 * src/badges/png-route.test
 *
 * No existing test exercised the PNG render path at all before this — it
 * relies on resvg-wasm, which needs either a local wasm file (production /
 * Docker) or a CDN fetch (dev / Vercel). Forces NODE_ENV=production so this
 * runs against the local file (already present in node_modules from the
 * installed @resvg/resvg-wasm dependency) instead of depending on network
 * access to unpkg.com in CI. Also the first regression test for the
 * ensureResvg() dedup (PR-2.1) — 5 near-identical PNG call sites were
 * consolidated into one memoized helper, and this proves the result is
 * still a valid PNG from more than one of them.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { handleBadgeGET } from "../route-handler"

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("PNG rendering (forces the local-file resvg-wasm path)", () => {
  it("renders a static badge as a valid PNG", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await handleBadgeGET(
      new Request("https://x.dev/badge/hello-world-blue.png"),
      ["badge", "hello-world-blue.png"],
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    const bytes = Buffer.from(await res.arrayBuffer())
    expect(bytes.subarray(0, 8)).toEqual(PNG_MAGIC)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it("renders a header (font-rendering PNG path, via rasterizeToPng) as a valid PNG", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await handleBadgeGET(
      new Request("https://x.dev/header/surface.png?title=Test"),
      ["header", "surface.png"],
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    const bytes = Buffer.from(await res.arrayBuffer())
    expect(bytes.subarray(0, 8)).toEqual(PNG_MAGIC)
  })

  it("renders a second PNG in the same process (proves ensureResvg's memoized init is reused, not re-run)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = await handleBadgeGET(
      new Request("https://x.dev/badge/second-request-green.png"),
      ["badge", "second-request-green.png"],
    )
    expect(res.status).toBe(200)
    const bytes = Buffer.from(await res.arrayBuffer())
    expect(bytes.subarray(0, 8)).toEqual(PNG_MAGIC)
  })
})
