/**
 * shieldcn
 * lib/studio-import.test
 *
 * `markdownToDocument` is the inverse of `documentToMarkdown` — pasting a
 * README into the Studio's Markdown tab has to reconstruct the same shape
 * of blocks a user would have built by hand, including reversing shieldcn
 * image URLs back into typed Badge/Header/Chart/Group blocks. Covers the
 * plain-Markdown-image path directly and, since `imageRefsFromHtml` uses
 * `DOMParser` (only available under a DOM test environment), the `<p
 * align>`/`<picture>` HTML path too — this file runs under jsdom
 * (`packages/web/vitest.config.ts`).
 */

import { describe, it, expect } from "vitest"
import { markdownToDocument } from "./studio-import"
import { documentToMarkdown, makeStarterDocument, type BadgesBlock, type HeaderBlock, type TableBlock } from "./studio-shared"

const BASE = "https://shieldcn.dev"

describe("markdownToDocument — prose", () => {
  it("parses plain prose into a single markdown block", () => {
    const blocks = markdownToDocument("## Hello\n\nSome text.", BASE)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe("markdown")
  })

  it("returns an empty document for blank input", () => {
    expect(markdownToDocument("", BASE)).toEqual([])
    expect(markdownToDocument("   \n  ", BASE)).toEqual([])
  })
})

describe("markdownToDocument — plain Markdown badge images", () => {
  it("recognizes a shieldcn badge URL and groups it into a badges block", () => {
    const blocks = markdownToDocument(`![npm](${BASE}/npm/react.svg)`, BASE)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe("badges")
    const badges = blocks[0] as BadgesBlock
    expect(badges.badges).toHaveLength(1)
    expect(badges.badges[0]!.state.path).toBe("/npm/react.svg")
  })

  it("groups consecutive badge images into ONE badges block", () => {
    const md = `![a](${BASE}/npm/react.svg)\n![b](${BASE}/github/stars/vercel/next.js.svg)`
    const blocks = markdownToDocument(md, BASE)
    expect(blocks).toHaveLength(1)
    expect((blocks[0] as BadgesBlock).badges).toHaveLength(2)
  })

  it("treats an unrecognized (non-shieldcn) image host as a plain image block", () => {
    const blocks = markdownToDocument("![logo](https://example.com/logo.png)", BASE)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe("image")
  })

  it("preserves the badge's link when it's wrapped in a markdown link", () => {
    const md = `[![npm](${BASE}/npm/react.svg)](https://npmjs.com/react)`
    const blocks = markdownToDocument(md, BASE)
    const badges = blocks[0] as BadgesBlock
    expect(badges.badges[0]!.state.linkUrl).toBe("https://npmjs.com/react")
  })

  it("carries over query params (variant, theme, mode) from the badge URL", () => {
    const md = `![npm](${BASE}/npm/react.svg?variant=outline&theme=blue&mode=light)`
    const blocks = markdownToDocument(md, BASE)
    const state = (blocks[0] as BadgesBlock).badges[0]!.state
    expect(state.variant).toBe("outline")
    expect(state.theme).toBe("blue")
    expect(state.mode).toBe("light")
  })
})

describe("markdownToDocument — HTML image chunks (<p align>, <picture>)", () => {
  it("reverses a header <img> tag inside a <p align> wrapper into a header block", () => {
    const md = `<p align="center">\n  <img alt="My Header" src="${BASE}/header/gradient.svg?title=Hi" />\n</p>`
    const blocks = markdownToDocument(md, BASE)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.type).toBe("header")
    const header = blocks[0] as HeaderBlock
    expect(header.alt).toBe("My Header")
    expect(header.state.preset).toBe("gradient")
    expect(header.state.title).toBe("Hi")
  })

  it("reverses a theme-aware <picture> into a block with themeAware set", () => {
    // Matches the real export shape (blockToMarkdown always wraps a <picture>
    // in a <p align> block) — a bare <picture> with no block-level wrapper
    // isn't a CommonMark HTML block and won't reach imageRefsFromHtml at all.
    const md =
      `<p align="center">\n  <picture><source media="(prefers-color-scheme: dark)" srcset="${BASE}/header/gradient.svg?mode=dark" />` +
      `<img alt="hdr" src="${BASE}/header/gradient.svg?mode=light" /></picture>\n</p>`
    const blocks = markdownToDocument(md, BASE)
    expect(blocks[0]!.type).toBe("header")
    const header = blocks[0] as HeaderBlock
    expect(header.themeAware).toBe(true)
  })

  it("captures a linked, width-set image as a plain image block with those attributes", () => {
    const md = `<p align="right">\n  <a href="https://example.com"><img alt="pic" src="https://cdn.example.com/x.png" width="200" /></a>\n</p>`
    const blocks = markdownToDocument(md, BASE)
    expect(blocks[0]!.type).toBe("image")
    const img = blocks[0] as import("./studio-shared").ImageBlock
    expect(img.link).toBe("https://example.com")
    expect(img.width).toBe("200")
    expect(img.align).toBe("right")
  })
})

describe("markdownToDocument — tables", () => {
  it("parses a GFM table into a table block with headers, aligns, and rows", () => {
    const md = "| A | B |\n| :--- | ---: |\n| 1 | 2 |"
    const blocks = markdownToDocument(md, BASE)
    expect(blocks).toHaveLength(1)
    const table = blocks[0] as TableBlock
    expect(table.type).toBe("table")
    expect(table.headers).toEqual(["A", "B"])
    expect(table.aligns).toEqual(["left", "right"])
    expect(table.rows).toEqual([["1", "2"]])
  })
})

describe("markdownToDocument — round trip with documentToMarkdown", () => {
  it("re-importing the starter document's own export yields the same block TYPES in the same order", () => {
    const original = makeStarterDocument()
    const exported = documentToMarkdown(original, BASE)
    const reimported = markdownToDocument(exported, BASE)
    expect(reimported.map(b => b.type)).toEqual(original.map(b => b.type))
  })

  it("round-trips a badge's variant/theme/mode through export → import", () => {
    const original = makeStarterDocument()
    const badgesBlock = original.find((b): b is BadgesBlock => b.type === "badges")!
    badgesBlock.badges[0]!.state.variant = "outline"
    badgesBlock.badges[0]!.state.theme = "emerald"

    const exported = documentToMarkdown(original, BASE)
    const reimported = markdownToDocument(exported, BASE)
    const reimportedBadges = reimported.find((b): b is BadgesBlock => b.type === "badges")!
    expect(reimportedBadges.badges[0]!.state.variant).toBe("outline")
    expect(reimportedBadges.badges[0]!.state.theme).toBe("emerald")
  })
})
