/**
 * @shieldcn/core
 * src/badges/animate.ts
 *
 * Post-process an already-rendered badge SVG to add CSS-based animation.
 *
 * Animations are injected as a `<style>` block plus minimal DOM changes so
 * they run inside `<img>`-sandboxed SVGs (no JS, no external CSS). All
 * animations are wrapped in a `prefers-reduced-motion: no-preference` query
 * so motion-sensitive users see a static badge.
 *
 * Supported modes:
 *   - "pulse"   → the status dot breathes (opacity + scale)
 *   - "glow"    → a soft pulsing halo behind the status dot
 *   - "shimmer" → a diagonal highlight sweeps across the badge
 *   - "none"    → returned unchanged
 */

export type AnimateMode = "pulse" | "glow" | "shimmer" | "none"

const VALID_MODES = new Set<AnimateMode>(["pulse", "glow", "shimmer", "none"])

/** Parse the `?animate=` query param into a known mode (or "none"). */
export function parseAnimate(value: string | null | undefined): AnimateMode {
  if (!value) return "none"
  const v = value.toLowerCase().trim()
  return VALID_MODES.has(v as AnimateMode) ? (v as AnimateMode) : "none"
}

/** Read the SVG root width/height (falls back to viewBox) as numbers. */
function readSvgSize(svg: string): { width: number; height: number } {
  const w = svg.match(/<svg[^>]*\bwidth="([\d.]+)"/)
  const h = svg.match(/<svg[^>]*\bheight="([\d.]+)"/)
  if (w && h) return { width: parseFloat(w[1]), height: parseFloat(h[1]) }

  const vb = svg.match(/<svg[^>]*viewBox="([\d.\s-]+)"/)
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(Number)
    if (parts.length === 4) return { width: parts[2], height: parts[3] }
  }
  return { width: 0, height: 0 }
}

/** Inject a string just before the closing </svg> tag. */
function injectBeforeClose(svg: string, markup: string): string {
  const idx = svg.lastIndexOf("</svg>")
  if (idx === -1) return svg + markup
  return svg.slice(0, idx) + markup + svg.slice(idx)
}

/** Inject a string right after the opening <svg ...> tag. */
function injectAfterOpen(svg: string, markup: string): string {
  const m = svg.match(/<svg[^>]*>/)
  if (!m || m.index === undefined) return markup + svg
  const end = m.index + m[0].length
  return svg.slice(0, end) + markup + svg.slice(end)
}

/**
 * Find the status-dot element and tag it with `class="scn-dot"`.
 *
 * Satori renders the dot `<div>` (a 50%-radius square) as a circular `<path>`
 * built from arc (`A`) commands and `fill` equal to the dot color. Two other
 * elements can share that fill: the value text (long glyph path) and, in the
 * branded variant, the full-width background path. We disambiguate by the
 * path's bounding box: the dot is small and roughly square; the background
 * spans the full badge width and text paths are wide.
 *
 * Returns the (possibly unchanged) svg and whether a dot was tagged.
 */
function tagDot(svg: string, dotColor: string): { svg: string; tagged: boolean } {
  const target = dotColor.toLowerCase()
  const { width: svgW } = readSvgSize(svg)
  let tagged = false

  const out = svg.replace(/<path\b[^>]*\/?>/g, (path) => {
    if (tagged) return path
    const fill = path.match(/fill="([^"]+)"/)?.[1]?.toLowerCase()
    if (!fill || fill !== target) return path
    const d = path.match(/\bd="([^"]+)"/)?.[1] ?? ""
    if (!/[Aa]/.test(d)) return path // dot is built from arcs

    const box = pathBBox(d)
    if (!box) return path
    const bw = box.maxX - box.minX
    const bh = box.maxY - box.minY
    // Dot is small (well under the badge width) and roughly square.
    const small = svgW === 0 ? bw <= 24 : bw <= svgW * 0.4
    if (!small || bw === 0 || Math.abs(bw - bh) > Math.max(2, bw * 0.4)) return path

    tagged = true
    return path.replace(/<path\b/, '<path class="scn-dot"')
  })

  return { svg: out, tagged }
}

