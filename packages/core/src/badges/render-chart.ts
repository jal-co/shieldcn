/**
 * shieldcn
 * src/badges/render-chart
 *
 * Hand-built SVG line/area chart with shadcn styling. Used for star-history
 * charts (like starcharts) but generic over any cumulative time series.
 *
 * SVGs served as `<img>` are sandboxed — no external CSS, no CSS variables.
 * Everything here resolves to inline attributes/values. Text uses a system
 * sans stack (the same approach starcharts uses) so charts render crisply in
 * GitHub READMEs without an embedded font.
 */

import { formatCount } from "../format"
import { resolveColor, themes, type ThemeName } from "./themes"

/**
 * A single point on a chart series. `date` (ISO-8601) places the point on a
 * time axis; when a series has no dates the points are spaced evenly by index
 * and `label` (if present) is used for the x-axis ticks.
 */
export interface ChartPoint {
  value: number
  date?: string
  label?: string
}

/** shadcn card surface tokens per mode. */
interface ChartSurface {
  bg: string
  border: string
  grid: string
  muted: string
  fg: string
}

const SURFACE: Record<"dark" | "light", ChartSurface> = {
  dark: {
    bg: "#09090b", // zinc-950 (card)
    border: "#27272a", // zinc-800
    grid: "#27272a",
    muted: "#a1a1aa", // zinc-400
    fg: "#fafafa", // zinc-50
  },
  light: {
    bg: "#ffffff",
    border: "#e4e4e7", // zinc-200
    grid: "#e4e4e7",
    muted: "#71717a", // zinc-500
    fg: "#18181b", // zinc-900
  },
}

/** A line series with its accent color. */
export interface ChartSeries {
  label: string
  points: ChartPoint[]
  /** Line + end-dot color. */
  color: string
  /** Area fill color. Defaults to `color`. */
  fill?: string
}

export interface ChartConfig {
  title: string
  subtitle?: string
  series: ChartSeries[]
  width: number
  height: number
  mode: "dark" | "light"
  /** Show the area fill under the line. */
  area: boolean
  /** Optional link wrapping the whole chart. */
  link?: string
  /**
   * Card background. `undefined` → mode default surface; `"transparent"` →
   * no card fill (just the plot, useful for embedding on any page); any
   * `#rrggbb` → explicit fill.
   */
  background?: string
  /** Draw the rounded card border. Defaults to true. */
  border?: boolean
  /** font-family stack for all text. Defaults to the Inter stack. */
  fontFamily?: string
  /** Force the y-axis minimum (default 0 linear, smallest positive for log). */
  yMin?: number
  /** Force the y-axis maximum (default a nice ceiling above the data max). */
  yMax?: number
  /** y-axis scale type. Defaults to linear. */
  yScale?: "linear" | "log"
  /** Number of y-axis gridline intervals (labels = intervals + 1). */
  yTicks?: number
  /** Number of x-axis labels. */
  xTicks?: number
  /** Show the shieldcn watermark in the top-right corner. Defaults to true. */
  logo?: boolean
  /** Watermark color (defaults to the muted surface color). */
  logoColor?: string
  /** Optional icon drawn to the left of the title (resolved SimpleIcons data). */
  titleIcon?: {
    path?: string
    paths?: string[]
    viewBox?: string
    fillRule?: string
    isStroke?: boolean
    strokeWidth?: number
    strokeLinecap?: string
    strokeLinejoin?: string
  }
  /** Title icon color (defaults to the title foreground color). */
  titleIconColor?: string
}

/**
 * shieldcn logo paths (viewBox 0 0 512 512), embedded so the chart can render
 * a small corner watermark without an external asset.
 */
const SHIELDCN_LOGO =
  '<path d="M148.02,363.76c-4.48,0-8.64-2.42-10.86-6.32l-54.29-95.68c-2.15-3.8-2.15-8.52,0-12.32l54.29-95.68c2.21-3.9,6.37-6.32,10.86-6.32h18.51c4.44,0,8.45,2.28,10.73,6.09,2.27,3.82,2.37,8.43.25,12.33l-42.23,77.99c-3.98,7.36-3.98,16.14,0,23.49l22.22,41.02c4.25,7.85,12.43,12.8,21.36,12.92,0,0,45.08.61,45.11.61,8.68,0,16.83-4.64,21.26-12.12l24.87-41.99c2.23-3.77,6.34-6.11,10.72-6.12l19.47-.04c4.48,0,8.49,2.29,10.76,6.12,2.27,3.83,2.35,8.45.21,12.35l-42.2,77.17c-2.19,4-6.39,6.49-10.95,6.49h-110.08Z"/><path d="M346.7,363.69c-4.44,0-8.45-2.28-10.73-6.09-2.27-3.82-2.37-8.43-.25-12.33l42.23-77.99c3.98-7.35,3.98-16.14,0-23.49l-22.22-41.02c-4.25-7.85-12.44-12.8-21.36-12.92,0,0-46.51-.63-46.53-.63-8.88,0-17.12,4.81-21.48,12.54l-23.35,41.36c-2.2,3.9-6.36,6.34-10.84,6.35l-19.21.04c-4.48,0-8.49-2.29-10.76-6.12-2.27-3.83-2.35-8.45-.22-12.36l42.2-77.17c2.19-4.01,6.39-6.5,10.95-6.5h110.08c4.48,0,8.64,2.42,10.86,6.32l54.29,95.68c2.16,3.8,2.16,8.52,0,12.32l-54.29,95.68c-2.21,3.9-6.37,6.32-10.86,6.32h-18.51Z"/>'

