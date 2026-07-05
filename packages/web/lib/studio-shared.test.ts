/**
 * shieldcn
 * lib/studio-shared.test
 *
 * `documentToMarkdown` turns the Studio's block model into the actual
 * README text a user copies out — this is the core product promise
 * ("what you see in the editor is what ends up in your repo"), and had
 * zero coverage. Covers every block type's Markdown shape (plain vs.
 * aligned-wrapper vs. theme-aware <picture>), `tableToGfm`'s cell
 * escaping, and the `serializeProject`/`deserializeProject` round-trip
 * added in PR-3.7.
 */

import { describe, it, expect } from "vitest"
import {
  documentToMarkdown,
  blockToMarkdown,
  tableToGfm,
  buildGroupUrl,
  buildChartUrl,
  serializeProject,
  deserializeProject,
  makeMarkdownBlock,
  makeHeaderBlock,
  makeBadgesBlock,
  makeGroupBlock,
  makeTableBlock,
  makeStarterDocument,
  normalizeBlocks,
  CHART_DEFAULTS,
  type Block,
  type BadgesBlock,
  type TableBlock,
} from "./studio-shared"

const BASE = "https://shieldcn.dev"

describe("blockToMarkdown — markdown block", () => {
  it("trims content and passes it through unwrapped when left-aligned", () => {
    const block = makeMarkdownBlock("  Hello **world**  ")
    expect(blockToMarkdown(block, BASE)).toBe("Hello **world**")
  })

  it("returns an empty string for blank content (dropped from export)", () => {
    const block = makeMarkdownBlock("   ")
    expect(blockToMarkdown(block, BASE)).toBe("")
  })

  it("wraps non-left alignment in a <div align> so GitHub renders the Markdown inside it", () => {
    const block = makeMarkdownBlock("Centered text")
    block.align = "center"
    expect(blockToMarkdown(block, BASE)).toBe('<div align="center">\n\nCentered text\n\n</div>')
  })
})

describe("blockToMarkdown — header block", () => {
  it("renders a left-aligned <p> wrapper with a plain <img>", () => {
    const block = makeHeaderBlock()
    block.alt = "My Header"
    block.state = { ...block.state, align: "left" }
    const md = blockToMarkdown(block, BASE)
    expect(md).toContain('<p align="left">')
    expect(md).toContain('<img alt="My Header"')
    expect(md).not.toContain("<picture>")
  })

  it("defaults to a centered wrapper (HEADER_DEFAULTS.align)", () => {
    const block = makeHeaderBlock()
    expect(blockToMarkdown(block, BASE)).toContain('<p align="center">')
  })

  it("renders a theme-aware <picture> with dark/light sources when themeAware is set", () => {
    const block = makeHeaderBlock()
    block.themeAware = true
    const md = blockToMarkdown(block, BASE)
    expect(md).toContain("<picture>")
    expect(md).toContain('media="(prefers-color-scheme: dark)"')
    expect(md).toContain("mode=dark")
  })

  it("escapes HTML-significant characters in the alt text", () => {
    const block = makeHeaderBlock()
    block.alt = 'a "quoted" <tag> & more'
    const md = blockToMarkdown(block, BASE)
    expect(md).toContain("a &quot;quoted&quot; &lt;tag&gt; &amp; more")
    expect(md).not.toContain('a "quoted"')
  })
})

describe("blockToMarkdown — badges block", () => {
  it("returns an empty string for an empty badge row", () => {
    const block = makeBadgesBlock()
    block.badges = []
    expect(blockToMarkdown(block, BASE)).toBe("")
  })

  it("renders left-aligned badges as plain Markdown image syntax, one per line", () => {
    const block = makeBadgesBlock()
    const md = blockToMarkdown(block, BASE)
    const lines = md.split("\n")
    expect(lines).toHaveLength(block.badges.length)
    for (const line of lines) expect(line).toMatch(/^!\[.*\]\(.*\)$/)
  })

  it("wraps a linked badge in a Markdown link around the image", () => {
    const block = makeBadgesBlock()
    block.badges = [{ ...block.badges[0]!, state: { ...block.badges[0]!.state, linkUrl: "https://example.com" } }]
    const md = blockToMarkdown(block, BASE)
    expect(md).toMatch(/^\[!\[.*\]\(.*\)\]\(https:\/\/example\.com\)$/)
  })

  it("wraps non-left alignment in a <p align> with <img> tags", () => {
    const block = makeBadgesBlock()
    block.align = "center"
    const md = blockToMarkdown(block, BASE)
    expect(md).toContain('<p align="center">')
    expect(md).toContain("<img alt=")
  })
})

