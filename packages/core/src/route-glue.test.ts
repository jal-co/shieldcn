/**
 * shieldcn
 * route-glue.test
 *
 * Regression lock for item P6: createBadgeHandlers() unwraps Next.js'
 * `[...slug]` params and forwards the SAME BadgeRequestOptions to both GET
 * and PUT — previously web/engine each hand-wrote this wiring, and engine's
 * PUT silently dropped onError/onMetric because nothing forced it to stay
 * in sync with GET.
 */

import { describe, it, expect, vi } from "vitest"
import { createBadgeHandlers } from "./route-handler"

function ctx(slug: string[]) {
  return { params: Promise.resolve({ slug }) }
}

describe("createBadgeHandlers", () => {
  it("unwraps params and renders a real badge via GET", async () => {
    const { GET } = createBadgeHandlers()
    const res = await GET(new Request("https://x.dev/npm/v/react"), ctx(["npm", "v", "react"]))
    expect(res.headers.get("content-type")).toContain("image/svg+xml")
  })

  it("enriches badge_rendered with subject and request origin", async () => {
    const onTrack = vi.fn()
    const { GET } = createBadgeHandlers({ onTrack })
    const res = await GET(
      new Request("https://x.dev/badge/hello-world-blue.svg", {
        headers: { referer: "https://www.npmjs.com/package/react" },
      }),
      ctx(["badge", "hello-world-blue.svg"]),
    )
    expect(res.status).toBe(200)
    expect(onTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "badge_rendered",
        data: expect.objectContaining({
          provider: "badge",
          subject: "hello-world-blue",
          source: "npm",
          refererHost: "www.npmjs.com",
        }),
      }),
    )
  })

  it("classifies GitHub Camo requests by user-agent (Camo strips Referer)", async () => {
    const onTrack = vi.fn()
    const { GET } = createBadgeHandlers({ onTrack })
    await GET(
      new Request("https://x.dev/badge/hello-world-blue.svg", {
        headers: { "user-agent": "github-camo (876de43e)" },
      }),
      ctx(["badge", "hello-world-blue.svg"]),
    )
    expect(onTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: "github-camo" }),
      }),
    )
  })

  it("forwards onMetric to PUT — the exact gap engine's hand-written route had", async () => {
    const onMetric = vi.fn()
    const { PUT } = createBadgeHandlers({ onMetric })
    const res = await PUT(
      new Request("https://x.dev/memo/k/l/v", { method: "PUT", headers: { authorization: "Bearer t" } }),
      ctx(["memo", "k", "l", "v"]),
    )
    // Whatever the outcome (likely 403 without a real memo secret configured
    // in this test env), the metric callback must have fired — that's the
    // behavior under test, not the memo write's success.
    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(onMetric).toHaveBeenCalled()
  })

  it("unwraps params and renders a real badge via PUT's sibling GET with the same options object", async () => {
    // Both handlers close over the same `options` — passing onTrack (a GET-only
    // callback) through the factory must not affect PUT's own wiring.
    const onTrack = vi.fn()
    const { GET, PUT } = createBadgeHandlers({ onTrack })
    const getRes = await GET(new Request("https://x.dev/npm/v/react"), ctx(["npm", "v", "react"]))
    expect(getRes.status).toBe(200)
    const putRes = await PUT(
      new Request("https://x.dev/memo/k2/l/v", { method: "PUT" }),
      ctx(["memo", "k2", "l", "v"]),
    )
    // No Authorization header — PUT must still handle it via the shared
    // factory (not crash from a missing GET-only callback).
    expect(putRes.status).toBe(401)
  })
})
