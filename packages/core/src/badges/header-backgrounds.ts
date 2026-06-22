/**
 * shieldcn
 * src/badges/header-backgrounds
 *
 * Premade background presets for repository header images. Aligned to the
 * shadcn aesthetic: neutral zinc surfaces, subtle texture (dots / grid / graph
 * paper), a restrained themed accent (driven by the same `theme` vocabulary as
 * badges), and a hairline card border. Loud, colorful backgrounds are still
 * achievable via the `?gradient=` / `?bg=` props, but the premade set stays
 * understated and on-brand.
 *
 * Everything resolves to inline SVG `<defs>` + full-canvas paint layers — no
 * external CSS, no CSS variables — so it's safe inside a sandboxed `<img>` SVG.
 */

import { themes, type ThemeName } from "./themes"

export type HeaderMode = "dark" | "light"

/** Background style. Preset names map 1:1 to these. */
export type HeaderStyle = "surface" | "gradient" | "dots" | "grid" | "graph" | "glow" | "transparent"

/** Public list of preset names (for docs / builder UIs). */
export const HEADER_PRESET_NAMES: HeaderStyle[] = [
  "surface",
  "gradient",
  "dots",
  "grid",
  "graph",
  "glow",
  "transparent",
]

/** The default preset when the path carries no preset name. */
export const DEFAULT_HEADER_PRESET: HeaderStyle = "surface"

/** Neutral themes have no strong accent — they get a soft light/zinc glow. */
const NEUTRAL_THEMES = new Set<string>(["zinc", "slate", "stone", "neutral", "gray"])

/** shadcn surface tokens per mode. */
interface Surface {
  base: string
  raised: string
  border: string
}
const SURFACE: Record<HeaderMode, Surface> = {
  dark: { base: "#09090b", raised: "#18181b", border: "#27272a" }, // zinc-950 / zinc-900 / zinc-800
  light: { base: "#ffffff", raised: "#fafafa", border: "#e4e4e7" }, // white / zinc-50 / zinc-200
}

export interface HeaderBgInput {
  /** Named preset (path segment). Falls back to the default when unknown. */
  preset?: string | null
  mode: HeaderMode
  width: number
  height: number
  /** Corner radius (used to clip pattern/glow overflow cleanly). */
  radius: number
  /** shadcn theme name — drives the accent / glow tint. */
  theme?: string | null
  // Prop overrides:
  /** Render with no background fill (blend into the host page). */
  transparent?: boolean
  /** Solid background color hex (no `#`). Replaces the base. */
  bg?: string | null
  /** Custom gradient: "c1,c2[,c3][,angle]" (hex without `#`). Replaces the base. */
  gradient?: string | null
  /** Overlay pattern: dots | grid | graph | none. */
  pattern?: string | null
  /** Spotlight glow color hex (no `#`). */
  glow?: string | null
  /** Accent color hex (no `#`). */
  accent?: string | null
  /**
   * Inlined background photo as a data URI (already fetched + base64 by the
   * route). Renders edge-to-edge under an auto scrim so text stays legible.
   * Wins over bg / gradient / preset patterns.
   */
  imageDataUri?: string | null
  /** Scrim strength over the photo, 0 (none) – 1 (opaque). Default 0.45. */
  overlay?: number | null
  /** Scrim tint color hex (no `#`). Default black. */
  tint?: string | null
}

export interface ResolvedHeaderBg {
  /** Markup to place inside the root `<defs>`. */
  defs: string
  /** Full-canvas paint layers (already clipped by the caller's clipPath). */
  layers: string
  /** Whether the resolved background reads as light (for text contrast). */
  isLight: boolean
  /** Accent color (#rrggbb). */
  accent: string
  /** Hairline border color (#rrggbb) matching the surface. */
  border: string
  /** True when a photo background is in use (text renders light + legible). */
  hasImage: boolean
}

const HEX_RE = /^[0-9a-fA-F]{3,8}$/