describe("blockToMarkdown — table block", () => {
  it("delegates to tableToGfm and drops the block entirely when it renders empty", () => {
    const block: TableBlock = { id: "t1", type: "table", headers: [], aligns: [], rows: [] }
    expect(blockToMarkdown(block, BASE)).toBe("")
  })

  it("wraps a non-left-aligned table in a <div align>", () => {
    const block = makeTableBlock()
    block.align = "center"
    const md = blockToMarkdown(block, BASE)
    expect(md.startsWith('<div align="center">\n\n|')).toBe(true)
    expect(md.endsWith("|\n\n</div>")).toBe(true)
  })
})

describe("tableToGfm", () => {
  it("renders a GFM header, alignment separator row, and body rows", () => {
    const block: TableBlock = {
      id: "t1",
      type: "table",
      headers: ["A", "B"],
      aligns: ["left", "center"],
      rows: [["1", "2"]],
    }
    expect(tableToGfm(block)).toBe("| A | B |\n| --- | :---: |\n| 1 | 2 |")
  })

  it("escapes pipes, backslashes, and newlines inside a cell", () => {
    const block: TableBlock = {
      id: "t1",
      type: "table",
      headers: ["A"],
      aligns: ["left"],
      rows: [["a | b \\ c\nd"]],
    }
    expect(tableToGfm(block)).toContain("a \\| b \\\\ c d")
  })

  it("pads a short row with empty cells rather than shifting columns", () => {
    const block: TableBlock = {
      id: "t1",
      type: "table",
      headers: ["A", "B", "C"],
      aligns: ["left", "left", "left"],
      rows: [["only-one"]],
    }
    expect(tableToGfm(block)).toBe("| A | B | C |\n| --- | --- | --- |\n| only-one |  |  |")
  })

  it("returns an empty string when there are no columns", () => {
    expect(tableToGfm({ id: "t1", type: "table", headers: [], aligns: [], rows: [] })).toBe("")
  })
})

describe("buildGroupUrl", () => {
  it("returns null when every segment path is empty", () => {
    const block = makeGroupBlock()
    block.badges = [{ ...block.badges[0]!, state: { ...block.badges[0]!.state, path: "" } }]
    expect(buildGroupUrl(block, BASE)).toBeNull()
  })

  it("joins bare segment paths (stripped of leading slash and extension) with +", () => {
    const block = makeGroupBlock()
    const url = buildGroupUrl(block, BASE)
    expect(url).toContain("/group/npm/react+github/stars/vercel/next.js.svg")
  })

  it("omits query params that match the defaults, includes ones that differ", () => {
    const block = makeGroupBlock()
    block.variant = "outline"
    const url = buildGroupUrl(block, BASE)!
    const params = new URL(url).searchParams
    expect(params.get("variant")).toBe("outline")
    expect(params.has("size")).toBe(false) // "sm" is the default
  })
})

describe("buildChartUrl", () => {
  it("returns null for a github-kind chart with no owner/repo", () => {
    expect(buildChartUrl({ ...CHART_DEFAULTS, kind: "stars", owner: "", repo: "" }, BASE)).toBeNull()
  })

  it("returns null for a json-kind chart with no values", () => {
    expect(buildChartUrl({ ...CHART_DEFAULTS, kind: "json", values: "" }, BASE)).toBeNull()
  })

  it("returns null for an npm-kind chart with no package", () => {
    expect(buildChartUrl({ ...CHART_DEFAULTS, kind: "npm", package: "" }, BASE)).toBeNull()
  })

  it("returns null for a commits-kind chart with no users", () => {
    expect(buildChartUrl({ ...CHART_DEFAULTS, kind: "commits", user: "  ,  " }, BASE)).toBeNull()
  })

  it("builds a stars chart URL with encoded owner/repo", () => {
    const url = buildChartUrl({ ...CHART_DEFAULTS, kind: "stars", owner: "vercel", repo: "next.js" }, BASE)
    expect(url).toBe(`${BASE}/chart/github/stars/vercel/next.js.svg`)
  })
})