/**
 * Named font keywords → a renderable family stack. Custom embedded fonts
 * aren't possible in a sandboxed `<img>` SVG, so these resolve to widely
 * available system families; the keyword still nudges the viewer's renderer
 * toward the intended look.
 */
const SANS_FALLBACK = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"

/**
 * Mirrors the badge `font` vocabulary so charts and badges accept the same
 * keywords. Each resolves to a family stack ending in a system fallback.
 */
const FONT_STACKS: Record<string, string> = {
  inter: `'Inter', ${SANS_FALLBACK}`,
  geist: `'Geist', ${SANS_FALLBACK}`,
  "geist-mono": `'Geist Mono', ${MONO_FALLBACK}`,
  "jetbrains-mono": `'JetBrains Mono', ${MONO_FALLBACK}`,
  "fira-code": `'Fira Code', ${MONO_FALLBACK}`,
  roboto: `'Roboto', ${SANS_FALLBACK}`,
  "space-grotesk": `'Space Grotesk', ${SANS_FALLBACK}`,
  // Friendly generic aliases.
  sans: SANS_FALLBACK,
  mono: MONO_FALLBACK,
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
}

/** The default font matches the badge default (`inter`). */
const DEFAULT_FONT = FONT_STACKS.inter

/** Resolve a `?font=` keyword to a family stack (defaults to inter). */
export function resolveFontFamily(font?: string | null): string {
  if (font && FONT_STACKS[font]) return FONT_STACKS[font]
  return DEFAULT_FONT
}

/** Default accent when no theme/color override is supplied. */
const DEFAULT_ACCENT = "#3b82f6" // blue-500

/**
 * Resolve the accent color from theme/color params.
 * Priority: explicit `color` > `theme` border tint > default.
 */
