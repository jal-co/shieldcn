/**
 * shieldcn
 * lib/badges/render
 *
 * Renders badges as shadcn Button components → SVG via Satori.
 *
 * Architecture:
 * 1. Resolve all colors/dimensions from variant + size + theme + overrides
 * 2. Pass resolved values to ONE render function
 * 3. No branching inside the renderer — every badge goes through the same path
 *
 * This guarantees visual consistency: same font weight, same opacity rules,
 * same spacing, same icon treatment across all variants. The ONLY thing
 * that changes per variant is bg/fg/border color values.
 */

import * as React from "react"
import satori from "satori"
import { optimize } from "svgo"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { BadgeConfig } from "./types"
import { animateSvg } from "./animate"
import {
  darkMode,
  lightMode,
  getButtonStyle,
  getButtonSize,
  type ModeColors,
} from "./button-tokens"

// Pre-load all font files
// Try multiple paths to find fonts — Vercel, Docker standalone, and local dev
// all resolve import.meta.url and process.cwd() differently.
import { existsSync } from "node:fs"

function findFontsDir(): string {
  const candidates = [
    // 1. Relative to this file via import.meta.url (works in Docker standalone)
    join(dirname(fileURLToPath(import.meta.url)), "..", "fonts"),
    // 2. In packages/core/src/fonts relative to cwd (works in local dev / Vercel)
    join(process.cwd(), "packages", "core", "src", "fonts"),
    // 3. Relative to cwd when cwd is packages/web (Vercel with root=packages/web)
    join(process.cwd(), "..", "core", "src", "fonts"),
    // 4. Legacy path (pre-monorepo)
    join(process.cwd(), "lib", "fonts"),
  ]
  for (const dir of candidates) {
    if (existsSync(join(dir, "inter-medium.ttf"))) return dir
  }
  throw new Error(`Could not find font files. Searched: ${candidates.join(", ")}`)
}

const fontsDir = findFontsDir()
const interData = readFileSync(join(fontsDir, "inter-medium.ttf"))
const geistData = readFileSync(join(fontsDir, "geist-medium.ttf"))
const geistMonoData = readFileSync(join(fontsDir, "geist-mono-medium.ttf"))
const jetbrainsMonoData = readFileSync(join(fontsDir, "jetbrains-mono-medium.ttf"))
const firaCodeData = readFileSync(join(fontsDir, "fira-code-medium.ttf"))
const robotoData = readFileSync(join(fontsDir, "roboto-medium.ttf"))
const spaceGroteskData = readFileSync(join(fontsDir, "space-grotesk-medium.ttf"))

export type BadgeFont = "inter" | "geist" | "geist-mono" | "jetbrains-mono" | "fira-code" | "roboto" | "space-grotesk"

const FONT_CONFIG: Record<BadgeFont, { name: string; data: Buffer }> = {
  inter: { name: "Inter", data: interData },
  geist: { name: "Geist", data: geistData },
  "geist-mono": { name: "Geist Mono", data: geistMonoData },
  "jetbrains-mono": { name: "JetBrains Mono", data: jetbrainsMonoData },
  "fira-code": { name: "Fira Code", data: firaCodeData },
  roboto: { name: "Roboto", data: robotoData },
  "space-grotesk": { name: "Space Grotesk", data: spaceGroteskData },
}

function getFonts(font: BadgeFont = "inter") {
  const f = FONT_CONFIG[font] ?? FONT_CONFIG.inter
  return [{ name: f.name, data: f.data, weight: 500 as const, style: "normal" as const }]
}

