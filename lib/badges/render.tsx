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
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { BadgeConfig } from "./types"
import {
  darkMode,
  lightMode,
  getButtonStyle,
  getButtonSize,
  type ModeColors,
} from "./button-tokens"

const fontData = readFileSync(join(process.cwd(), "lib/fonts/inter-medium.ttf"))
const FONTS = [
  { name: "Inter", data: fontData, weight: 500 as const, style: "normal" as const },
]

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

  // Icon data (pass-through)
  icon: string | undefined
  iconViewBox: string | undefined
  iconFillRule: string | undefined
  iconFill: string | undefined
}

// ---------------------------------------------------------------------------
// Resolve: variant × theme × overrides → ResolvedBadge
// ---------------------------------------------------------------------------

function resolve(config: BadgeConfig): ResolvedBadge {
  const mode = config.mode === "light" ? lightMode : darkMode
  const bs = getButtonStyle(config.style, mode)
  const bz = getButtonSize(config.size ?? "sm")

  // Dimensions (overridable)
  const height = config.height ?? bz.height
  const paddingX = config.padX ?? bz.paddingX
  const fontSize = config.fontSize ?? bz.fontSize
  const gap = config.gap ?? bz.gap
  const iconSize = config.iconSize ?? bz.iconSize
  const labelGap = config.labelGap ?? gap
  const labelOpacity = config.labelOpacity ?? 0.7

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
    bg = undefined
    border = config.colors.labelBg
    fg = config.colors.labelBg
    labelFgBase = config.colors.labelFg
  } else {
    bg = undefined
    fg = bs.fg
    labelFgBase = bs.fg
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
  const rightFg = config.colors.valueFg || mode.primaryForeground

  return {
    label: config.label,
    value: config.value,
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
    icon: config.icon,
    iconViewBox: config.iconViewBox,
    iconFillRule: config.iconFillRule,
    iconFill: config.iconFill,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function renderBadge(config: BadgeConfig): Promise<string> {
  const r = resolve(config)
  const el = r.split ? renderSplit(r) : renderSingle(r)
  return satori(el, { height: r.height, fonts: FONTS })
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

  if (r.iconFillRule === "__lucide__") {
    return (
      <svg viewBox={vb} width={r.iconSize} height={r.iconSize}
        fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}>
        <path d={r.icon} />
      </svg>
    )
  }

  const fr = r.iconFillRule as "nonzero" | "evenodd" | undefined
  return (
    <svg viewBox={vb} width={r.iconSize} height={r.iconSize} style={{ flexShrink: 0 }}>
      <path fill={color} d={r.icon} fillRule={fr} />
    </svg>
  )
}

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
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height: r.height,
      borderRadius: r.borderRadius,
      paddingLeft: r.paddingX,
      paddingRight: r.paddingX,
      fontFamily: "Inter",
      fontSize: r.fontSize,
      fontWeight: 500,
      ...(r.bg ? { backgroundColor: r.bg } : {}),
      ...(r.border ? { border: `1px solid ${r.border}` } : {}),
    }}>
      <DotEl r={r} />
      <IconEl r={r} />
      {r.icon && <div style={{ width: r.gap }} />}
      {r.label && (
        <>
          <span style={{ color: r.labelFg }}>{r.label}</span>
          <div style={{ width: r.labelGap }} />
        </>
      )}
      <span style={{ color: r.fg }}>{r.value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Split render (two backgrounds in one rounded rect)
//
// Same elements, same font, same spacing. Only difference: two bg segments.
// ---------------------------------------------------------------------------

function renderSplit(r: ResolvedBadge): React.ReactElement {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height: r.height,
      borderRadius: r.borderRadius,
      fontFamily: "Inter",
      fontSize: r.fontSize,
      fontWeight: 500,
      overflow: "hidden",
    }}>
      {/* Left segment */}
      <div style={{
        display: "flex",
        alignItems: "center",
        height: r.height,
        backgroundColor: r.leftBg,
        paddingLeft: r.paddingX,
        paddingRight: r.paddingX,
      }}>
        <DotEl r={r} />
        <IconEl r={r} />
        {r.icon && <div style={{ width: r.gap }} />}
        {r.label && <span style={{ color: r.labelFg }}>{r.label}</span>}
      </div>
      {/* Right segment */}
      <div style={{
        display: "flex",
        alignItems: "center",
        height: r.height,
        backgroundColor: r.rightBg,
        paddingLeft: r.paddingX,
        paddingRight: r.paddingX,
      }}>
        <span style={{ color: r.rightFg }}>{r.value}</span>
      </div>
    </div>
  )
}
