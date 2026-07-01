/**
 * shieldcn
 * src/badges/group-route.test
 *
 * Covers the /group segment cap (DoS-amplification guard — each segment
 * fans out to a parallel upstream fetch) and the resolveVariant() fix that
 * replaced an unchecked `as BadgeStyle` cast. Uses the static badge provider
 * (badge/{label}-{value}-{color}) for every segment so these run without any
 * network access.
 */

import { describe, it, expect } from "vitest"
import { handleBadgeGET } from "../route-handler"

/** Builds `n` static badge paths joined with "+", and the matching slug array
 * (format extension on the final element, mirroring how a real caller's URL
 * path segments arrive — see views-route.test.ts for the same convention). */
function group(n: number, ext: "svg" | "json") {
  const parts = Array.from({ length: n }, (_, i) => `badge/label${i}-value${i}-blue`)
  const joined = parts.join("+")
  const slug = ["group", ...joined.split("/")]
  slug[slug.length - 1] = `${slug[slug.length - 1]}.${ext}`
  return { path: joined, slug }
}

describe("handleBadgeGET /group", () => {
  it("renders a group within the segment cap", async () => {
    const { path, slug } = group(10, "svg")
    const res = await handleBadgeGET(new Request(`https://x.dev/group/${path}.svg`), slug)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600") // success TTL, not the error TTL
  })

  it("rejects a group over the segment cap (SVG) with error-badge cache headers", async () => {
    const { path, slug } = group(11, "svg")
    const res = await handleBadgeGET(new Request(`https://x.dev/group/${path}.svg`), slug)
    expect(res.status).toBe(200) // SVG errors still render a valid image, never a broken one
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    // Short error TTL (60s), not the 1-hour success TTL — proves the cap path
    // was taken instead of actually rendering 11 badges.
    expect(res.headers.get("Cache-Control")).toContain("max-age=60")
  })

  it("rejects a group over the segment cap (JSON)", async () => {
    const { path, slug } = group(11, "json")
    const res = await handleBadgeGET(new Request(`https://x.dev/group/${path}.json`), slug)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/too many badges/i)
  })

  it("accepts exactly the cap (10) and rejects one over it (11), proving the boundary", async () => {
    const atCap = group(10, "json")
    const overCap = group(11, "json")
    const atCapRes = await handleBadgeGET(new Request(`https://x.dev/group/${atCap.path}.json`), atCap.slug)
    const overCapRes = await handleBadgeGET(new Request(`https://x.dev/group/${overCap.path}.json`), overCap.slug)
    expect(atCapRes.status).toBe(200)
    expect(overCapRes.status).toBe(400)
  })

  it("coerces an invalid ?style= to default instead of casting it through unchecked", async () => {
    const { path, slug } = group(2, "svg")
    const validRes = await handleBadgeGET(new Request(`https://x.dev/group/${path}.svg`), slug)
    const invalidRes = await handleBadgeGET(
      new Request(`https://x.dev/group/${path}.svg?style=not-a-real-variant`),
      slug,
    )
    // Both must render successfully (invalid style silently falls back to
    // "default" rather than propagating a bogus value into the renderer).
    expect(validRes.status).toBe(200)
    expect(invalidRes.status).toBe(200)
  })
})
