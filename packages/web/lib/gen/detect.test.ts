/**
 * shieldcn
 * lib/gen/detect.test
 *
 * `parseGithubUrl` gates every /gen inspect call — the same logic as
 * packages/cli/src/detect.ts's version (kept in sync by hand, not shared,
 * per this file's own docblock reference from the CLI side), covered here
 * too since a regression in either copy has the same blast radius: silently
 * inspecting/reporting on the wrong repo.
 *
 * `inspect()` itself (the network-heavy orchestration — probing ~50 files,
 * fetching package.json/README from raw.githubusercontent.com, hitting the
 * npm registry) is left uncovered here, the same scoping decision made for
 * the CLI package's inspectLocal/inspectRemote in PR-4.2: it needs realistic
 * fetch fixtures rather than a pass/fail network mock to be worth anything.
 */

import { describe, it, expect } from "vitest"
import { parseGithubUrl } from "./detect"

describe("parseGithubUrl", () => {
  it("returns an error for empty input", () => {
    expect(parseGithubUrl("")).toEqual({ error: "URL is required" })
  })

  it("parses owner/repo shorthand", () => {
    expect(parseGithubUrl("vercel/next.js")).toEqual({
      owner: "vercel",
      repo: "next.js",
      url: "https://github.com/vercel/next.js",
    })
  })

  it("parses a full https URL and strips .git/trailing slash", () => {
    expect(parseGithubUrl("https://github.com/vercel/next.js.git/")).toEqual({
      owner: "vercel",
      repo: "next.js",
      url: "https://github.com/vercel/next.js",
    })
  })

  it("ignores extra path segments", () => {
    expect(parseGithubUrl("https://github.com/vercel/next.js/tree/canary")).toEqual({
      owner: "vercel",
      repo: "next.js",
      url: "https://github.com/vercel/next.js",
    })
  })

  it("rejects a non-github.com host", () => {
    expect(parseGithubUrl("https://gitlab.com/vercel/next.js")).toEqual({
      error: "URL must be a github.com repository",
    })
  })

  it("rejects a URL with fewer than 2 path segments", () => {
    expect(parseGithubUrl("https://github.com/vercel")).toEqual({
      error: "Could not parse owner/repo from URL",
    })
  })
})