export function resolveAccent(
  theme?: string | null,
  color?: string | null,
): string {
  const c = resolveColor(color)
  if (c) return `#${c}`
  if (theme && theme in themes) return themes[theme as ThemeName].border
  return DEFAULT_ACCENT
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Convert hex (#rrggbb) to an rgba() string at the given alpha. */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Round to 2dp for compact path data. */
function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Format a date as a short month/year label. */
function dateLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

/** Nice rounded ceiling for the y-axis max. */
function niceMax(value: number): number {
  if (value <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const steps = [1, 2, 2.5, 5, 10]
  for (const s of steps) {
    const candidate = s * pow
    if (candidate >= value) return candidate
  }
  return 10 * pow
}

/**
 * Render the chart to an SVG string.
 */
export function renderChart(cfg: ChartConfig): string {
  const { width, height, mode, area, series } = cfg
  const surf = SURFACE[mode]
  const fontStack = cfg.fontFamily ?? DEFAULT_FONT
  const showBorder = cfg.border !== false
  // Resolve card background: explicit > transparent > mode default.
  const cardBg =
    cfg.background === "transparent"
      ? "none"
      : cfg.background ?? surf.bg
  // The end-dot halo matches the card so a transparent bg gets a transparent
  // halo (no stray ring on top of whatever the chart is embedded on).
  const dotHalo = cfg.background === "transparent" ? "none" : cardBg

  // Plot insets: room for title above and axis labels left/bottom.
  const padTop = 64
  const padBottom = 36
  const padLeft = 56
  const padRight = 24
  const plotW = Math.max(10, width - padLeft - padRight)
  const plotH = Math.max(10, height - padTop - padBottom)

  // Time axis when every point carries a valid date; otherwise an evenly
  // spaced index axis (for arbitrary JSON series).
  const hasDates =
    series.length > 0 &&
    series.every((s) =>
      s.points.length > 0 && s.points.every((p) => p.date && !isNaN(new Date(p.date).getTime())),
    )

  // Domain across all series.
  let tMin = Infinity
  let tMax = -Infinity
  let yMaxData = 0
  let yMinPositive = Infinity
  for (const s of series) {
    for (const p of s.points) {
      if (hasDates && p.date) {
        const t = new Date(p.date).getTime()
        if (t < tMin) tMin = t
        if (t > tMax) tMax = t
      }
      if (p.value > yMaxData) yMaxData = p.value
      if (p.value > 0 && p.value < yMinPositive) yMinPositive = p.value
    }
  }
  if (!isFinite(tMin) || !isFinite(tMax) || tMax === tMin) {
    // Degenerate domain (single point / same instant) — widen by a day.
    const base = isFinite(tMin) ? tMin : Date.now()
    tMin = base - 86400000
    tMax = base + 86400000
  }

  // y-axis domain + scale. Log requires a positive floor.
  const yScale = cfg.yScale === "log" ? "log" : "linear"
  const yTickCount = Math.min(10, Math.max(1, Math.round(cfg.yTicks ?? 4)))
  const xTickCount = Math.min(12, Math.max(2, Math.round(cfg.xTicks ?? 3)))
  let yBottom = cfg.yMin ?? (yScale === "log" ? (isFinite(yMinPositive) ? yMinPositive : 1) : 0)
  if (yScale === "log" && yBottom <= 0) yBottom = 1
  let yTop = cfg.yMax ?? (yScale === "log" ? Math.max(yMaxData, yBottom * 10) : niceMax(yMaxData))
  if (yTop <= yBottom) yTop = yBottom + (yScale === "log" ? yBottom * 9 : 1)

  const xOfDate = (iso: string): number => {
    const t = new Date(iso).getTime()
    const frac = (t - tMin) / (tMax - tMin)
    return padLeft + Math.min(1, Math.max(0, frac)) * plotW
  }
  const xOfIndex = (i: number, len: number): number =>
    padLeft + (len <= 1 ? 0 : i / (len - 1)) * plotW
  const yOf = (value: number): number => {
    let frac: number
    if (yScale === "log") {
      const lb = Math.log10(yBottom)
      const lt = Math.log10(yTop)
      const lv = Math.log10(Math.max(value, yBottom))
      frac = lt === lb ? 0 : (lv - lb) / (lt - lb)
    } else {
      frac = yTop === yBottom ? 0 : (value - yBottom) / (yTop - yBottom)
    }
    frac = Math.min(1, Math.max(0, frac))
    return padTop + plotH - frac * plotH
  }

  // y tick values, evenly spaced in linear or log space.
  const yTickValues: number[] = []
  for (let i = 0; i <= yTickCount; i++) {
    const f = i / yTickCount
    yTickValues.push(
      yScale === "log"
        ? yBottom * Math.pow(yTop / yBottom, f)
        : yBottom + (yTop - yBottom) * f,
    )
  }

  // --- Grid + y-axis labels ---
  let grid = ""
  yTickValues.forEach((v, i) => {
    const y = r2(yOf(v))
    grid += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="${surf.grid}" stroke-width="1" ${i === 0 ? "" : 'stroke-dasharray="3 3"'} />`
    grid += `<text x="${padLeft - 10}" y="${y + 3.5}" text-anchor="end" font-size="11" fill="${surf.muted}" font-family="${fontStack}">${esc(formatCount(Math.round(v)))}</text>`
  })

  // --- X-axis labels (start, mid, end) ---
  let xLabels = ""
  const xTickText: string[] = []
  const xTickX: number[] = []
  if (hasDates) {
    for (let i = 0; i < xTickCount; i++) {
      const t = tMin + ((tMax - tMin) * i) / (xTickCount - 1)
      const iso = new Date(t).toISOString()
      xTickText.push(dateLabel(iso))
      xTickX.push(r2(xOfDate(iso)))
    }
  } else {
    // Index axis — evenly spaced ticks from the longest series.
    const rep = series.reduce((a, b) => (b.points.length > a.points.length ? b : a), series[0] ?? { points: [] as ChartPoint[] })
    const n = rep.points.length
    const ticks = Math.min(xTickCount, Math.max(1, n))
    const idxs = ticks <= 1 ? [0] : [...new Set(Array.from({ length: ticks }, (_, k) => Math.round((k * (n - 1)) / (ticks - 1))))]
    idxs.forEach((i) => {
      const p = rep.points[i]
      xTickText.push(p?.label ?? String(i + 1))
      xTickX.push(r2(xOfIndex(i, n)))
    })
  }
  xTickText.forEach((txt, i) => {
    const anchor =
      xTickText.length === 1 ? "middle" : i === 0 ? "start" : i === xTickText.length - 1 ? "end" : "middle"
    xLabels += `<text x="${xTickX[i]}" y="${padTop + plotH + 22}" text-anchor="${anchor}" font-size="11" fill="${surf.muted}" font-family="${fontStack}">${esc(txt)}</text>`
  })

  // --- Series paths ---
  let defs = ""
  let seriesSvg = ""
  series.forEach((s, si) => {
    const pts = hasDates
      ? [...s.points].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      : s.points
    if (pts.length === 0) return
    const coords = pts.map((p, i) => ({
      x: r2(hasDates ? xOfDate(p.date!) : xOfIndex(i, pts.length)),
      y: r2(yOf(p.value)),
    }))
    const lineD = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`)
      .join(" ")

    if (area) {
      const gid = `chartFill${si}`
      const fillColor = s.fill ?? s.color
      defs += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${rgba(fillColor, 0.35)}" />
        <stop offset="100%" stop-color="${rgba(fillColor, 0)}" />
      </linearGradient>`
      const baseY = r2(padTop + plotH)
      const areaD = `${lineD} L${coords[coords.length - 1].x} ${baseY} L${coords[0].x} ${baseY} Z`
      seriesSvg += `<path d="${areaD}" fill="url(#${gid})" />`
    }

    seriesSvg += `<path d="${lineD}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`
    // End dot.
    const last = coords[coords.length - 1]
    seriesSvg += `<circle cx="${last.x}" cy="${last.y}" r="3.5" fill="${s.color}" stroke="${dotHalo}" stroke-width="2" />`
  })

  // --- Legend (only when >1 series) ---
  let legend = ""
  if (series.length > 1) {
    let lx = padLeft
    const ly = padTop - 16
    series.forEach((s) => {
      legend += `<rect x="${lx}" y="${ly - 8}" width="10" height="10" rx="2" fill="${s.color}" />`
      legend += `<text x="${lx + 16}" y="${ly + 1}" font-size="12" fill="${surf.muted}" font-family="${fontStack}">${esc(s.label)}</text>`
      lx += 24 + s.label.length * 7
    })
  }

  // --- shieldcn watermark (top-right): wordmark + logo glyph ---
  let watermark = ""
  if (cfg.logo !== false) {
    const logoSize = 20
    const wmColor = cfg.logoColor ?? surf.muted
    const logoX = width - padRight - logoSize
    const logoY = 14
    const logoCenterY = logoY + logoSize / 2
    const textRight = logoX - 6
    const logoGlyph = `<g transform="translate(${logoX}, ${logoY}) scale(${r2(logoSize / 512)})" fill="${wmColor}">${SHIELDCN_LOGO}</g>`
    const wordmark = `<text x="${textRight}" y="${r2(logoCenterY + 4)}" text-anchor="end" font-size="12" font-weight="500" fill="${wmColor}" font-family="${fontStack}">shieldcn.dev</text>`
    watermark = `<g fill-opacity="0.65">${wordmark}${logoGlyph}</g>`
  }

  // --- Title block (optional leading icon + title + subtitle) ---
  let titleX = padLeft
  let titleIconSvg = ""
  const ti = cfg.titleIcon
  if (ti && (ti.path || (ti.paths && ti.paths.length))) {
    const iconSize = 26
    const vb = (ti.viewBox || "0 0 24 24").split(/\s+/).map(Number)
    const vbW = vb[2] && vb[2] > 0 ? vb[2] : 24
    const scale = r2(iconSize / vbW)
    const iconY = cfg.subtitle ? 17 : 13
    const pathSvg = ti.paths && ti.paths.length
      ? ti.paths.map((d) => `<path d="${d}" />`).join("")
      : `<path d="${ti.path}" />`
    const iconColor = cfg.titleIconColor ?? surf.fg
    // Stroke icons (Lucide etc.) must not be filled; fill icons (SimpleIcons)
    // must not be stroked — mirrors the badge icon pipeline.
    const paint = ti.isStroke
      ? `fill="none" stroke="${iconColor}" stroke-width="${ti.strokeWidth ?? 2}" stroke-linecap="${ti.strokeLinecap ?? "round"}" stroke-linejoin="${ti.strokeLinejoin ?? "round"}"`
      : `fill="${iconColor}"${ti.fillRule ? ` fill-rule="${ti.fillRule}"` : ""}`
    titleIconSvg = `<g transform="translate(${padLeft}, ${iconY}) scale(${scale})" ${paint}>${pathSvg}</g>`
    titleX = padLeft + iconSize + 10
  }
  const title = `<text x="${titleX}" y="30" font-size="16" font-weight="600" fill="${surf.fg}" font-family="${fontStack}">${esc(cfg.title)}</text>`
  const subtitle = cfg.subtitle
    ? `<text x="${titleX}" y="48" font-size="12" fill="${surf.muted}" font-family="${fontStack}">${esc(cfg.subtitle)}</text>`
    : ""

  const body = `
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="${cardBg}" stroke="${showBorder ? surf.border : "none"}" stroke-width="1" />
  ${grid}
  ${xLabels}
  ${seriesSvg}
  ${legend}
  ${titleIconSvg}
  ${title}
  ${subtitle}
  ${watermark}`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(cfg.title)}">
  <defs>${defs}</defs>
  ${body}
</svg>`

  return svg
}
