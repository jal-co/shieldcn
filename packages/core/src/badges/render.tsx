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

import satori from "satori"
import { optimize } from "svgo"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { BadgeConfig } from "./types"
import {
  darkMode,
  lightMode,
  getButtonStyle,
  getButtonSize,
  type ModeColors,
} from "./button-tokens"

// Pre-load all font files
// Use import.meta.url to resolve relative to this file, not process.cwd()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const fontsDir = join(__dirname, "..", "fonts")
const interData = readFileSync(join(fontsDir, "inter-medium.ttf"))
const geistData = readFileSync(join(fontsDir, "geist-medium.ttf"))
const geistMonoData = readFileSync(join(fontsDir, "geist-mono-medium.ttf"))

export type BadgeFont = "inter" | "geist" | "geist-mono"

const FONT_CONFIG: Record<BadgeFont, { name: string; data: Buffer }> = {
  inter: { name: "Inter", data: interData },
  geist: { name: "Geist", data: geistData },
  "geist-mono": { name: "Geist Mono", data: geistMonoData },
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
}

// ---------------------------------------------------------------------------
// Resolve: variant × theme × overrides → ResolvedBadge
// ---------------------------------------------------------------------------

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

  return {
    label: config.label,
    value: config.value,
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
    labelFg: finalLabelColor,
    iconColor: finalIconColor,
    border,
    dotColor,
    dotSize,
    split: !!config.split,
    leftBg,
    rightBg,
    rightFg,
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
  const svg = inlineDataUriImages(raw)
  return optimizeSvg(svg)
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
            },
          },
        },
        // Round path coordinates but keep absolute commands.
        // Stroke-based icons (Lucide, Feather) join multiple subpaths into
        // one `d` attribute — converting M (absolute move) to m (relative)
        // breaks them because each subpath needs absolute positioning.
        {
          name: "convertPathData",
          params: {
            floatPrecision: 1,
            forceAbsolutePath: true,
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
 * Satori converts nested <svg> to <image href="data:image/svg+xml;...">.
 * Some renderers don't handle these well, so we convert them back to inline paths.
 */
function inlineDataUriImages(svg: string): string {
  // Match <image> tags with SVG data URIs
  const imageRegex = /<image\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"\s+href="data:image\/svg\+xml;[^"]+"[^>]*\/>/g

  return svg.replace(imageRegex, (match, x, y, width, height) => {
    // Extract the data URI content
    const hrefMatch = match.match(/href="data:image\/svg\+xml;utf8,([^"]+)"/)
    if (!hrefMatch) return match

    // Decode the URI-encoded SVG
    let innerSvg: string
    try {
      innerSvg = decodeURIComponent(hrefMatch[1])
    } catch {
      return match
    }

    // Extract viewBox from inner SVG
    const vbMatch = innerSvg.match(/viewBox="([^"]+)"/)
    const viewBox = vbMatch ? vbMatch[1].split(/\s+/).map(Number) : [0, 0, 24, 24]
    const [, , vbWidth, vbHeight] = viewBox

    // Extract any <g transform="..."> wrapper from inner SVG (e.g. rotation)
    const gTransformMatch = innerSvg.match(/<g\s+transform="([^"]+)">/)
    const innerTransform = gTransformMatch ? gTransformMatch[1] : null

    // Extract path(s) from inner SVG
    const paths: string[] = []
    const pathRegex = /<path\s+([^>]+)>/g
    let pathMatch: RegExpExecArray | null
    while ((pathMatch = pathRegex.exec(innerSvg)) !== null) {
      paths.push(`<path ${pathMatch[1]}/>`)
    }

    if (paths.length === 0) return match

    // Calculate scale to fit width x height
    const scaleX = parseFloat(width) / vbWidth
    const scaleY = parseFloat(height) / vbHeight
    const scale = Math.min(scaleX, scaleY)

    // Create a group with transform to position and scale the paths
    // If inner SVG had a transform (e.g. rotation), nest it inside
    const pathContent = innerTransform
      ? `<g transform="${innerTransform}">${paths.join("")}</g>`
      : paths.join("")
    return `<g transform="translate(${x},${y}) scale(${scale})">${pathContent}</g>`
  })
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

function IconEl({ r }: { r: ResolvedBadge }) {
  if (!r.icon) return null
  const vb = r.iconViewBox || "0 0 16 16"
  const color = r.iconFill || r.iconColor

  // Compute rotation transform string if needed
  const rotTransform = r.iconRotation
    ? (() => {
        const [, , w, h] = vb.split(" ").map(Number)
        return `rotate(${r.iconRotation}, ${w / 2}, ${h / 2})`
      })()
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
      <svg viewBox={vb} width={r.iconSize} height={r.iconSize} style={{ flexShrink: 0 }}>
        {rotTransform ? <g transform={rotTransform}>{pathEls}</g> : pathEls}
      </svg>
    )
  }

  const fr = r.iconFillRule as "nonzero" | "evenodd" | undefined
  return (
    <svg viewBox={vb} width={r.iconSize} height={r.iconSize} style={{ flexShrink: 0 }}>
      {rotTransform
        ? <g transform={rotTransform}><path fill={color} d={r.icon} fillRule={fr} /></g>
        : <path fill={color} d={r.icon} fillRule={fr} />
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
