/**
 * shieldcn
 * lib/studio-import
 *
 * Markdown → block document parser. The inverse of `documentToMarkdown`:
 * takes GitHub-flavored Markdown (e.g. pasted into the Studio's Markdown tab)
 * and reconstructs typed Studio blocks, reversing shieldcn image URLs back into
 * Badge / Group / Chart / Header blocks where recognizable, GFM tables into
 * Table blocks, other images into Image blocks, and prose into Text blocks.
 *
 * Safety: HTML chunks are parsed with the browser's DOMParser, which never
 * executes scripts or loads resources. We only read attributes (src, srcset,
 * href, align, width) — we never inject the parsed HTML into the page. Anything
 * we cannot classify is preserved verbatim as Markdown text (rendered later
 * through a sanitized renderer).
 */

import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import {
  CHART_DEFAULTS,
  makeBadgeItem,
  makeMarkdownBlock,
  newId,
  type Alignment,
  type BadgeItem,
  type Block,
  type ChartState,
  type GroupBlock,
} from "@/lib/studio-shared"
import { BUILDER_DEFAULTS, type BuilderState } from "@/lib/badge-builder-shared"
import { HEADER_DEFAULTS, type HeaderPreset, type HeaderSize, type HeaderState } from "@/lib/header-builder-shared"
import { SPONSORS_DEFAULTS, type SponsorsPreset, type SponsorsSize, type SponsorsState } from "@/lib/sponsors-builder-shared"

// Minimal mdast shape — only the fields this parser reads.
interface MdNode {
  type: string
  children?: MdNode[]
  value?: string
  url?: string
  alt?: string | null
  align?: (string | null)[]
  position?: { start: { offset: number }; end: { offset: number } }
}

type ImgKind = "header" | "group" | "chart" | "badge" | "image" | "sponsors"