/** Compute a coarse bounding box from the numeric coordinates in a path `d`. */
function pathBBox(
  d: string,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  // Extract command letters and number runs, then read X/Y pairs after each
  // command. This is approximate (ignores arc radii/flags) but good enough to
  // size a small circle vs a full-width rect.
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number)
  if (!nums || nums.length < 2) return null
  // The first two numbers are the initial moveTo (absolute). Subsequent
  // coordinate pairs vary by command, but for our shapes (M + A arcs) reading
  // alternating pairs from the start gives a usable bound.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const cmds = d.match(/[MLHVAQTCSZmlhvaqtcsz][^MLHVAQTCSZmlhvaqtcsz]*/g) ?? []
  let x = 0, y = 0
  const see = () => {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }
  for (const seg of cmds) {
    const c = seg[0]
    const n = seg.slice(1).match(/-?\d*\.?\d+/g)?.map(Number) ?? []
    if (c === "M" || c === "L") {
      for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]; y = n[i + 1]; see() }
    } else if (c === "H") {
      for (const v of n) { x = v; see() }
    } else if (c === "V") {
      for (const v of n) { y = v; see() }
    } else if (c === "A") {
      // Repeated arcs share one letter: each arc is 7 numbers ending in x,y.
      for (let i = 0; i + 6 < n.length; i += 7) { x = n[i + 5]; y = n[i + 6]; see() }
    } else {
      for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]; y = n[i + 1]; see() }
    }
  }
  if (!Number.isFinite(minX)) return null
  return { minX, minY, maxX, maxY }
}

/** Build the `<style>` + keyframes block for a given mode. */
function styleBlock(mode: AnimateMode): string {
  let rules = ""

  if (mode === "pulse") {
    rules = `
.scn-dot { transform-box: fill-box; transform-origin: center; animation: scn-pulse 1.6s ease-in-out infinite; }
@keyframes scn-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.45; transform:scale(.82); } }`
  } else if (mode === "glow") {
    rules = `
.scn-glow { transform-box: fill-box; transform-origin: center; animation: scn-glow 1.8s ease-in-out infinite; }
@keyframes scn-glow { 0%,100% { opacity:.55; transform:scale(1); } 50% { opacity:0; transform:scale(2.4); } }`
  } else if (mode === "shimmer") {
    rules = `
.scn-shimmer { animation: scn-shimmer 2.8s ease-in-out infinite; }
@keyframes scn-shimmer { 0% { transform:translateX(-120%); } 60%,100% { transform:translateX(220%); } }`
  }

  return `<style>@media (prefers-reduced-motion: no-preference) {${rules}\n}</style>`
}

/** Geometry of the status dot, read from its tagged path. */
interface DotGeo {
  /** The full `<path class="scn-dot" .../>` string. */
  el: string
  cx: number
  cy: number
  radius: number
}

/** Parse the center + radius of a tagged dot path. */
function readDotGeo(taggedSvg: string): DotGeo | null {
  const el = taggedSvg.match(/<path class="scn-dot"[^>]*\/?>/)?.[0]
  if (!el) return null
  const d = el.match(/\bd="([^"]+)"/)?.[1] ?? ""
  // Dot path: M{x} {y}A{r} {r} 0 0 1 ...  → start is the top of the circle.
  const head = d.match(/M\s*([\d.-]+)[ ,]+([\d.-]+)\s*A\s*([\d.-]+)/)
  if (!head) return null
  const sx = parseFloat(head[1])
  const sy = parseFloat(head[2])
  const radius = parseFloat(head[3])
  return { el, cx: sx, cy: sy + radius, radius }
}