function normHex(hex?: string | null): string | undefined {
  if (!hex) return undefined
  const h = hex.replace(/^#/, "")
  if (!HEX_RE.test(h)) return undefined
  return `#${h}`
}

function isLightHex(hex: string): boolean {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return false
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

function rgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Escape a value for safe embedding inside a double-quoted SVG/XML attribute. */
function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Parse a "c1,c2[,c3][,angle]" gradient param into stops + angle. */
function parseGradientSpec(raw: string): { stops: string[]; angle: number } | null {
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return null
  let angle = 135
  let colorParts = parts
  const last = parts[parts.length - 1]
  if (/^\d+(\.\d+)?$/.test(last)) {
    const a = parseFloat(last)
    if (a >= 0 && a <= 360) {
      angle = a
      colorParts = parts.slice(0, -1)
    }
  }
  if (colorParts.length < 2) return null
  if (!colorParts.every((c) => HEX_RE.test(c.replace(/^#/, "")))) return null
  return { stops: colorParts.map((c) => `#${c.replace(/^#/, "")}`), angle }
}

/** CSS-style angle → objectBoundingBox gradient endpoints (0–1). */
function angleToCoords(angle: number): { x1: number; y1: number; x2: number; y2: number } {
  const rad = (angle * Math.PI) / 180
  const dx = Math.sin(rad)
  const dy = -Math.cos(rad)
  return {
    x1: r2(0.5 - dx / 2),
    y1: r2(0.5 - dy / 2),
    x2: r2(0.5 + dx / 2),
    y2: r2(0.5 + dy / 2),
  }
}

/** Resolve accent + glow tint from the shadcn theme name. */
function resolveAccentTint(theme: string | null | undefined, mode: HeaderMode): { accent: string; glow: string } {
  if (theme && theme in themes && !NEUTRAL_THEMES.has(theme)) {
    const c = themes[theme as ThemeName].border
    return { accent: c, glow: c }
  }
  return {
    accent: mode === "dark" ? "#a1a1aa" : "#52525b", // zinc-400 / zinc-600
    glow: mode === "dark" ? "#ffffff" : "#a1a1aa",
  }
}

let gradSeq = 0

/**
 * Resolve a premade preset + prop overrides into renderable SVG fragments.
 */
export function resolveHeaderBackground(input: HeaderBgInput): ResolvedHeaderBg {
  const { mode, width, height } = input
  const surf = SURFACE[mode]
  const style: HeaderStyle =
    input.preset && (HEADER_PRESET_NAMES as string[]).includes(input.preset)
      ? (input.preset as HeaderStyle)
      : DEFAULT_HEADER_PRESET

  const tint = resolveAccentTint(input.theme, mode)
  const accent = normHex(input.accent) ?? tint.accent

  const defs: string[] = []
  const layers: string[] = []
  const uid = `hb${(gradSeq = (gradSeq + 1) % 100000)}`

  let isLight = mode === "light"

  const transparent = !!input.transparent || style === "transparent"
  const bgOverride = normHex(input.bg)
  const gradOverride = input.gradient ? parseGradientSpec(input.gradient) : null
  const image = input.imageDataUri || null

  // --- Base fill ---
  if (image) {
    // Photo background — edge-to-edge cover, then an auto scrim so the title and
    // subtitle stay legible on any image. Text is forced light.
    const overlay = clamp(input.overlay ?? 0.45, 0, 1)
    const tintHex = normHex(input.tint) ?? "#000000"
    const scrimId = `${uid}scrim`
    layers.push(
      `<image href="${escAttr(image)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />`,
    )
    // Flat tint for overall contrast.
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${rgba(tintHex, r2(overlay * 0.5))}" />`)
    // Bottom-weighted vertical gradient so the subtitle reads on busy photos.
    defs.push(
      `<linearGradient id="${scrimId}" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0%" stop-color="${rgba(tintHex, r2(overlay * 0.25))}" />` +
        `<stop offset="100%" stop-color="${rgba(tintHex, r2(Math.min(1, overlay * 1.1)))}" />` +
        `</linearGradient>`,
    )
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${scrimId})" />`)
    isLight = false
  } else if (transparent && !bgOverride && !gradOverride) {
    // No surface fill — blend into the host page. Text contrast follows mode.
  } else if (gradOverride) {
    const { x1, y1, x2, y2 } = angleToCoords(gradOverride.angle)
    const id = `${uid}base`
    const stops = gradOverride.stops
      .map((c, i) => `<stop offset="${r2((i / (gradOverride.stops.length - 1)) * 100)}%" stop-color="${c}" />`)
      .join("")
    defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`)
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id})" />`)
    isLight = isLightHex(gradOverride.stops[0])
  } else if (bgOverride) {
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${bgOverride}" />`)
    isLight = isLightHex(bgOverride)
  } else if (style === "gradient") {
    // Subtle neutral vertical gradient (raised → base).
    const { x1, y1, x2, y2 } = angleToCoords(160)
    const id = `${uid}base`
    defs.push(
      `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
        `<stop offset="0%" stop-color="${surf.raised}" /><stop offset="100%" stop-color="${surf.base}" />` +
        `</linearGradient>`,
    )
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id})" />`)
  } else {
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${surf.base}" />`)
  }

  // --- Pattern overlay (style default, overridable via ?pattern=) ---
  let pattern: "dots" | "grid" | "graph" | null =
    style === "dots" || style === "grid" || style === "graph" ? style : null
  const patParam = input.pattern
  if (patParam === "none" || patParam === "false" || patParam === "0") {
    pattern = null
  } else if (patParam === "dots" || patParam === "grid" || patParam === "graph") {
    pattern = patParam
  }
  if (pattern && !image) {
    const lineColor = rgba(isLight ? "#000000" : "#ffffff", isLight ? 0.06 : 0.06)
    const dotColor = rgba(isLight ? "#000000" : "#ffffff", isLight ? 0.1 : 0.09)
    if (pattern === "dots") {
      const id = `${uid}dots`
      defs.push(
        `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse">` +
          `<circle cx="1.5" cy="1.5" r="1.5" fill="${dotColor}" /></pattern>`,
      )
      layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id})" />`)
    } else if (pattern === "grid") {
      const id = `${uid}grid`
      defs.push(
        `<pattern id="${id}" width="32" height="32" patternUnits="userSpaceOnUse">` +
          `<path d="M32 0H0V32" fill="none" stroke="${lineColor}" stroke-width="1" /></pattern>`,
      )
      layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id})" />`)
    } else {
      const fine = `${uid}graphF`
      const coarse = `${uid}graphC`
      const fineColor = rgba(isLight ? "#000000" : "#ffffff", 0.04)
      defs.push(
        `<pattern id="${fine}" width="16" height="16" patternUnits="userSpaceOnUse">` +
          `<path d="M16 0H0V16" fill="none" stroke="${fineColor}" stroke-width="1" /></pattern>`,
        `<pattern id="${coarse}" width="80" height="80" patternUnits="userSpaceOnUse">` +
          `<path d="M80 0H0V80" fill="none" stroke="${lineColor}" stroke-width="1" /></pattern>`,
      )
      layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${fine})" />`)
      layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${coarse})" />`)
    }
  }

  // --- Spotlight glow (style "glow" default, or ?glow=). Skipped on a fully
  // transparent background unless explicitly requested. ---
  const glowColor = normHex(input.glow) ?? (style === "glow" && !transparent ? tint.glow : undefined)
  if (glowColor && !image) {
    const id = `${uid}glow`
    const cx = r2(width / 2)
    const cy = 0
    const rr = r2(Math.max(width, height) * 0.85)
    const peak = isLight ? 0.3 : 0.16
    defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rr}">` +
        `<stop offset="0%" stop-color="${rgba(glowColor, peak)}" />` +
        `<stop offset="70%" stop-color="${rgba(glowColor, 0)}" />` +
        `</radialGradient>`,
    )
    layers.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="url(#${id})" />`)
  }

  return {
    defs: defs.join(""),
    layers: layers.join(""),
    isLight,
    accent,
    border: surf.border,
    hasImage: !!image,
  }
}
