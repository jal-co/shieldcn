/**
 * shieldcn
 * lib/studio-shared
 *
 * Block model, defaults, URL builders, and Markdown serialization for the
 * README Studio. A README is modeled as an ordered list of blocks. Each block
 * is one of: rich markdown text, a header banner, a row of badges, or a chart.
 *
 * The Studio renders these blocks live (selectable, Figma-style) and serializes
 * the whole document to clean GitHub-flavored Markdown for export.
 */

import {
  BUILDER_DEFAULTS,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"
import {
  HEADER_DEFAULTS,
  buildHeaderUrl,
  type HeaderState,
} from "@/lib/header-builder-shared"

// ---------------------------------------------------------------------------
// Chart state (the chart sandbox keeps state inline; the Studio needs it as a
// serializable object, so we model it here and mirror the sandbox URL builder).
// ---------------------------------------------------------------------------

export type ChartKind = "stars" | "issues" | "npm" | "json"

export interface ChartState {
  kind: ChartKind
  owner: string
  repo: string
  package: string
  values: string
  dataLabel: string
  format: "svg" | "png"
  mode: "dark" | "light"
  theme: string
  font: string
  color: string
  fill: string
  area: boolean
  transparent: boolean
  border: boolean
  logo: boolean
  width: string
  height: string
  title: string
  icon: string
  days: string
}

export const CHART_DEFAULTS: ChartState = {
  kind: "stars",
  owner: "vercel",
  repo: "next.js",
  package: "zod",
  values: "10,25,40,30,60,55,80",
  dataLabel: "",
  format: "svg",
  mode: "dark",
  theme: "_none",
  font: "inter",
  color: "",
  fill: "",
  area: true,
  transparent: false,
  border: true,
  logo: true,
  width: "800",
  height: "400",
  title: "",
  icon: "",
  days: "365",
}

export const CHART_THEMES = [
  "_none", "zinc", "blue", "green", "rose", "orange", "amber",
  "violet", "purple", "cyan", "emerald",
] as const

export const CHART_FONTS = [
  "inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk",
] as const

/** Build the `/chart/...` URL for a chart block. Mirrors chart-sandbox.tsx. */
export function buildChartUrl(s: ChartState, baseUrl: string): string | null {
  const ext = s.format === "svg" ? ".svg" : ".png"
  let path: string
  if (s.kind === "stars" || s.kind === "issues") {
    if (!s.owner || !s.repo) return null
    path = `/chart/github/${s.kind}/${encodeURIComponent(s.owner)}/${encodeURIComponent(s.repo)}${ext}`
  } else if (s.kind === "npm") {
    if (!s.package) return null
    const encoded = s.package.split("/").map(encodeURIComponent).join("/")
    path = `/chart/npm/${encoded}${ext}`
  } else {
    path = `/chart/json${ext}`
  }

  const qp = new URLSearchParams()
  if (s.kind === "json") {
    const cleaned = s.values.split(",").map(v => v.trim()).filter(Boolean).join(",")
    if (!cleaned) return null
    qp.set("values", cleaned)
    if (s.dataLabel) qp.set("label", s.dataLabel)
  }
  if (s.kind === "npm" && s.days && s.days !== "365") qp.set("days", s.days)
  if (s.mode !== "dark") qp.set("mode", s.mode)
  if (s.theme && s.theme !== "_none") qp.set("theme", s.theme)
  if (s.font && s.font !== "inter") qp.set("font", s.font)
  if (s.color) qp.set("color", s.color)
  if (s.fill) qp.set("fill", s.fill)
  if (!s.area) qp.set("area", "false")
  if (s.transparent) qp.set("bg", "transparent")
  if (!s.border) qp.set("border", "false")
  if (!s.logo) qp.set("logo", "false")
  if (s.width && s.width !== "800") qp.set("width", s.width)
  if (s.height && s.height !== "400") qp.set("height", s.height)
  if (s.title) qp.set("title", s.title)
  if (s.icon) qp.set("icon", s.icon)

  const qs = qp.toString()
  return `${baseUrl}${path}${qs ? `?${qs}` : ""}`
}

// ---------------------------------------------------------------------------
// Block model
// ---------------------------------------------------------------------------

export type BlockType = "markdown" | "header" | "badges" | "chart" | "table" | "image"

/** Default placeholder image source. */
export const PLACEHOLDER_IMAGE = "https://placeholdpicsum.dev/photo/600/400"

// placeholdpicsum.dev is deterministic per size, so vary the dimensions (at a
// fixed 3:2 aspect) to get a different placeholder photo on each shuffle.
const PLACEHOLDER_WIDTHS = [600, 660, 720, 780, 840, 900, 960]

/** A fresh random placeholder image URL, guaranteed different from `current`. */
export function randomPlaceholder(current?: string): string {
  const currentW = current?.match(/photo\/(\d+)\//)?.[1]
  const pool = PLACEHOLDER_WIDTHS.filter(w => String(w) !== currentW)
  const widths = pool.length ? pool : PLACEHOLDER_WIDTHS
  const w = widths[Math.floor(Math.random() * widths.length)]
  const h = Math.round((w * 2) / 3)
  return `https://placeholdpicsum.dev/photo/${w}/${h}`
}

export type Alignment = "left" | "center" | "right"

interface BaseBlock {
  id: string
  type: BlockType
}

export interface MarkdownBlock extends BaseBlock {
  type: "markdown"
  content: string
  /** Horizontal alignment for the whole text block. */
  align?: Alignment
}

export interface HeaderBlock extends BaseBlock {
  type: "header"
  alt: string
  /** Emit a GitHub <picture> that swaps dark/light with the reader's theme. */
  themeAware?: boolean
  state: HeaderState
}

/** A single badge inside a badge row. */
export interface BadgeItem {
  id: string
  alt: string
  state: BuilderState
}

export interface BadgesBlock extends BaseBlock {
  type: "badges"
  align: Alignment
  /** Emit GitHub <picture> markup so each badge swaps with the reader's theme. */
  themeAware?: boolean
  badges: BadgeItem[]
}

export interface ChartBlock extends BaseBlock {
  type: "chart"
  alt: string
  align: Alignment
  /** Emit a GitHub <picture> that swaps dark/light with the reader's theme. */
  themeAware?: boolean
  state: ChartState
}

export interface ImageBlock extends BaseBlock {
  type: "image"
  /** Image URL or absolute/relative path. */
  src: string
  alt: string
  align?: Alignment
  /** Optional pixel width. */
  width?: string
  /** Optional link wrapping the image. */
  link?: string
}

export interface TableBlock extends BaseBlock {
  type: "table"
  /** Column header labels. Column count is derived from this array. */
  headers: string[]
  /** Per-column horizontal alignment. */
  aligns: Alignment[]
  /** Body rows; each row holds one cell per column. */
  rows: string[][]
  /** Alignment of the whole table within the page. */
  align?: Alignment
}

export type Block = MarkdownBlock | HeaderBlock | BadgesBlock | ChartBlock | TableBlock | ImageBlock

export const BLOCK_LABELS: Record<BlockType, string> = {
  markdown: "Text",
  header: "Header",
  badges: "Badges",
  chart: "Chart",
  table: "Table",
  image: "Image",
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let idCounter = 0
export function newId(prefix = "blk"): string {
  idCounter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${idCounter}${rand}`
}

// ---------------------------------------------------------------------------
// Block factories
// ---------------------------------------------------------------------------

export function makeMarkdownBlock(content?: string): MarkdownBlock {
  return {
    id: newId("md"),
    type: "markdown",
    content:
      content ??
      "## Getting started\n\nWrite anything here using **Markdown**. Add headings, lists, code blocks, links, and tables.\n\n```bash\nnpm install your-package\n```",
  }
}

export function makeHeaderBlock(): HeaderBlock {
  return {
    id: newId("hdr"),
    type: "header",
    alt: "header",
    state: { ...HEADER_DEFAULTS },
  }
}

export function makeBadgeItem(state?: Partial<BuilderState>): BadgeItem {
  return {
    id: newId("badge"),
    alt: "badge",
    state: { ...BUILDER_DEFAULTS, ...state },
  }
}

export function makeBadgesBlock(): BadgesBlock {
  return {
    id: newId("badges"),
    type: "badges",
    align: "left",
    badges: [
      makeBadgeItem({ path: "/npm/react.svg" }),
      makeBadgeItem({ path: "/github/vercel/next.js/stars.svg" }),
    ],
  }
}

export function makeChartBlock(): ChartBlock {
  return {
    id: newId("chart"),
    type: "chart",
    alt: "chart",
    align: "center",
    state: { ...CHART_DEFAULTS },
  }
}

export function makeTableBlock(): TableBlock {
  return {
    id: newId("table"),
    type: "table",
    headers: ["Feature", "Status"],
    aligns: ["left", "left"],
    rows: [
      ["Fast", "✅"],
      ["Accessible", "✅"],
    ],
  }
}

/** Escape a value so it is safe inside a single GFM table cell. */
function escapeCell(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ").trim()
}

/** Serialize a table block to a GitHub-flavored Markdown table. */
export function tableToGfm(block: TableBlock): string {
  const cols = block.headers.length
  if (cols === 0) return ""
  const sepFor = (a: Alignment) =>
    a === "center" ? ":---:" : a === "right" ? "---:" : "---"
  const header = `| ${block.headers.map(escapeCell).join(" | ")} |`
  const sep = `| ${Array.from({ length: cols }, (_, i) => sepFor(block.aligns[i] ?? "left")).join(" | ")} |`
  const body = block.rows.map(row =>
    `| ${Array.from({ length: cols }, (_, i) => escapeCell(row[i] ?? "")).join(" | ")} |`,
  )
  return [header, sep, ...body].join("\n")
}

export function makeImageBlock(): ImageBlock {
  return {
    id: newId("img"),
    type: "image",
    src: randomPlaceholder(),
    alt: "image",
    align: "center",
  }
}

export function makeBlock(type: BlockType): Block {
  switch (type) {
    case "markdown": return makeMarkdownBlock()
    case "header": return makeHeaderBlock()
    case "badges": return makeBadgesBlock()
    case "chart": return makeChartBlock()
    case "table": return makeTableBlock()
    case "image": return makeImageBlock()
  }
}

// ---------------------------------------------------------------------------
// Markdown serialization
// ---------------------------------------------------------------------------

function alignWrap(align: Alignment, inner: string): string {
  if (align === "left") return inner
  return `<p align="${align}">\n  ${inner}\n</p>`
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;") // must run first
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Build a GitHub theme-aware <picture>. The <source> targets dark-theme
 * viewers; the <img> fallback (light) covers light-theme viewers and any
 * renderer that ignores <picture> (npm, PyPI, plain Markdown previews).
 */
function picture(darkUrl: string, lightUrl: string, alt: string, link?: string): string {
  const pic =
    `<picture>` +
    `<source media="(prefers-color-scheme: dark)" srcset="${escapeAttr(darkUrl)}" />` +
    `<img alt="${escapeAttr(alt)}" src="${escapeAttr(lightUrl)}" />` +
    `</picture>`
  return link ? `<a href="${escapeAttr(link)}">${pic}</a>` : pic
}

/**
 * Serialize a single block to Markdown. baseUrl is prepended to image URLs.
 * When `themeAware` is true, image blocks export as GitHub <picture> elements
 * that swap with the reader's light/dark theme.
 */
export function blockToMarkdown(block: Block, baseUrl: string, themeAware = false): string {
  const adaptive = themeAware || ("themeAware" in block && !!block.themeAware)
  switch (block.type) {
    case "markdown": {
      const content = block.content.trim()
      if (!content) return ""
      if (block.align && block.align !== "left") {
        // GitHub renders Markdown inside an aligned <div> when blank lines
        // separate the HTML wrapper from the Markdown content.
        return `<div align="${block.align}">\n\n${content}\n\n</div>`
      }
      return content
    }

    case "header": {
      if (adaptive) {
        const dark = buildHeaderUrl({ ...block.state, mode: "dark" }, baseUrl)
        const light = buildHeaderUrl({ ...block.state, mode: "light" }, baseUrl)
        return `<p align="center">\n  ${picture(dark, light, block.alt)}\n</p>`
      }
      const url = buildHeaderUrl(block.state, baseUrl)
      const img = `<img alt="${escapeAttr(block.alt)}" src="${escapeAttr(url)}" />`
      // Headers are full-width banners — center them.
      return `<p align="center">\n  ${img}\n</p>`
    }

    case "badges": {
      if (block.badges.length === 0) return ""
      // Theme-aware rows emit <picture> per badge (HTML); wrap for alignment.
      if (adaptive) {
        const pics = block.badges.map(b => {
          const dark = buildBadgeUrl({ ...b.state, mode: "dark" }, baseUrl)
          const light = buildBadgeUrl({ ...b.state, mode: "light" }, baseUrl)
          return picture(dark, light, b.alt, b.state.linkUrl || undefined)
        })
        if (block.align === "left") return pics.join("\n")
        return `<p align="${block.align}">\n  ${pics.join("\n  ")}\n</p>`
      }
      const imgs = block.badges.map(b => {
        const url = buildBadgeUrl(b.state, baseUrl)
        const img = `![${b.alt}](${url})`
        return b.state.linkUrl ? `[${img}](${b.state.linkUrl})` : img
      })
      if (block.align === "left") return imgs.join("\n")
      const inner = block.badges.map(b => {
        const url = buildBadgeUrl(b.state, baseUrl)
        const img = `<img alt="${escapeAttr(b.alt)}" src="${escapeAttr(url)}" />`
        return b.state.linkUrl ? `<a href="${escapeAttr(b.state.linkUrl)}">${img}</a>` : img
      }).join("\n  ")
      return `<p align="${block.align}">\n  ${inner}\n</p>`
    }

    case "chart": {
      if (adaptive) {
        const dark = buildChartUrl({ ...block.state, mode: "dark" }, baseUrl)
        const light = buildChartUrl({ ...block.state, mode: "light" }, baseUrl)
        if (!dark || !light) return ""
        const pic = picture(dark, light, block.alt)
        return block.align === "left" ? pic : `<p align="${block.align}">\n  ${pic}\n</p>`
      }
      const url = buildChartUrl(block.state, baseUrl)
      if (!url) return ""
      if (block.align === "left") return `![${block.alt}](${url})`
      return alignWrap(block.align, `<img alt="${escapeAttr(block.alt)}" src="${escapeAttr(url)}" />`)
    }

    case "table": {
      const gfm = tableToGfm(block)
      if (!gfm) return ""
      if (block.align && block.align !== "left") {
        return `<div align="${block.align}">\n\n${gfm}\n\n</div>`
      }
      return gfm
    }

    case "image": {
      if (!block.src) return ""
      const widthAttr = block.width ? ` width="${escapeAttr(block.width)}"` : ""
      // Plain left-aligned images with no width export as clean Markdown.
      if ((!block.align || block.align === "left") && !block.width) {
        const img = `![${block.alt}](${block.src})`
        return block.link ? `[${img}](${block.link})` : img
      }
      const img = `<img alt="${escapeAttr(block.alt)}" src="${escapeAttr(block.src)}"${widthAttr} />`
      const wrapped = block.link ? `<a href="${escapeAttr(block.link)}">${img}</a>` : img
      return block.align && block.align !== "left" ? `<p align="${block.align}">\n  ${wrapped}\n</p>` : wrapped
    }
  }
}

/** Serialize an entire README document to Markdown. */
export function documentToMarkdown(blocks: Block[], baseUrl: string, themeAware = false): string {
  return blocks
    .map(b => blockToMarkdown(b, baseUrl, themeAware))
    .filter(Boolean)
    .join("\n\n") + "\n"
}

// ---------------------------------------------------------------------------
// Starter document
// ---------------------------------------------------------------------------

export function makeStarterDocument(): Block[] {
  const header = makeHeaderBlock()
  header.state = {
    ...HEADER_DEFAULTS,
    title: "Acme Toolkit",
    subtitle: "A delightful component library",
    preset: "gradient",
  }
  const badges = makeBadgesBlock()
  badges.align = "center"
  const intro = makeMarkdownBlock(
    "## Overview\n\nAcme Toolkit is a fast, accessible set of building blocks. Use the toolbar on the right to edit any block, drag the list to reorder, and export clean Markdown for your README.\n\n- 🎨 Themeable\n- ⚡ Fast\n- ♿ Accessible",
  )
  const chart = makeChartBlock()
  return [header, badges, intro, chart]
}
