/**
 * shieldcn
 * src/providers/openssf.test
 *
 * Verifies the OpenSSF providers against both upstreams:
 * Scorecard (`api.scorecard.dev`, 404s when unscanned) and Best Practices
 * (`bestpractices.dev`, returns [] when unregistered).
 *
 * Each case uses a distinct owner/repo so the provider cache can't carry a
 * value between tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getOpenSSFBestPractices, getOpenSSFScorecard, scorecardColor } from "./openssf"
import { clearBackoff } from "../cache"
import { statusColors } from "../badges/themes"

// repo → score. A repo absent from this map has never been scanned (404).
const SCORES: Record<string, number> = {
  "high/repo": 9,
  "mid/repo": 6.4,
  "low/repo": 1.7,
  "zero/repo": 0,
}

// repo → badge_level. Absent means unregistered ([]).
const LEVELS: Record<string, { id: number; level: string }> = {
  "silver/repo": { id: 13303, level: "silver" },
  "gold/repo": { id: 42, level: "gold" },
  "starting/repo": { id: 7, level: "in_progress" },
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const json = (body: unknown) =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        })

      // --- Scorecard ---
      const scorecard = url.match(/api\.scorecard\.dev\/projects\/github\.com\/(.+)$/)
      if (scorecard) {
        const slug = decodeURIComponent(scorecard[1])
        if (slug === "boom/repo") return new Response("oops", { status: 500 })
        // Scanned but scoreless — must not render "NaN".
        if (slug === "scoreless/repo") return json({ date: "2026-08-04" })
        const score = SCORES[slug]
        if (score === undefined) return new Response("not found", { status: 404 })
        return json({ score, date: "2026-08-04" })
      }

      // --- Best Practices ---
      if (url.startsWith("https://www.bestpractices.dev/projects.json?url=")) {
        const repoUrl = decodeURIComponent(url.split("url=")[1])
        const slug = repoUrl.replace("https://github.com/", "")
        if (slug === "boom/repo") return new Response("oops", { status: 500 })
        // Registered but level not yet reported.
        if (slug === "levelless/repo") return json([{ id: 99 }])
        const entry = LEVELS[slug]
        return json(entry ? [{ id: entry.id, badge_level: entry.level }] : [])
      }

      return new Response("not found", { status: 404 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  clearBackoff("openssf")
})

describe("scorecardColor", () => {
  it("maps score bands to status keywords", () => {
    expect(scorecardColor(10)).toBe("success")
    expect(scorecardColor(8)).toBe("success")
    expect(scorecardColor(7.9)).toBe("pending")
    expect(scorecardColor(5)).toBe("pending")
    expect(scorecardColor(4.9)).toBe("failure")
    expect(scorecardColor(0)).toBe("failure")
  })

  // Provider badges resolve color through statusColors only; a palette name
  // like "brightgreen" renders as the theme default instead of the intended
  // color, so every color we emit must be a key in that map.
  it("only emits keywords the renderer can resolve", () => {
    for (const score of [10, 8, 7, 5, 4, 0]) {
      expect(statusColors).toHaveProperty(scorecardColor(score))
    }
  })
})

describe("OpenSSF Scorecard provider", () => {
  it("returns the score to one decimal with a viewer link", async () => {
    const data = await getOpenSSFScorecard("high", "repo")
    expect(data?.label).toBe("scorecard")
    // Stable badge width: an integer score still renders "9.0".
    expect(data?.value).toBe("9.0")
    expect(data?.color).toBe("success")
    expect(data?.link).toBe("https://scorecard.dev/viewer/?uri=github.com/high/repo")
  })

  it("keeps a fractional score and colors it by threshold", async () => {
    const data = await getOpenSSFScorecard("mid", "repo")
    expect(data?.value).toBe("6.4")
    expect(data?.color).toBe("pending")
  })

  it("renders a low score rather than treating it as a failure", async () => {
    const data = await getOpenSSFScorecard("low", "repo")
    expect(data?.value).toBe("1.7")
    expect(data?.color).toBe("failure")
  })

  it("renders a zero score (not null — 0 is a real result)", async () => {
    const data = await getOpenSSFScorecard("zero", "repo")
    expect(data?.value).toBe("0.0")
    expect(data?.color).toBe("failure")
  })

  it("returns null for a repo that has never been scanned (404)", async () => {
    expect(await getOpenSSFScorecard("unscanned", "repo")).toBeNull()
  })

  it("returns null when the record has no score instead of rendering NaN", async () => {
    expect(await getOpenSSFScorecard("scoreless", "repo")).toBeNull()
  })

  it("returns null on a transient server failure", async () => {
    expect(await getOpenSSFScorecard("boom", "repo")).toBeNull()
  })
})

describe("OpenSSF Best Practices provider", () => {
  it("returns the badge level and deep-links to the project id", async () => {
    const data = await getOpenSSFBestPractices("silver", "repo")
    expect(data?.label).toBe("openssf")
    expect(data?.value).toBe("silver")
    // No color: a status keyword would suppress the caller's ?color=, and
    // silver/gold can't be expressed as one. Callers theme it themselves.
    expect(data?.color).toBeUndefined()
    expect(data?.link).toBe("https://www.bestpractices.dev/projects/13303")
  })

  it("leaves gold themeable too", async () => {
    const data = await getOpenSSFBestPractices("gold", "repo")
    expect(data?.value).toBe("gold")
    expect(data?.color).toBeUndefined()
  })

  it("renders in_progress as words", async () => {
    const data = await getOpenSSFBestPractices("starting", "repo")
    expect(data?.value).toBe("in progress")
    expect(data?.color).toBeUndefined()
  })

  it("returns null for an unregistered repo (empty array, not a 404)", async () => {
    expect(await getOpenSSFBestPractices("unregistered", "repo")).toBeNull()
  })

  it("returns null when the project reports no level", async () => {
    expect(await getOpenSSFBestPractices("levelless", "repo")).toBeNull()
  })

  it("returns null on a transient server failure", async () => {
    expect(await getOpenSSFBestPractices("boom", "repo")).toBeNull()
  })
})