/** Relative luminance of a hex color (0 = black, 1 = white). */
function luminance(hex: string): number {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Check if a hex background color is light enough to need dark text. */
function isLightBg(hex: string): boolean {
  return luminance(hex) > 0.5
}

/**
 * Determine the best foreground color for a gradient background.
 * Uses average luminance across all color stops. Threshold at 0.7
 * biases toward white text — white is more readable on saturated
 * colors than dark text, which gets muddy. Only truly light/pastel
 * gradients get dark text.
 */
function gradientFg(gradient: string): string {
  const stops = gradient.match(/#[0-9a-fA-F]{3,8}/g)
  if (!stops || stops.length === 0) return "#ffffff"
  const avg = stops.reduce((sum, s) => sum + luminance(s), 0) / stops.length
  return avg > 0.7 ? "#18181b" : "#ffffff"
}

/**
 * Darken a hex color by mixing toward black.
 * `amount` 0 = unchanged, 1 = fully black.
 */
function darken(hex: string, amount: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  const dr = Math.round(r * (1 - amount))
  const dg = Math.round(g * (1 - amount))
  const db = Math.round(b * (1 - amount))
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`
}

/**
 * Ensure a color has sufficient contrast against a white background.
 * If the color is too light (luminance > 0.45), darken it until it's readable.
 */
function ensureLightModeContrast(hex: string): string {
  const lum = luminance(hex)
  if (lum <= 0.45) return hex
  // Darken proportionally — the lighter the color, the more darkening needed
  const amount = Math.min((lum - 0.3) * 0.7, 0.55)
  return darken(hex, amount)
}

/** Hex → rgba with baked-in opacity */
function rgba(hex: string, opacity: number): string {
  if (opacity >= 1) return hex
  if (hex === "transparent") return "transparent"
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  return `rgba(${r},${g},${b},${opacity})`
}

// ---------------------------------------------------------------------------
// Resolved badge — all colors/dimensions fully computed, ready to render
// ---------------------------------------------------------------------------

interface ResolvedBadge {
  // Content
  label: string
  value: string

  // Font
  fontFamily: string

  // Dimensions
  height: number
  paddingX: number
  fontSize: number
  gap: number
  iconSize: number
  labelGap: number
  borderRadius: number

  // Colors (all resolved to final hex/rgba values)
  bg: string | undefined          // badge background (undefined = transparent)
  fg: string                      // value text color
  labelFg: string                 // label text color (with opacity baked in)
  iconColor: string               // icon fill/stroke color
  border: string | undefined      // border color (undefined = no border)

  // Status dot
  dotColor: string | undefined    // status dot color (undefined = no dot)
  dotSize: number

  // Split mode
  split: boolean
  leftBg: string                  // split left background
  rightBg: string                 // split right background
  rightFg: string                 // split right text color

  // Gradient
  gradient: string | undefined     // CSS linear-gradient value

  // Icon data (pass-through)
  icon: string | undefined
  iconPaths: string[] | undefined
  iconViewBox: string | undefined
  iconFillRule: string | undefined
  iconFill: string | undefined

  // Stroke-based icon rendering (Lucide, Feather, etc.)
  iconIsStroke: boolean
  iconStrokeWidth: number
  iconStrokeLinecap: string | undefined
  iconStrokeLinejoin: string | undefined

  // Icon rotation (degrees, applied around center)
  iconRotation: number | undefined

  // Full-color flag SVG rendered as a left inset (preserves original colors)
  flagSvg: string | undefined

  // Full-color emoji (Twemoji) SVG rendered as a square left inset
  emojiSvg: string | undefined

  // Full-color logo data URI rendered as a square left inset
  logoDataUri: string | undefined
}

// ---------------------------------------------------------------------------
// Resolve: variant × theme × overrides → ResolvedBadge
// ---------------------------------------------------------------------------

/**
 * Hard cap on badge text length. Provider data and /badge/... path segments
 * are user-controlled; an unbounded string would render a megabyte-wide SVG.
 * Also coerces non-strings so a provider bug can never crash Satori or paint
 * a literal "undefined" into the badge.
 */
const MAX_TEXT_LENGTH = 256

export function sanitizeBadgeText(input: unknown): string {
  if (input === null || input === undefined) return ""
  const s = typeof input === "string" ? input : String(input)
  return s.length > MAX_TEXT_LENGTH ? `${s.slice(0, MAX_TEXT_LENGTH - 1)}…` : s
}

function resolve(config: BadgeConfig): ResolvedBadge {
  const mode = config.mode === "light" ? lightMode : darkMode
  const bs = getButtonStyle(config.style, mode, config.brandColor)
  const bz = getButtonSize(config.size ?? "sm")

  // Dimensions (overridable)
  // Font
  const font = config.font ?? "inter"
  const fontFamily = FONT_CONFIG[font]?.name ?? FONT_CONFIG.inter.name

  const height = config.height ?? bz.height
  const paddingX = config.padX ?? bz.paddingX
  const fontSize = config.fontSize ?? bz.fontSize
  const gap = config.gap ?? bz.gap
  const iconSize = config.iconSize ?? bz.iconSize
  const labelGap = config.labelGap ?? gap
  // Gradient badges need higher label opacity for readability — semi-transparent
  // text on colored backgrounds kills contrast far more than on solid dark/light bg
  const labelOpacity = config.labelOpacity ?? (config.gradient ? 0.9 : 0.7)

  // --- Resolve colors ---
  const isFilled = bs.bg !== "transparent"
  const hasTheme = !!config.hasThemeOverride

  let bg: string | undefined
  let fg: string
  let labelFgBase: string
  let border: string | undefined = bs.border

  if (isFilled && hasTheme) {
    bg = config.colors.labelBg
    fg = config.colors.valueFg
    labelFgBase = config.colors.labelFg
  } else if (isFilled) {
    bg = bs.bg
    fg = bs.fg
    labelFgBase = bs.fg
  } else if (hasTheme) {
    // Outline/ghost with custom color: color becomes the border & value text,
    // but label text should use the mode-aware foreground (dark text on light bg,
    // light text on dark bg) — not the color-derived fg which assumes a filled bg.
    // In light mode, ensure the accent color has enough contrast against white.
    const accentColor = config.mode === "light"
      ? ensureLightModeContrast(config.colors.labelBg)
      : config.colors.labelBg
    bg = undefined
    border = accentColor
    fg = accentColor
    labelFgBase = bs.fg
  } else {
    bg = undefined
    fg = bs.fg
    labelFgBase = bs.fg
  }

  // When gradient is active, override text colors for contrast
  // unless the user has explicitly set them
  if (config.gradient && !config.valueColor && !config.labelTextColor) {
    const gfg = gradientFg(config.gradient)
    fg = gfg
    labelFgBase = gfg
  }

  // Apply overrides
  const finalValueColor = config.valueColor
    ? `#${config.valueColor}`
    : (config.statusDot && config.statusColor ? config.statusColor : fg)

  const finalLabelColor = config.labelTextColor
    ? `#${config.labelTextColor}`
    : (config.statusDot ? labelFgBase : rgba(labelFgBase, labelOpacity))

  const finalIconColor = config.labelTextColor
    ? `#${config.labelTextColor}`
    : rgba(labelFgBase, Math.min(labelOpacity + 0.15, 1))

  // Status dot
  const dotColor = config.statusDot && config.statusColor ? config.statusColor : undefined
  const dotSize = Math.round(fontSize * 0.5)

  // Split colors
  const leftBg = hasTheme ? config.colors.labelBg : mode.secondary
  const rightBg = config.statusColor || config.colors.valueBg || mode.primary
  const rightFg = config.gradient
    ? gradientFg(config.gradient)
    : (config.colors.valueFg || mode.primaryForeground)

  // In split mode, recompute label/icon colors to contrast against leftBg
  // instead of the main badge bg. Without this, dark-on-dark and light-on-light
  // text is invisible in split badges.
  let splitLabelFg = finalLabelColor
  let splitIconColor = finalIconColor
  if (config.split && !config.labelTextColor && !config.gradient) {
    // Pick a foreground that contrasts with the left segment background
    const leftIsLight = isLightBg(leftBg)
    const splitLabelBase = leftIsLight ? "#18181b" : "#fafafa"
    splitLabelFg = config.statusDot ? splitLabelBase : rgba(splitLabelBase, labelOpacity)
    splitIconColor = rgba(splitLabelBase, Math.min(labelOpacity + 0.15, 1))
  }
  // Same for rightFg — ensure it contrasts with rightBg
  let splitRightFg = rightFg
  if (config.split && !config.valueColor && !config.gradient) {
    const rightIsLight = isLightBg(rightBg)
    splitRightFg = rightIsLight ? "#18181b" : "#ffffff"
  }

  return {
    label: sanitizeBadgeText(config.label),
    value: sanitizeBadgeText(config.value),
    fontFamily,
    height,
    paddingX,
    fontSize,
    gap,
    iconSize,
    labelGap,
    borderRadius: bs.borderRadius,
    bg,
    fg: finalValueColor,
    labelFg: config.split ? splitLabelFg : finalLabelColor,
    iconColor: config.split ? splitIconColor : finalIconColor,
    border,
    dotColor,
    dotSize,
    split: !!config.split,
    leftBg,
    rightBg,
    rightFg: splitRightFg,
    gradient: config.gradient,
    icon: config.icon,
    iconPaths: config.iconPaths,
    iconViewBox: config.iconViewBox,
    iconFillRule: config.iconFillRule,
    iconFill: config.iconFill,
    iconIsStroke: !!config.iconIsStroke,
    iconStrokeWidth: config.iconStrokeWidth ?? 2,
    iconStrokeLinecap: config.iconStrokeLinecap,
    iconStrokeLinejoin: config.iconStrokeLinejoin,
    iconRotation: config.iconRotation,
    flagSvg: config.flagSvg,
    emojiSvg: config.emojiSvg,
    logoDataUri: config.logoDataUri,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function renderBadge(config: BadgeConfig): Promise<string> {
  const r = resolve(config)
  const el = r.split ? renderSplit(r) : renderSingle(r)
  const fonts = getFonts(config.font)
  const raw = await satori(el, { height: r.height, fonts })
  const svg = rgbaToHexOpacity(inlineDataUriImages(raw))
  const optimized = optimizeSvg(svg)
  const mode = config.animate ?? "none"
  if (mode === "none") return optimized
  return animateSvg(optimized, mode, r.dotColor)
}

/**
 * Render the static base SVG once and return it alongside the resolved
 * status-dot color. Used by the animated-GIF path: the base SVG is rendered
 * a single time (one Satori call), then `frameSvg()` bakes each frame.
 */
export async function renderBadgeBase(
  config: BadgeConfig,
): Promise<{ svg: string; dotColor?: string }> {
  const r = resolve(config)
  const el = r.split ? renderSplit(r) : renderSingle(r)
  const fonts = getFonts(config.font)
  const raw = await satori(el, { height: r.height, fonts })
  const svg = optimizeSvg(rgbaToHexOpacity(inlineDataUriImages(raw)))
  return { svg, dotColor: r.dotColor }
}

/**
 * Optimize SVG output with SVGO.
 * Reduces Satori's verbose output by ~60% — collapsing path coordinates,
 * removing unused attributes, and merging paths where possible.
 */
function optimizeSvg(svg: string): string {
  try {
    const result = optimize(svg, {
      multipass: true,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              // Keep IDs — Satori uses mask IDs for clipping
              cleanupIds: false,
              // Don't merge separate <path> elements — stroke-based icons
              // (Lucide, Feather) need each path separate to preserve
              // relative coordinate spaces (m commands).
              mergePaths: false,
              // Don't collapse <g> elements — rotation transforms on icon
              // groups must be preserved.
              collapseGroups: false,
              // Round path coordinates but keep absolute commands, and DO NOT
              // bake transforms into path data.
              //
              // Custom icons are positioned with a tiny scale() transform
              // (e.g. 14/512 ≈ 0.027). If SVGO bakes that into the path coords
              // and then rounds to 1 decimal, all curve detail collapses —
              // detailed icons (shieldcn shield, shipperclub) render as an
              // unrecognizable "swirl". Keeping applyTransforms:false leaves
              // the path in its native viewBox space with the scale as a
              // separate transform, preserving fidelity. floatPrecision:1 still
              // compacts the large badge geometry.
              //
              // Stroke-based icons (Lucide, Feather) also rely on this: they
              // join subpaths in one `d`, so absolute commands must be kept.
              convertPathData: {
                floatPrecision: 1,
                applyTransforms: false,
                forceAbsolutePath: true,
              },
            },
          },
        },
      ],
    })
    return result.data
  } catch {
    // If SVGO fails for any reason, return the original
    return svg
  }
}

