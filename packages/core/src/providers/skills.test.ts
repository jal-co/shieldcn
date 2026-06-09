/**
 * shieldcn
 * lib/providers/skills.test
 *
 * Verifies the skills.sh provider against the public leaderboard envelope
 * (`/api/skills/{view}/{page}` → { skills: [{ source, skillId, name, installs }], hasMore }).
 * Real field names confirmed from the upstream API and many cached dumps.
 *
 * NOTE: leaderboard pages are cached module-globally by `{view}:{page}` (shared
 * across every skills badge — the intended optimization), so this file uses one
 * consistent board per view; cache hits across tests then stay correct.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getSkillsInstalls, getSkillsRank, getSkillsTrending, getSkillsHot } from "./skills"

interface PageSkill {
  source: string
  skillId: string
  name: string
  installs: number
}

const s = (source: string, skillId: string, installs: number): PageSkill =>
  ({ source, skillId, name: skillId, installs })

// A single stable board, mirroring the real top of the all-time leaderboard.
const ALL_TIME: PageSkill[][] = [
  [
    s("vercel-labs/agent-skills", "vercel-react-best-practices", 389226), // pos 1
    s("vercel-labs/agent-skills", "web-design-guidelines", 96576),        // pos 2
  ],
  [
    s("remotion-dev/skills", "remotion-best-practices", 17700),           // pos 3
    s("anthropics/skills", "frontend-design", 6900),                      // pos 4
  ],
]

const TRENDING: PageSkill[][] = [[s("vercel-labs/agent-skills", "vercel-react-best-practices", 5)]]
const HOT: PageSkill[][] = [
  [s("x/y", "a", 9)],
  [s("vercel-labs/agent-skills", "vercel-react-best-practices", 5)], // pos 2
]

beforeEach(() => {
  const board: Record<string, PageSkill[][]> = { "all-time": ALL_TIME, trending: TRENDING, hot: HOT }
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const m = url.match(/\/api\/skills\/([^/]+)\/(\d+)$/)
    if (!m) return new Response("not found", { status: 404 })
    const [, view, pageStr] = m
    const pages = board[view] ?? []
    const page = pages[Number(pageStr)] ?? []
    const hasMore = Number(pageStr) < pages.length - 1
    return new Response(JSON.stringify({ skills: page, hasMore }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("skills.sh provider", () => {
  it("reads installs from the all-time board (formatted)", async () => {
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
    // frontend-design lives under anthropics/skills at the 4th position overall.
    const data = await getSkillsRank("anthropics", "skills", "frontend-design")
    expect(data?.value).toBe("#4")
  })

  it("returns null when a skill isn't on the board", async () => {
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
