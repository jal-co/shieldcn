/**
 * shieldcn
 * lib/badges/svg-parser
 *
 * Parses raw SVG content and extracts path data + viewBox for inline
 * badge rendering. Used for custom icon support — users upload an SVG,
 * we extract the paths, and pass them to the badge renderer.
 *
 * Supports:
 * - <path d="..."> elements (filled)
 * - <circle>, <rect>, <line>, <polyline>, <polygon>, <ellipse> → converted to path
 * - Stroke-based SVGs (auto-detected)
 * - viewBox extraction
 */

import type { IconData } from "./icons"

export interface ParsedSvg {
  icon: IconData
  isStroke: boolean
}

/**
 * Parse an SVG string and extract icon data for badge rendering.
 * Returns null if no renderable paths are found.
 */
export function parseSvg(svg: string): ParsedSvg | null {
  // Extract viewBox
  const vbMatch = svg.match(/viewBox="([^"]+)"/)
  const viewBox = vbMatch ? vbMatch[1] : inferViewBox(svg)

  // Detect stroke-based SVGs
  const isStroke =
    (svg.includes('fill="none"') || svg.includes("fill='none'")) &&
    (svg.includes('stroke="currentColor"') || svg.includes('stroke="'))

  // Extract stroke properties
  let strokeWidth: number | undefined
  let strokeLinecap: string | undefined
  let strokeLinejoin: string | undefined
  if (isStroke) {
    const swMatch = svg.match(/stroke-width="([^"]+)"/)
    if (swMatch) strokeWidth = parseFloat(swMatch[1])
    const lcMatch = svg.match(/stroke-linecap="([^"]+)"/)
    if (lcMatch) strokeLinecap = lcMatch[1]
    const ljMatch = svg.match(/stroke-linejoin="([^"]+)"/)
    if (ljMatch) strokeLinejoin = ljMatch[1]
  }

  const pathDs: string[] = []

  // Extract <path d="..."> elements
  const pathElRe = /<path[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = pathElRe.exec(svg)) !== null) {
    const el = m[0]
    // For stroke-based SVGs, include all paths (even fill="none")
    // For fill-based SVGs, skip paths with fill="none"
    if (!isStroke && /fill\s*=\s*["']none["']/i.test(el)) continue
    const dMatch = el.match(/d="([^"]+)"/) || el.match(/d='([^']+)'/)
    if (dMatch) {
      const d = dMatch[1]
      // Skip simple bounding-box rectangles like "M0 0h24v24H0z"
      if (/^M0[\s,]+0[hHvVlLzZ\d\s,.\-]+$/.test(d) && d.includes("z")) continue
      pathDs.push(d)
    }
  }

  // Extract <circle cx="X" cy="Y" r="R" />
  const circleRe = /<circle[^>]*>/gi
  while ((m = circleRe.exec(svg)) !== null) {
    const el = m[0]
    const cx = extractAttr(el, "cx")
    const cy = extractAttr(el, "cy")
    const r = extractAttr(el, "r")
    if (cx !== null && cy !== null && r !== null) {
      pathDs.push(
        `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 -${r * 2},0`
      )
    }
  }

  // Extract <ellipse cx="X" cy="Y" rx="RX" ry="RY" />
  const ellipseRe = /<ellipse[^>]*>/gi
  while ((m = ellipseRe.exec(svg)) !== null) {
    const el = m[0]
    const cx = extractAttr(el, "cx")
    const cy = extractAttr(el, "cy")
    const rx = extractAttr(el, "rx")
    const ry = extractAttr(el, "ry")
    if (cx !== null && cy !== null && rx !== null && ry !== null) {
      pathDs.push(
        `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${rx * 2},0a${rx},${ry} 0 1,0 -${rx * 2},0`
      )
    }
  }

  // Extract <rect x="X" y="Y" width="W" height="H" [rx="R"] />
  const rectRe = /<rect[^>]*>/gi
  while ((m = rectRe.exec(svg)) !== null) {
    const el = m[0]
    // Skip bounding box rects
    if (/fill\s*=\s*["']none["']/i.test(el)) continue
    const x = extractAttr(el, "x") ?? 0
    const y = extractAttr(el, "y") ?? 0
    const w = extractAttr(el, "width")
    const h = extractAttr(el, "height")
    if (w !== null && h !== null) {
      const rx = extractAttr(el, "rx") ?? 0
      const ry = extractAttr(el, "ry") ?? rx
      if (rx > 0 || ry > 0) {
        pathDs.push(
          `M${x + rx},${y}h${w - 2 * rx}a${rx},${ry} 0 0 1 ${rx},${ry}v${h - 2 * ry}a${rx},${ry} 0 0 1 -${rx},${ry}h-${w - 2 * rx}a${rx},${ry} 0 0 1 -${rx},-${ry}v-${h - 2 * ry}a${rx},${ry} 0 0 1 ${rx},-${ry}z`
        )
      } else {
        pathDs.push(`M${x},${y}h${w}v${h}h-${w}z`)
      }
    }
  }

  // Extract <line x1="X1" y1="Y1" x2="X2" y2="Y2" />
  const lineRe = /<line[^>]*>/gi
  while ((m = lineRe.exec(svg)) !== null) {
    const el = m[0]
    const x1 = extractAttr(el, "x1")
    const y1 = extractAttr(el, "y1")
    const x2 = extractAttr(el, "x2")
    const y2 = extractAttr(el, "y2")
    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      pathDs.push(`M${x1},${y1}L${x2},${y2}`)
    }
  }

  // Extract <polyline points="..." /> and <polygon points="..." />
  const polyRe = /<poly(line|gon)[^>]*points="([^"]+)"[^>]*>/gi
  while ((m = polyRe.exec(svg)) !== null) {
    const isPolygon = m[1].toLowerCase() === "gon"
    const pts = m[2].trim().split(/[\s,]+/)
    if (pts.length >= 4) {
      const pairs: string[] = []
      for (let i = 0; i < pts.length - 1; i += 2) {
        pairs.push(`${pts[i]},${pts[i + 1]}`)
      }
      pathDs.push("M" + pairs.join("L") + (isPolygon ? "Z" : ""))
    }
  }

  if (pathDs.length === 0) return null

  return {
    icon: {
      viewBox,
      path: pathDs.join(" "),
      fillRule: undefined,
      isStroke,
      strokeWidth,
      strokeLinecap,
      strokeLinejoin,
    },
    isStroke,
  }
}