/**
 * Post-process SVG to inline data URI images as actual SVG elements.
 *
 * Satori emits nested SVG content as <image href="data:image/svg+xml;...">
 * (both the JSX <svg> icons it serializes as `utf8` data URIs, and the
 * <img src="data:...;base64"> flags/emoji/custom logos we pass in). WebKit
 * (Quick Look, browsers) renders an SVG embedded inside an <image>, but
 * Photoshop / Illustrator / Figma do NOT — the logo silently disappears on
 * import. Satori also wraps these <image> tags in `mask`/`clip-path`
 * references that those editors handle poorly.
 *
 * So we decode every SVG data URI and splice its real markup back in as a
 * positioned <g>. This preserves multi-color art (flags, emoji) verbatim and
 * keeps the logo as a first-class part of the badge in any editor.
 */
function inlineDataUriImages(svg: string): string {
  // Match any <image .../> regardless of attribute order.
  const imageRegex = /<image\b([^>]*?)\/>/g

  return svg.replace(imageRegex, (match, attrs: string) => {
    // Only handle SVG data URIs — leave raster (png/jpeg) images alone.
    const hrefMatch = attrs.match(/href="(data:image\/svg\+xml;[^"]+)"/)
    if (!hrefMatch) return match
    const href = hrefMatch[1]

    // Decode the inner SVG — Satori uses `utf8` for serialized JSX icons and
    // `base64` for the <img> data URIs we pass (flags, emoji, custom logos).
    let innerSvg: string
    try {
      if (/;base64,/.test(href)) {
        const b64 = href.replace(/^data:image\/svg\+xml;base64,/, "")
        innerSvg = Buffer.from(b64, "base64").toString("utf8")
      } else {
        const enc = href.replace(/^data:image\/svg\+xml;(?:charset=utf-8|utf8)?,?/, "")
        innerSvg = decodeURIComponent(enc)
      }
    } catch {
      return match
    }

    // Position/size of the placed image (attribute order is not guaranteed).
    const num = (name: string, fallback: number) => {
      const m = attrs.match(new RegExp(`\\b${name}="([^"]+)"`))
      const n = m ? parseFloat(m[1]) : NaN
      return Number.isFinite(n) ? n : fallback
    }
    const x = num("x", 0)
    const y = num("y", 0)
    const width = num("width", 0)
    const height = num("height", 0)
    if (width <= 0 || height <= 0) return match

    // Extract viewBox from inner SVG. Guard against malformed values (a
    // user-supplied ?logo= data URI can carry a garbage viewBox) — a NaN or
    // zero dimension would otherwise produce scale(NaN) and a broken badge.
    const vbMatch = innerSvg.match(/viewBox="([^"]+)"/)
    const viewBox = vbMatch ? vbMatch[1].split(/[\s,]+/).map(Number) : [0, 0, 24, 24]
    let [, , vbWidth, vbHeight] = viewBox
    if (!Number.isFinite(vbWidth) || vbWidth <= 0) vbWidth = 24
    if (!Number.isFinite(vbHeight) || vbHeight <= 0) vbHeight = 24

    // Take the inner SVG's content verbatim (everything between the outer
    // <svg> tags). This preserves nested groups, multiple fills, rotation
    // transforms, etc. — exactly what makes flags/emoji multi-color.
    let inner = innerSvg
      .replace(/^[\s\S]*?<svg\b[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      .trim()
    // Strip serialization artifacts: Satori writes undefined props out as the
    // literal string "undefined" (e.g. fill-rule="undefined"), which is an
    // invalid value that strict SVG parsers reject.
    inner = inner.replace(/\s+[a-zA-Z-]+="undefined"/g, "")
    if (!inner) return match

    // Respect the placement intent. Satori uses preserveAspectRatio="none"
    // for <img> insets that should fill the box (flags), and the default
    // meet behaviour for icons that should keep aspect (contain + center).
    const par = (attrs.match(/preserveAspectRatio="([^"]+)"/)?.[1] ?? "").trim()
    const scaleX = width / vbWidth
    const scaleY = height / vbHeight

    let transform: string
    if (par === "none") {
      transform = `translate(${x},${y}) scale(${scaleX},${scaleY})`
    } else {
      const scale = Math.min(scaleX, scaleY)
      const tx = x + (width - vbWidth * scale) / 2
      const ty = y + (height - vbHeight * scale) / 2
      transform = `translate(${tx},${ty}) scale(${scale})`
    }

    return `<g transform="${transform}">${inner}</g>`
  })
}