describe("documentToMarkdown", () => {
  it("joins non-empty blocks with a blank line and trailing newline", () => {
    const blocks: Block[] = [makeMarkdownBlock("First"), makeMarkdownBlock("Second")]
    expect(documentToMarkdown(blocks, BASE)).toBe("First\n\nSecond\n")
  })

  it("drops blocks that render empty (e.g. blank markdown) without leaving a gap", () => {
    const blocks: Block[] = [makeMarkdownBlock("First"), makeMarkdownBlock("   "), makeMarkdownBlock("Third")]
    expect(documentToMarkdown(blocks, BASE)).toBe("First\n\nThird\n")
  })

  it("renders the full starter document without throwing and includes every block's alt/content", () => {
    const md = documentToMarkdown(makeStarterDocument(), BASE)
    expect(md).toContain("Acme Toolkit")
    expect(md).toContain("## Overview")
    expect(md.endsWith("\n")).toBe(true)
  })

  it("propagates document-level themeAware to every block, even ones that don't set it individually", () => {
    const blocks: Block[] = [makeHeaderBlock()]
    const md = documentToMarkdown(blocks, BASE, true)
    expect(md).toContain("<picture>")
  })
})

describe("serializeProject / deserializeProject round-trip", () => {
  it("round-trips blocks and themeAware exactly", () => {
    const blocks = makeStarterDocument()
    const json = serializeProject(blocks, true)
    const project = deserializeProject(json)
    expect(project).not.toBeNull()
    expect(project?.themeAware).toBe(true)
    expect(project?.blocks).toEqual(blocks)
  })

  it("rejects malformed JSON", () => {
    expect(deserializeProject("{not json")).toBeNull()
  })

  it("rejects a well-formed JSON document that isn't a project (wrong version)", () => {
    expect(deserializeProject(JSON.stringify({ version: 2, blocks: [] }))).toBeNull()
  })

  it("rejects an empty blocks array", () => {
    expect(deserializeProject(JSON.stringify({ version: 1, blocks: [] }))).toBeNull()
  })

  it("rejects a block missing an id or with an unrecognized type", () => {
    expect(deserializeProject(JSON.stringify({ version: 1, blocks: [{ type: "markdown" }] }))).toBeNull()
    expect(deserializeProject(JSON.stringify({ version: 1, blocks: [{ id: "x", type: "not-a-real-type" }] }))).toBeNull()
  })

  it("defaults themeAware to false when absent or not literally true", () => {
    const json = JSON.stringify({ version: 1, blocks: [{ id: "x", type: "markdown" }] })
    expect(deserializeProject(json)?.themeAware).toBe(false)
  })
})

describe("normalizeBlocks — backward-compat backfill", () => {
  // A badge state persisted before the `brand` field existed. Rendering it
  // used to crash Studio (`s.brand.trim()` on undefined) → "Something went
  // wrong". normalizeBlocks must backfill it, and serialization must not throw.
  const legacyBadges = {
    id: "badges_legacy",
    type: "badges",
    align: "center",
    badges: [
      {
        id: "badge_legacy",
        alt: "GitHub stars",
        state: {
          path: "/github/stars/jal-co/shieldcn.svg",
          variant: "default",
          size: "sm",
          theme: "_none",
          mode: "dark",
          font: "inter",
          format: "svg",
          split: false,
          // no `brand` (and no linkUrl) — emulates a pre-schema-bump doc
        },
      },
    ],
  } as unknown as BadgesBlock

  it("backfills badge states missing newer fields (e.g. `brand`)", () => {
    const [b] = normalizeBlocks([legacyBadges]) as BadgesBlock[]
    expect(b.badges[0].state.brand).toBe("")
  })

  it("serializes a legacy doc to Markdown without throwing", () => {
    const normalized = normalizeBlocks([legacyBadges])
    expect(() => documentToMarkdown(normalized, BASE)).not.toThrow()
  })

  it("leaves non-badge blocks untouched", () => {
    const md = makeMarkdownBlock("hello")
    expect(normalizeBlocks([md])[0]).toBe(md)
  })
})