/**
 * Decode a data URI containing SVG content.
 * Supports both base64 and UTF-8 encoded data URIs.
 *
 * Format: data:image/svg+xml;base64,... or data:image/svg+xml;utf8,...
 */
export function decodeSvgDataUri(uri: string): string | null {
  if (!uri.startsWith("data:image/svg+xml")) return null

  // Base64 encoded
  const b64Match = uri.match(/^data:image\/svg\+xml;base64,(.+)$/)
  if (b64Match) {
    try {
      return Buffer.from(b64Match[1], "base64").toString("utf-8")
    } catch {
      return null
    }
  }

  // UTF-8 / percent-encoded
  const utf8Match = uri.match(/^data:image\/svg\+xml[^,]*,(.+)$/)
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractAttr(el: string, name: string): number | null {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`)
  const m = el.match(re)
  if (!m) return null
  const n = parseFloat(m[1])
  return isNaN(n) ? null : n
}

function inferViewBox(svg: string): string {
  const w = extractAttrFromSvg(svg, "width")
  const h = extractAttrFromSvg(svg, "height")
  if (w && h) return `0 0 ${w} ${h}`
  return "0 0 24 24"
}

function extractAttrFromSvg(svg: string, name: string): string | null {
  // Only match attributes on the root <svg> element
  const svgTagMatch = svg.match(/<svg[^>]*>/i)
  if (!svgTagMatch) return null
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`)
  const m = svgTagMatch[0].match(re)
  return m ? m[1] : null
}