/**
 * Rewrite `rgba()` color values into editor-portable `#hex` + `*-opacity`.
 *
 * Satori bakes opacity into `fill="rgba(r,g,b,a)"` (we deliberately avoid the
 * CSS `opacity` property because of a Satori bug). Browsers and Quick Look
 * accept `rgba()` in a presentation attribute, but it is NOT valid SVG 1.1 —
 * Photoshop / Illustrator drop the color and paint the element black or
 * transparent. That is why downloaded badges "lose their colors" in editors.
 *
 * Converting to `fill="#rrggbb" fill-opacity="a"` is universally supported and
 * renders identically everywhere.
 */
function rgbaToHexOpacity(svg: string): string {
  let out = svg
  for (const attr of ["fill", "stroke", "stop-color"] as const) {
    const re = new RegExp(
      `${attr}="rgba\\(\\s*([0-9.]+)\\s*,\\s*([0-9.]+)\\s*,\\s*([0-9.]+)\\s*,\\s*([0-9.]+)\\s*\\)"`,
      "g",
    )
    out = out.replace(re, (_m, r: string, g: string, b: string, a: string) => {
      const hex =
        "#" +
        [r, g, b]
          .map((n) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0"))
          .join("")
      const alpha = Number(a)
      if (!Number.isFinite(alpha) || alpha >= 1) return `${attr}="${hex}"`
      const op = Math.max(0, alpha)
      return `${attr}="${hex}" ${attr}-opacity="${+op.toFixed(3)}"`
    })
  }
  return out
}

export async function renderErrorBadge(label: string, message: string): Promise<string> {
  return renderBadge({
    label: label || "error",
    value: message,
    style: "destructive",
    colors: { labelBg: "#18181b", labelFg: "#a1a1aa", valueBg: "#dc2626", valueFg: "#ffffff", border: "#27272a" },
  })
}

// ---------------------------------------------------------------------------
// Icon element (same for all variants)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Flag element (full-color flag inset, natural 3:2 aspect)
//
// Unlike IconEl, this renders the flag's original multi-color SVG verbatim as
// an <img>, so red/white/blue etc. are preserved. Satori renders <img>
// natively (honouring width/height, border-radius, and object-fit), so the
// flag keeps its natural proportions as a small rounded chip on the left.
// ---------------------------------------------------------------------------

function FlagEl({ r }: { r: ResolvedBadge }) {
  if (!r.flagSvg) return null
  const flagH = Math.round(r.iconSize * 1.15)
  const flagW = Math.round((flagH * 3) / 2) // 3:2 aspect, natural flag proportions
  const src = `data:image/svg+xml;base64,${Buffer.from(r.flagSvg).toString("base64")}`
  return (
    <img
      src={src}
      width={flagW}
      height={flagH}
      style={{
        width: flagW,
        height: flagH,
        borderRadius: 2,
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  )
}

// Full-color emoji (Twemoji) inset. Unlike flags (3:2, cover), emoji are square
// (1:1, contain) and unrounded so the glyph keeps its natural shape.
function EmojiEl({ r }: { r: ResolvedBadge }) {
  if (!r.emojiSvg) return null
  const size = Math.round(r.iconSize * 1.15)
  const src = `data:image/svg+xml;base64,${Buffer.from(r.emojiSvg).toString("base64")}`
  return (
    <img
      src={src}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  )
}

function LogoEl({ r }: { r: ResolvedBadge }) {
  if (!r.logoDataUri) return null
  const size = Math.round(r.iconSize * 1.35)
  return (
    <img
      src={r.logoDataUri}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
    />
  )
}

function IconEl({ r }: { r: ResolvedBadge }) {
  if (!r.icon) return null
  const vb = r.iconViewBox || "0 0 16 16"
  const color = r.iconFill || r.iconColor

  // Compute aspect-ratio-aware dimensions.
  // Most icons are square (24×24, 16×16) but custom SVGs can be any shape
  // (e.g. openpanel is 61×35). We use iconSize as the height constraint
  // and scale width proportionally so non-square icons aren't squished.
  const [, , vbW, vbH] = vb.split(" ").map(Number)
  const aspect = vbW && vbH ? vbW / vbH : 1
  const iconH = r.iconSize
  const iconW = Math.round(r.iconSize * Math.min(aspect, 2.5)) // cap at 2.5:1 to prevent absurdly wide icons

  // Compute rotation transform string if needed
  const rotTransform = r.iconRotation
    ? `rotate(${r.iconRotation}, ${vbW / 2}, ${vbH / 2})`
    : undefined

  if (r.iconIsStroke) {
    // Stroke-based icons (Lucide, Feather, etc.) — render with stroke, not fill.
    // Each original SVG element becomes its own <path> to preserve relative
    // coordinate spaces. Joining them into one `d` would break `m` (relative
    // move-to) commands that are relative to the previous element's end point.
    const paths = r.iconPaths && r.iconPaths.length > 0 ? r.iconPaths : [r.icon]
    const pathEls = paths.map((d, i) => (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={r.iconStrokeWidth}
        strokeLinecap={r.iconStrokeLinecap as "round" | "butt" | "square" | undefined}
        strokeLinejoin={r.iconStrokeLinejoin as "round" | "miter" | "bevel" | undefined}
      />
    ))
    return (
      <svg viewBox={vb} width={iconW} height={iconH} style={{ flexShrink: 0 }}>
        {rotTransform ? <g transform={rotTransform}>{pathEls}</g> : pathEls}
      </svg>
    )
  }

  // Fill-based icons — render each path separately when we have individual
  // paths (multi-path fill icons like openpanel). Fall back to single joined
  // path string for SimpleIcons-style single-path icons.
  const fr = r.iconFillRule as "nonzero" | "evenodd" | undefined
  const hasPaths = r.iconPaths && r.iconPaths.length > 0
  const pathEls = hasPaths
    ? r.iconPaths!.map((d, i) => <path key={i} fill={color} d={d} fillRule={fr} />)
    : <path fill={color} d={r.icon} fillRule={fr} />

  return (
    <svg viewBox={vb} width={iconW} height={iconH} style={{ flexShrink: 0 }}>
      {rotTransform
        ? <g transform={rotTransform}>{pathEls}</g>
        : pathEls
      }
    </svg>
  )
}

/**
 * Shared text style for label and value spans.
 * lineHeight: 1 removes descender padding from the text bounding box,
 * so flexbox alignItems:center aligns the visible glyphs (not the full
 * line box) with the icon.
 */
const textStyle = { lineHeight: 1 } as const

// ---------------------------------------------------------------------------
// Status dot (same for all variants)
// ---------------------------------------------------------------------------

function DotEl({ r }: { r: ResolvedBadge }) {
  if (!r.dotColor) return null
  return (
    <>
      <div style={{
        width: r.dotSize,
        height: r.dotSize,
        borderRadius: "50%",
        backgroundColor: r.dotColor,
        flexShrink: 0,
      }} />
      <div style={{ width: r.gap }} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Single-background render (all non-split badges)
//
// Every variant goes through this. The resolved colors determine the look.
// ---------------------------------------------------------------------------

function renderSingle(r: ResolvedBadge): React.ReactElement {
  // Gradient overrides backgroundColor when present
  const bgStyles = r.gradient
    ? { backgroundImage: r.gradient }
    : r.bg ? { backgroundColor: r.bg } : {}

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height: r.height,
      borderRadius: r.borderRadius,
      paddingLeft: r.paddingX,
      paddingRight: r.paddingX,
      fontFamily: r.fontFamily,
      fontSize: r.fontSize,
      fontWeight: 500,
      ...bgStyles,
      ...(r.border ? { border: `1px solid ${r.border}` } : {}),
    }}>
      <DotEl r={r} />
      <FlagEl r={r} />
      {r.flagSvg && <div style={{ width: r.gap }} />}
      <EmojiEl r={r} />
      {r.emojiSvg && <div style={{ width: r.gap }} />}
      <LogoEl r={r} />
      {r.logoDataUri && <div style={{ width: r.gap }} />}
      <IconEl r={r} />
      {r.icon && <div style={{ width: r.gap }} />}
      {r.label && (
        <>
          <span style={{ color: r.labelFg, ...textStyle }}>{r.label}</span>
          <div style={{ width: r.labelGap }} />
        </>
      )}
      <span style={{ color: r.fg, ...textStyle }}>{r.value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Split render (two backgrounds in one rounded rect)
//
// Same elements, same font, same spacing. Only difference: two bg segments.
// ---------------------------------------------------------------------------

function renderSplit(r: ResolvedBadge): React.ReactElement {
  // When gradient is active, it spans the full badge and inner segments are transparent
  const hasGradient = !!r.gradient

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height: r.height,
      borderRadius: r.borderRadius,
      fontFamily: r.fontFamily,
      fontSize: r.fontSize,
      fontWeight: 500,
      overflow: "hidden",
      ...(hasGradient ? { backgroundImage: r.gradient } : {}),
    }}>
      {/* Left segment */}
      <div style={{
        display: "flex",
        alignItems: "center",
        height: r.height,
        ...(hasGradient ? {} : { backgroundColor: r.leftBg }),
        paddingLeft: r.paddingX,
        paddingRight: r.paddingX,
      }}>
        <DotEl r={r} />
        <EmojiEl r={r} />
        {r.emojiSvg && <div style={{ width: r.gap }} />}
        <LogoEl r={r} />
        {r.logoDataUri && <div style={{ width: r.gap }} />}
        <IconEl r={r} />
        {r.icon && <div style={{ width: r.gap }} />}
        {r.label && <span style={{ color: r.labelFg, ...textStyle }}>{r.label}</span>}
      </div>
      {/* Right segment */}
      <div style={{
        display: "flex",
        alignItems: "center",
        height: r.height,
        ...(hasGradient ? {} : { backgroundColor: r.rightBg }),
        paddingLeft: r.paddingX,
        paddingRight: r.paddingX,
      }}>
        <span style={{ color: r.rightFg, ...textStyle }}>{r.value}</span>
      </div>
    </div>
  )
}
