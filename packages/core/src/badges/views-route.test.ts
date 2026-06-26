/**
 * shieldcn
 * src/badges/views-route.test
 *
 * End-to-end: handleBadgeGET routes /views/... through the stateful view-counter
 * provider. No DATABASE_URL is set in the test env, so the provider takes its
 * graceful fallback path ("—") — which still lets us assert routing, labels, and
 * the no-store cache headers that keep the counter live.
 */

import { describe, it, expect } from "vitest"
import { handleBadgeGET } from "../route-handler"

async function json(path: string, slug: string[]) {
  const res = await handleBadgeGET(new Request(`https://x.dev${path}`), slug)
  return { res, body: await res.json() as { label: string; value: string; noStore?: boolean } }
}

describe("handleBadgeGET /views", () => {
  it("routes repo views with the right label", async () => {
    const { res, body } = await json("/views/repo/remvze/gitviews.json", ["views", "repo", "remvze", "gitviews.json"])
    expect(res.status).toBe(200)
    expect(body.label).toBe("views")
    expect(body.noStore).toBe(true)
  })

  it("routes profile views with the right label", async () => {
    const { body } = await json("/views/user/justin.json", ["views", "user", "justin.json"])
    expect(body.label).toBe("profile views")
  })

  it("routes all-repos views with the right label", async () => {
    const { body } = await json("/views/user/justin/repos.json", ["views", "user", "justin", "repos.json"])
    expect(body.label).toBe("repo views")
  })

  it("serves view badges with no-store cache headers so the count stays live", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/views/repo/remvze/gitviews.svg"),
      ["views", "repo", "remvze", "gitviews.svg"],
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml")
    expect(res.headers.get("Cache-Control")).toContain("no-store")
  })

  it("returns not-found for incomplete view paths", async () => {
    const res = await handleBadgeGET(
      new Request("https://x.dev/views/repo/remvze.json"),
      ["views", "repo", "remvze.json"],
    )
    expect(res.status).toBe(404)
  })
})
