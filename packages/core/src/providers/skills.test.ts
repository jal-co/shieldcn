/**
 * shieldcn
 * lib/providers/skills.test
 *
 * Verifies the skills.sh provider against the v1 API:
 * - Direct lookup: `/api/v1/skills/{source}/{skill}` for installs
 * - Leaderboard: `/api/v1/skills?view=...&page=...` for rank/trending/hot
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getSkillsInstalls, getSkillsRank, getSkillsTrending, getSkillsHot } from "./skills"

interface PageSkill {
  id: string
  source: string
  skillId: string
  slug: string
  name: string
  installs: number
}

const s = (source: string, skillId: string, installs: number): PageSkill => ({
  id: `${source}/${skillId}`,
  source,
  skillId,
  slug: skillId,
  name: skillId,
  installs,
})

const ALL_TIME: PageSkill[][] = [
  [
    s("vercel-labs/agent-skills", "vercel-react-best-practices", 389226),
    s("vercel-labs/agent-skills", "web-design-guidelines", 96576),
  ],
  [
    s("remotion-dev/skills", "remotion-best-practices", 17700),
    s("anthropics/skills", "frontend-design", 6900),
  ],
]

const TRENDING: PageSkill[][] = [[s("vercel-labs/agent-skills", "vercel-react-best-practices", 5)]]
const HOT: PageSkill[][] = [
  [s("x/y", "a", 9)],
  [s("vercel-labs/agent-skills", "vercel-react-best-practices", 5)],
]

// Flat map of direct lookups: id → skill detail.
// Only the all-time board carries canonical install counts.
const DIRECT: Record<string, { id: string; installs: number }> = {}
for (const page of ALL_TIME) {
  for (const skill of page) {
    DIRECT[skill.id] = { id: skill.id, installs: skill.installs }
  }
}

beforeEach(() => {
  // Mock @vercel/oidc to return no token (unauthenticated in tests)
  vi.mock("@vercel/oidc", () => ({
    getVercelOidcToken: async () => null,
  }))

  const board: Record<string, PageSkill[][]> = { "all-time": ALL_TIME, trending: TRENDING, hot: HOT }

  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    // Direct skill lookup: /api/v1/skills/{owner}/{repo}/{skill}
    const directMatch = url.match(/\/api\/v1\/skills\/([^?][^/]+\/[^/]+\/[^/]+)$/)
    if (directMatch) {
      const id = directMatch[1]
      const detail = DIRECT[id]
      if (!detail) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
      return new Response(JSON.stringify(detail), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    // Leaderboard: /api/v1/skills?view=...&page=...
    const leaderboardMatch = url.match(/\/api\/v1\/skills\?/)
    if (leaderboardMatch) {
      const u = new URL(url)
      const view = u.searchParams.get("view") ?? "all-time"
      const pageNum = Number(u.searchParams.get("page") ?? "0")
      const pages = board[view] ?? []
      const data = pages[pageNum] ?? []
      const hasMore = pageNum < pages.length - 1
      return new Response(JSON.stringify({ data, pagination: { hasMore } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    return new Response("not found", { status: 404 })
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("skills.sh provider", () => {
  it("reads installs via direct v1 lookup (formatted)", async () => {
    const data = await getSkillsInstalls("vercel-labs", "agent-skills", "vercel-react-best-practices")
    expect(data?.label).toBe("installs")
    expect(data?.value).toBe("389.2k")
    expect(data?.link).toBe("https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices")
  })

  it("ranks the top skill #1", async () => {
    const data = await getSkillsRank("vercel-labs", "agent-skills", "vercel-react-best-practices")
    expect(data?.label).toBe("skill rank")
    expect(data?.value).toBe("#1")
  })

  it("computes 1-based rank across pages and matches by source + skillId", async () => {
    const data = await getSkillsRank("anthropics", "skills", "frontend-design")
    expect(data?.value).toBe("#4")
  })

  it("returns null when a skill isn't found", async () => {
    const data = await getSkillsInstalls("nope", "nope", "missing-skill-xyz")
    expect(data).toBeNull()
  })

  it("reads trending and hot positions from their own boards", async () => {
    const trending = await getSkillsTrending("vercel-labs", "agent-skills", "vercel-react-best-practices")
    expect(trending?.label).toBe("trending")
    expect(trending?.value).toBe("#1")
    const hot = await getSkillsHot("vercel-labs", "agent-skills", "vercel-react-best-practices")
    expect(hot?.label).toBe("hot")
    expect(hot?.value).toBe("#2")
  })
})