// ---------------------------------------------------------------------------
// Static frame baking (for rasterized .gif output)
//
// resvg ignores CSS keyframes, so animated GIFs are built by rendering N
// static SVGs — for each one this function bakes the animation state at a
// given time t ∈ [0,1) directly into SVG attributes (transform / opacity),
// no CSS.
// ---------------------------------------------------------------------------

/** Number of frames for a smooth, small loop. */
export const GIF_FRAMES = 16
/** Milliseconds per frame (≈20fps). */
export const GIF_FRAME_DELAY_MS = 50

/**
 * Produce a single static SVG frame for an animation at time `t` ∈ [0,1).
 *
 * Mirrors the CSS keyframes in `styleBlock()` but bakes the value into
 * concrete attributes so a rasterizer (resvg) renders the right moment.
 */
export function frameSvg(
  svg: string,
  mode: AnimateMode,
  t: number,
  dotColor?: string,
): string {
  if (mode === "none") return svg
  const phase = ((t % 1) + 1) % 1 // wrap into [0,1)

  // ── pulse: dot opacity 1→.45→1, scale 1→.82→1 (triangle over the loop) ──
  if (mode === "pulse") {
    if (!dotColor) return svg
    const { svg: tagged, tagged: ok } = tagDot(svg, dotColor)
    if (!ok) return svg
    const geo = readDotGeo(tagged)
    if (!geo) return svg

    const tri = 1 - Math.abs(phase * 2 - 1) // 0→1→0
    const opacity = (1 - 0.55 * tri).toFixed(3)
    const scale = 1 - 0.18 * tri
    const tx = (geo.cx * (1 - scale)).toFixed(3)
    const ty = (geo.cy * (1 - scale)).toFixed(3)
    const baked = geo.el.replace(
      /<path class="scn-dot"/,
      `<path opacity="${opacity}" transform="translate(${tx} ${ty}) scale(${scale.toFixed(3)})"`,
    )
    return tagged.replace(geo.el, baked)
  }

  // ── glow: a halo behind the dot, opacity .55→0, scale 1→2.4 ─────────────
  if (mode === "glow") {
    if (!dotColor) return svg
    const { svg: tagged, tagged: ok } = tagDot(svg, dotColor)
    if (!ok) return svg
    const geo = readDotGeo(tagged)
    if (!geo) return svg

    const tri = 1 - Math.abs(phase * 2 - 1)
    const opacity = (0.55 * (1 - tri)).toFixed(3)
    const scale = 1 + 1.4 * tri
    const tx = (geo.cx * (1 - scale)).toFixed(3)
    const ty = (geo.cy * (1 - scale)).toFixed(3)
    const halo =
      `<circle cx="${geo.cx}" cy="${geo.cy}" r="${geo.radius.toFixed(2)}" ` +
      `fill="${dotColor}" opacity="${opacity}" ` +
      `transform="translate(${tx} ${ty}) scale(${scale.toFixed(3)})"/>`
    // strip the scn-dot class (no CSS needed) and place halo behind the dot
    const cleanDot = geo.el.replace(/ class="scn-dot"/, "")
    return tagged.replace(geo.el, halo + cleanDot)
  }

  // ── shimmer: highlight band sweeps left→right across the badge ──────────
  if (mode === "shimmer") {
    const { width, height } = readSvgSize(svg)
    if (width === 0 || height === 0) return svg
    const radius = svg.match(/\brx="([\d.]+)"/)?.[1] ?? "6"
    const bandW = Math.max(8, Math.round(width * 0.22))
    const gradId = "scn-shimmer-grad"
    const clipId = "scn-shimmer-clip"

    // CSS sweep travels translateX(-120% → 220%) over 0→60% then holds.
    const startX = -1.2 * bandW
    const endX = width + 1.2 * bandW
    const p = Math.min(phase / 0.6, 1) // ease first ~60%, hold the rest
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
    const x = (startX + (endX - startX) * eased).toFixed(2)

    const defs =
      `<defs>` +
      `<linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
      `<stop offset="0.5" stop-color="#fff" stop-opacity="0.35"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
      `</linearGradient>` +
      `<clipPath id="${clipId}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}"/></clipPath>` +
      `</defs>`
    const overlay =
      `<g clip-path="url(#${clipId})">` +
      `<rect x="${x}" y="0" width="${bandW}" height="${height}" ` +
      `fill="url(#${gradId})" transform="skewX(-18)"/>` +
      `</g>`
    let out = injectAfterOpen(svg, defs)
    out = injectBeforeClose(out, overlay)
    return out
  }

  return svg
}

