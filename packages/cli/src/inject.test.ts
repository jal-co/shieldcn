/**
 * shieldcn CLI
 * src/inject.test
 *
 * `injectBadges` does destructive file rewriting between markers — a bug
 * here either duplicates badge blocks on every run or corrupts a README
 * that isn't shaped exactly as expected. `injectIntoFile`/`findReadme`
 * round-trip through a real scratch temp directory (mkdtemp under the OS
 * tmp dir) rather than mocking `node:fs`, since the whole point is
 * proving real read-modify-write behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { findReadme, hasMarkers, injectBadges, injectIntoFile } from "./inject.js"
import { INJECT_START, INJECT_END } from "./constants.js"

describe("hasMarkers", () => {
  it("is true only when both markers are present", () => {
    expect(hasMarkers(`${INJECT_START}\nx\n${INJECT_END}`)).toBe(true)
    expect(hasMarkers(INJECT_START)).toBe(false)
    expect(hasMarkers(INJECT_END)).toBe(false)
    expect(hasMarkers("no markers here")).toBe(false)
  })
})

describe("injectBadges", () => {
  it("inserts markers + badges after the first heading when none exist", () => {
    // The blank line already following "# My Project" in the source is
    // preserved verbatim (not collapsed), on top of the one this function adds.
    const content = "# My Project\n\nSome description.\n"
    const result = injectBadges(content, "![badge](x.svg)")
    expect(result).toBe(
      `# My Project\n\n${INJECT_START}\n![badge](x.svg)\n${INJECT_END}\n\n\nSome description.\n`,
    )
  })

  it("prepends the block when there's no heading at all", () => {
    const content = "Just some text, no heading.\n"
    const result = injectBadges(content, "![badge](x.svg)")
    expect(result).toBe(`${INJECT_START}\n![badge](x.svg)\n${INJECT_END}\n\nJust some text, no heading.\n`)
  })

  it("replaces content between existing markers, leaving the rest untouched", () => {
    const content = `# Title\n\n${INJECT_START}\nold badges\n${INJECT_END}\n\nBody text.\n`
    const result = injectBadges(content, "new badges")
    expect(result).toBe(`# Title\n\n${INJECT_START}\nnew badges\n${INJECT_END}\n\nBody text.\n`)
  })

  it("is idempotent — running it twice with the same badges doesn't duplicate the block", () => {
    const content = "# Title\n\nBody.\n"
    const once = injectBadges(content, "badges")
    const twice = injectBadges(once, "badges")
    expect(twice).toBe(once)
    expect(twice.match(new RegExp(INJECT_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(1)
  })

  it("only matches a heading at the start of a line (not text that merely contains '#')", () => {
    // No leading heading — "Not a heading # here" doesn't match ^#\s+.+$ at line start.
    const content = "Not a heading # here\nMore text.\n"
    const result = injectBadges(content, "badges")
    expect(result.startsWith(INJECT_START)).toBe(true)
  })

  it("inserts after the FIRST heading when multiple headings exist", () => {
    const content = "# First\n\n## Second\n\nBody.\n"
    const result = injectBadges(content, "badges")
    const firstHeadingEnd = result.indexOf("# First") + "# First".length
    const markerPos = result.indexOf(INJECT_START)
    expect(markerPos).toBeGreaterThan(firstHeadingEnd)
    expect(result.indexOf("## Second")).toBeGreaterThan(result.indexOf(INJECT_END))
  })
})

describe("findReadme / injectIntoFile (real filesystem)", () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "shieldcn-inject-test-"))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("returns null when no README variant exists", () => {
    expect(findReadme(dir)).toBeNull()
  })

  it("finds README.md when present", () => {
    writeFileSync(join(dir, "README.md"), "# Hi\n")
    expect(findReadme(dir)).toBe(join(dir, "README.md"))
  })

  it("finds a lowercase readme.md variant too", () => {
    writeFileSync(join(dir, "readme.md"), "# Hi\n")
    expect(findReadme(dir)).toBe(join(dir, "readme.md"))
  })

  it("injectIntoFile reads, injects, and writes back to disk", () => {
    const path = join(dir, "README.md")
    writeFileSync(path, "# My Project\n\nDescription.\n")
    injectIntoFile(path, "![badge](x.svg)")
    const updated = readFileSync(path, "utf-8")
    expect(updated).toContain(INJECT_START)
    expect(updated).toContain("![badge](x.svg)")
    expect(updated).toContain("Description.")
  })

  it("injectIntoFile run twice replaces rather than duplicating the block", () => {
    const path = join(dir, "README.md")
    writeFileSync(path, "# My Project\n\nDescription.\n")
    injectIntoFile(path, "![badge-v1](x.svg)")
    injectIntoFile(path, "![badge-v2](x.svg)")
    const updated = readFileSync(path, "utf-8")
    expect(updated).not.toContain("badge-v1")
    expect(updated).toContain("badge-v2")
    expect(updated.split(INJECT_START)).toHaveLength(2) // exactly one marker pair
  })
})