interface ImgRef {
  src: string
  alt: string
  link?: string
  width?: string
  themeAware: boolean
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function originOf(baseUrl: string): string | null {
  try { return new URL(baseUrl).origin } catch { return null }
}

function toUrl(src: string, baseUrl: string): URL | null {
  try { return new URL(src, baseUrl || "http://localhost") } catch { return null }
}

/**
 * Decide what kind of block a (possibly shieldcn) image URL maps to. Matches on
 * the shieldcn route prefix (`/header/`, `/group/`, `/chart/`, `/badge/`) on ANY
 * host, since a pasted README typically references the production domain rather
 * than wherever the Studio happens to be running. Provider badges (e.g.
 * `/npm/react.svg`) are recognized when the host is shieldcn (current origin,
 * relative, or *.shieldcn.dev). Only `.svg`/`.png` count — `.gif` etc. stay images.
 */
function classifyUrl(src: string, baseUrl: string): ImgKind {
  const u = toUrl(src, baseUrl)
  if (!u) return "image"
  const ext = /\.(svg|png)$/i.test(u.pathname)
  if (!ext) return "image"
  const first = u.pathname.split("/").filter(Boolean)[0]
  if (first === "header") return "header"
  if (first === "group") return "group"
  if (first === "chart") return "chart"
  if (first === "sponsors") return "sponsors"
  if (first === "badge") return "badge"
  const base = originOf(baseUrl)
  const relative = !/^https?:\/\//i.test(src)
  const sameOrigin = base != null && u.origin === base
  const shieldcnHost = /(^|\.)shieldcn\.dev$/i.test(u.hostname)
  if (relative || sameOrigin || shieldcnHost) return "badge"
  return "image"
}

function fmtOf(u: URL): "svg" | "png" {
  return /\.png$/i.test(u.pathname) ? "png" : "svg"
}

// ---------------------------------------------------------------------------
// URL → typed state reversal
// ---------------------------------------------------------------------------

function badgeItemFromUrl(ref: ImgRef, baseUrl: string): BadgeItem {
  const u = toUrl(ref.src, baseUrl)!
  const q = u.searchParams
  const state: BuilderState = {
    ...BUILDER_DEFAULTS,
    path: u.pathname,
    format: fmtOf(u),
    variant: q.get("variant") || "default",
    size: q.get("size") || "sm",
    theme: q.get("theme") || "_none",
    mode: q.get("mode") || "dark",
    font: q.get("font") || "inter",
    split: q.get("split") === "true",
    logo: q.get("logo") || "",
    logoColor: q.get("logoColor") || "",
    label: q.get("label") || "",
    color: q.get("color") || "",
    labelColor: q.get("labelColor") || "",
    valueColor: q.get("valueColor") || "",
    labelTextColor: q.get("labelTextColor") || "",
    labelOpacity: q.get("labelOpacity") || "",
    gradient: q.get("gradient") || "",
    linkUrl: ref.link || "",
  }
  return { id: newId("badge"), alt: ref.alt || "badge", state }
}

function groupBlockFromUrl(ref: ImgRef, align: Alignment, baseUrl: string): GroupBlock {
  const u = toUrl(ref.src, baseUrl)!
  const q = u.searchParams
  const after = u.pathname
    .replace(/^\/group\//, "")
    .replace(/\.(svg|png)$/i, "")
    .replace(/%2B/gi, "+") // group separators are sometimes percent-encoded
  const badges = after.split("+").filter(Boolean).map(seg => makeBadgeItem({ path: `/${seg}.svg` }))
  return {
    id: newId("group"),
    type: "group",
    align,
    alt: ref.alt || "badge group",
    link: ref.link || undefined,
    variant: q.get("variant") || "secondary",
    size: q.get("size") || "sm",
    theme: q.get("theme") || "_none",
    font: q.get("font") || "inter",
    mode: (q.get("mode") as "dark" | "light") || "dark",
    format: fmtOf(u),
    themeAware: ref.themeAware || undefined,
    badges,
  }
}

function chartStateFromUrl(u: URL): ChartState {
  const q = u.searchParams
  const segs = u.pathname.split("/").filter(Boolean) // ["chart", ...]
  const rest = segs.slice(1)
  const s: ChartState = { ...CHART_DEFAULTS, format: fmtOf(u) }
  if (rest[0] === "github" && (rest[1] === "stars" || rest[1] === "issues")) {
    s.kind = rest[1]
    s.owner = decodeURIComponent(rest[2] || "")
    s.repo = decodeURIComponent((rest[3] || "").replace(/\.(svg|png)$/i, ""))
  } else if (rest[0] === "npm") {
    s.kind = "npm"
    s.package = decodeURIComponent(rest.slice(1).join("/").replace(/\.(svg|png)$/i, ""))
  } else if (rest[0]?.startsWith("json")) {
    s.kind = "json"
    s.values = q.get("values") || ""
    s.dataLabel = q.get("label") || ""
  }
  s.mode = (q.get("mode") as "dark" | "light") || "dark"
  s.theme = q.get("theme") || "_none"
  s.font = q.get("font") || "inter"
  s.color = q.get("color") || ""
  s.fill = q.get("fill") || ""
  s.area = q.get("area") !== "false"
  s.transparent = q.get("bg") === "transparent"
  s.border = q.get("border") !== "false"
  s.logo = q.get("logo") !== "false"
  s.width = q.get("width") || "800"
  s.height = q.get("height") || "400"
  s.title = q.get("title") || ""
  s.icon = q.get("icon") || ""
  s.days = q.get("days") || "365"
  return s
}

function headerStateFromUrl(u: URL): HeaderState {
  const q = u.searchParams
  const segs = u.pathname.split("/").filter(Boolean)
  const preset = (segs[1] || "surface").replace(/\.(svg|png)$/i, "")
  return {
    ...HEADER_DEFAULTS,
    preset: preset as HeaderPreset,
    title: q.get("title") || "",
    subtitle: q.get("subtitle") || "",
    logo: q.get("logo") || "",
    logoColor: q.get("logoColor") || "",
    size: (q.get("size") as HeaderSize) || "banner",
    mode: (q.get("mode") as "dark" | "light") || "dark",
    theme: q.get("theme") || "",
    align: (q.get("align") as "center" | "left") || "center",
    font: q.get("font") || "inter",
    watermark: q.get("watermark") === "true",
    border: q.get("border") !== "false",
    image: q.get("image") || "",
    overlay: q.get("overlay") || "",
  }
}

/** Reverse a `/sponsors/{login}.svg?...` URL into a SponsorsState. */
function sponsorsStateFromUrl(u: URL): SponsorsState {
  const q = u.searchParams
  const segs = u.pathname.split("/").filter(Boolean) // ["sponsors", "{login}.svg"]
  const login = decodeURIComponent((segs[1] || "").replace(/\.(svg|png)$/i, ""))
  const titleParam = q.get("title")
  return {
    ...SPONSORS_DEFAULTS,
    login: login || SPONSORS_DEFAULTS.login,
    // title=false hides it (empty string); a value overrides; absent = default.
    title: titleParam === null ? "Sponsors" : titleParam === "false" ? "" : titleParam,
    preset: ((q.get("preset") || "surface") as SponsorsPreset),
    theme: q.get("theme") || "",
    size: ((q.get("size") as SponsorsSize) || "64"),
    names: q.get("names") !== "false",
    special: q.get("special") || "",
    backers: q.get("backers") || "",
    limit: q.get("limit") || "",
    mode: (q.get("mode") as "dark" | "light") || "dark",
    font: q.get("font") || "inter",
    border: q.get("border") !== "false",
    watermark: q.get("watermark") === "true",
    image: q.get("image") || "",
    overlay: q.get("overlay") || "",
  }
}

// ---------------------------------------------------------------------------
// Image refs → blocks (groups adjacent badges into one Badges block)
// ---------------------------------------------------------------------------

function blocksFromImageRefs(refs: ImgRef[], align: Alignment, baseUrl: string): Block[] {
  const out: Block[] = []
  let badges: BadgeItem[] = []
  let badgesThemeAware = false

  const flushBadges = () => {
    if (!badges.length) return
    out.push({ id: newId("badges"), type: "badges", align, themeAware: badgesThemeAware || undefined, badges })
    badges = []
    badgesThemeAware = false
  }

  for (const ref of refs) {
    const kind = classifyUrl(ref.src, baseUrl)
    if (kind === "badge") {
      badges.push(badgeItemFromUrl(ref, baseUrl))
      badgesThemeAware = badgesThemeAware || ref.themeAware
      continue
    }
    flushBadges()
    const u = toUrl(ref.src, baseUrl)
    if (kind === "header" && u) {
      out.push({ id: newId("hdr"), type: "header", alt: ref.alt, themeAware: ref.themeAware || undefined, state: headerStateFromUrl(u) })
    } else if (kind === "group") {
      out.push(groupBlockFromUrl(ref, align, baseUrl))
    } else if (kind === "chart" && u) {
      out.push({ id: newId("chart"), type: "chart", alt: ref.alt, align, themeAware: ref.themeAware || undefined, state: chartStateFromUrl(u) })
    } else if (kind === "sponsors" && u) {
      out.push({ id: newId("sponsors"), type: "sponsors", alt: ref.alt, align, themeAware: ref.themeAware || undefined, state: sponsorsStateFromUrl(u) })
    } else {
      out.push({ id: newId("img"), type: "image", src: ref.src, alt: ref.alt, align, width: ref.width, link: ref.link })
    }
  }
  flushBadges()
  return out
}

// ---------------------------------------------------------------------------
// HTML chunk extraction (DOMParser — read-only, no script execution)
// ---------------------------------------------------------------------------

function imageRefsFromHtml(html: string): { refs: ImgRef[]; align: Alignment } {
  if (typeof DOMParser === "undefined") return { refs: [], align: "left" }
  const doc = new DOMParser().parseFromString(html, "text/html")
  const aligned = doc.querySelector("[align]")
  const align = ((aligned?.getAttribute("align") || "left") as Alignment)
  const refs: ImgRef[] = []

  doc.querySelectorAll("picture").forEach(pic => {
    const dark = pic.querySelector('source[media*="dark"]')?.getAttribute("srcset")
    const img = pic.querySelector("img")
    const src = dark || img?.getAttribute("src") || ""
    if (!src) return
    refs.push({
      src,
      alt: img?.getAttribute("alt") || "",
      link: pic.closest("a")?.getAttribute("href") || undefined,
      themeAware: true,
    })
  })

  doc.querySelectorAll("img").forEach(img => {
    if (img.closest("picture")) return
    const src = img.getAttribute("src") || ""
    if (!src) return
    refs.push({
      src,
      alt: img.getAttribute("alt") || "",
      link: img.closest("a")?.getAttribute("href") || undefined,
      width: img.getAttribute("width") || undefined,
      themeAware: false,
    })
  })

  return { refs, align }
}

// ---------------------------------------------------------------------------
// Paragraph (markdown image) extraction
// ---------------------------------------------------------------------------

/** If a paragraph is purely image(s)/linked-image(s) with no real text, pull them out. */
function imageRefsFromParagraph(node: MdNode): ImgRef[] | null {
  const refs: ImgRef[] = []
  let hasText = false
  for (const child of node.children ?? []) {
    if (child.type === "image") {
      refs.push({ src: child.url || "", alt: child.alt || "", themeAware: false })
    } else if (child.type === "link") {
      const img = (child.children ?? []).find(c => c.type === "image")
      if (img) refs.push({ src: img.url || "", alt: img.alt || "", link: child.url, themeAware: false })
      else hasText = true
    } else if (child.type === "text") {
      if ((child.value || "").trim()) hasText = true
    } else if (child.type === "break") {
      // ignore line breaks between images
    } else {
      hasText = true
    }
  }
  if (hasText || refs.length === 0) return null
  return refs.filter(r => r.src)
}

// ---------------------------------------------------------------------------
// Table extraction
// ---------------------------------------------------------------------------

function tableBlockFromNode(node: MdNode, md: string): Block {
  const sliceCell = (cell: MdNode): string => {
    if (cell.position) {
      // mdast tableCell positions include the leading "| " delimiter (and a
      // trailing "|" on the last cell). Strip those — keep the inner Markdown.
      return md
        .slice(cell.position.start.offset, cell.position.end.offset)
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .trim()
    }
    return (cell.children ?? []).map(c => c.value ?? "").join("").trim()
  }
  const rows = (node.children ?? []).map(row => (row.children ?? []).map(sliceCell))
  const headers = rows[0] ?? []
  const body = rows.slice(1)
  const aligns: Alignment[] = headers.map((_, i) => {
    const a = node.align?.[i]
    return a === "center" || a === "right" ? a : "left"
  })
  return { id: newId("tbl"), type: "table", headers, aligns, rows: body, align: "left" }
}

// ---------------------------------------------------------------------------
// Top-level parse
// ---------------------------------------------------------------------------

/** Parse Markdown into a typed Studio block document. */
export function markdownToDocument(md: string, baseUrl: string): Block[] {
  let tree: MdNode
  try {
    tree = unified().use(remarkParse).use(remarkGfm).parse(md) as unknown as MdNode
  } catch {
    return [makeMarkdownBlock(md)]
  }

  const out: Block[] = []
  let proseStart: number | null = null
  let proseEnd: number | null = null

  const flushProse = () => {
    if (proseStart === null || proseEnd === null) return
    const text = md.slice(proseStart, proseEnd).trim()
    if (text) out.push(makeMarkdownBlock(text))
    proseStart = null
    proseEnd = null
  }

  const bufferProse = (node: MdNode) => {
    if (!node.position) return
    if (proseStart === null) proseStart = node.position.start.offset
    proseEnd = node.position.end.offset
  }

  for (const node of tree.children ?? []) {
    let special: Block[] | null = null

    if (node.type === "table") {
      special = [tableBlockFromNode(node, md)]
    } else if (node.type === "html" && node.value) {
      const { refs, align } = imageRefsFromHtml(node.value)
      special = refs.length ? blocksFromImageRefs(refs, align, baseUrl) : null
    } else if (node.type === "paragraph") {
      const refs = imageRefsFromParagraph(node)
      special = refs ? blocksFromImageRefs(refs, "left", baseUrl) : null
    }

    if (special && special.length) {
      flushProse()
      out.push(...special)
    } else {
      bufferProse(node)
    }
  }
  flushProse()

  if (out.length === 0) {
    const trimmed = md.trim()
    return trimmed ? [makeMarkdownBlock(trimmed)] : []
  }
  return out
}