/**
 * Apply an animation to a rendered badge SVG.
 *
 * @param svg       The optimized badge SVG string.
 * @param mode      The animation mode.
 * @param dotColor  The resolved status-dot color, if the badge has a dot.
 *                  Required for "pulse"/"glow" (they animate the dot).
 */
export function animateSvg(
  svg: string,
  mode: AnimateMode,
  dotColor?: string,
): string {
  if (mode === "none") return svg

  // ── Dot-based animations ────────────────────────────────────────────
  if (mode === "pulse") {
    if (!dotColor) return svg
    const { svg: tagged, tagged: ok } = tagDot(svg, dotColor)
    if (!ok) return svg
    return injectAfterOpen(tagged, styleBlock("pulse"))
  }

  if (mode === "glow") {
    if (!dotColor) return svg
    // Tag the dot so we can read its geometry, then clone a halo behind it.
    const { svg: tagged, tagged: ok } = tagDot(svg, dotColor)
    if (!ok) return svg

    const dot = tagged.match(/<path class="scn-dot"[^>]*\/?>/)?.[0]
    if (!dot) return injectAfterOpen(tagged, styleBlock("pulse"))

    // Dot path looks like: M{x} {y}A{r} {r} 0 0 1 ...
    // Start point is the top of the circle; center = (x, y + r).
    const d = dot.match(/\bd="([^"]+)"/)?.[1] ?? ""
    const head = d.match(/M\s*([\d.-]+)[ ,]+([\d.-]+)\s*A\s*([\d.-]+)/)
    if (!head) return injectAfterOpen(tagged, styleBlock("pulse"))
    const sx = parseFloat(head[1])
    const sy = parseFloat(head[2])
    const radius = parseFloat(head[3])
    const cx = sx
    const cy = sy + radius

    const halo = `<circle class="scn-glow" cx="${cx}" cy="${cy}" r="${radius.toFixed(2)}" fill="${dotColor}"/>`
    // Insert halo just before the dot so it sits behind it.
    const withHalo = tagged.replace(dot, halo + dot)
    return injectAfterOpen(withHalo, styleBlock("glow"))
  }

  // ── Overlay-based animation ─────────────────────────────────────────
  if (mode === "shimmer") {
    const { width, height } = readSvgSize(svg)
    if (width === 0 || height === 0) return svg

    const radius = svg.match(/<rect[^>]*\brx="([\d.]+)"/)?.[1] ?? "6"
    const bandW = Math.max(8, Math.round(width * 0.22))
    const gradId = "scn-shimmer-grad"
    const clipId = "scn-shimmer-clip"

    const defs =
      `<defs>` +
      `<linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
      `<stop offset="0.5" stop-color="#fff" stop-opacity="0.35"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
      `</linearGradient>` +
      `<clipPath id="${clipId}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}"/></clipPath>` +
      `</defs>`

    const overlay =
      `<g clip-path="url(#${clipId})">` +
      `<rect class="scn-shimmer" x="0" y="0" width="${bandW}" height="${height}" ` +
      `fill="url(#${gradId})" transform="skewX(-18)"/>` +
      `</g>`

    let out = injectAfterOpen(svg, defs)
    out = injectBeforeClose(out, overlay)
    return injectAfterOpen(out, styleBlock("shimmer"))
  }

  return svg
}
