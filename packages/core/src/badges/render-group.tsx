/**
 * shieldcn
 * lib/badges/render-group
 *
 * Renders multiple badges joined together in a single SVG — like a shadcn
 * ButtonGroup. Left badge gets rounded-l, right badge gets rounded-r,
 * middle badges have flat edges. A 1px separator line divides each segment.
 *
 * Uses the same resolve() pipeline as single badges to guarantee visual
 * consistency. The only difference is border radius and layout.
 */

import satori from "satori"
import { optimize } from "svgo"
import { readFileSync, existsSync } from "node:fs"
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

// ---------------------------------------------------------------------------
// Font loading (same as render.tsx)
// ---------------------------------------------------------------------------

function findFontsDir(): string {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "..", "fonts"),
    join(process.cwd(), "packages", "core", "src", "fonts"),
    join(process.cwd(), "..", "core", "src", "fonts"),
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

type BadgeFont = "inter" | "geist" | "geist-mono"

const FONT_CONFIG: Record<BadgeFont, { name: string; data: Buffer }> = {
  inter: { name: "Inter", data: interData },
  geist: { name: "Geist", data: geistData },
  "geist-mono": { name: "Geist Mono", data: geistMonoData },
}

function getFonts(font: BadgeFont = "inter") {
  const f = FONT_CONFIG[font] ?? FONT_CONFIG.inter
  return [{ name: f.name, data: f.data, weight: 500 as const, style: "normal" as const }]
}

// ---------------------------------------------------------------------------
// Color utilities (same as render.tsx)
// ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return 0
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

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
// Segment — one badge cell in the group
// ---------------------------------------------------------------------------

export interface GroupSegment {
  label: string
  value: string
  icon?: string
  iconPaths?: string[]
  iconViewBox?: string
  iconFillRule?: string
  iconFill?: string
  iconIsStroke?: boolean
  iconStrokeWidth?: number
  iconStrokeLinecap?: string
  iconStrokeLinejoin?: string
  iconRotation?: number
  /** Override brand color for this segment (hex without #). */
  brandColor?: string
  /** Override status color for this segment. */
  statusColor?: string
  /** Show status dot. */
  statusDot?: boolean
}

export interface GroupConfig {
  segments: GroupSegment[]
  style: BadgeConfig["style"]
  size?: BadgeConfig["size"]
  mode?: "light" | "dark"
  font?: BadgeFont
  hasThemeOverride?: boolean
  colors: BadgeConfig["colors"]
}

// ---------------------------------------------------------------------------
// Resolve a segment into renderable values
// ---------------------------------------------------------------------------

interface ResolvedSegment {
  label: string
  value: string
  fontFamily: string
  height: number
  paddingX: number
  fontSize: number
  gap: number
  iconSize: number
  labelGap: number
  bg: string | undefined
  fg: string
  labelFg: string
  iconColor: string
  border: string | undefined
  dotColor: string | undefined
  dotSize: number
  icon?: string
  iconPaths?: string[]
  iconViewBox?: string
  iconFillRule?: string
  iconFill?: string
  iconIsStroke: boolean
  iconStrokeWidth: number
  iconStrokeLinecap?: string
  iconStrokeLinejoin?: string
  iconRotation?: number
}

function resolveSegment(
  seg: GroupSegment,
  config: GroupConfig,
): ResolvedSegment {
  const modeColors = config.mode === "light" ? lightMode : darkMode
  const bs = getButtonStyle(config.style ?? "default", modeColors, seg.brandColor)
  const bz = getButtonSize(config.size ?? "sm")
  const font = config.font ?? "inter"
  const fontFamily = FONT_CONFIG[font]?.name ?? FONT_CONFIG.inter.name
  const labelOpacity = 0.7

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
  } else {
    bg = undefined
    fg = bs.fg
    labelFgBase = bs.fg
  }

  const finalValueColor = seg.statusDot && seg.statusColor ? seg.statusColor : fg
  const finalLabelColor = seg.statusDot ? labelFgBase : rgba(labelFgBase, labelOpacity)
  const finalIconColor = rgba(labelFgBase, Math.min(labelOpacity + 0.15, 1))

  const dotColor = seg.statusDot && seg.statusColor ? seg.statusColor : undefined
  const dotSize = Math.round(bz.fontSize * 0.5)

  return {
    label: seg.label,
    value: seg.value,
    fontFamily,
    height: bz.height,
    paddingX: bz.paddingX,
    fontSize: bz.fontSize,
    gap: bz.gap,
    iconSize: bz.iconSize,
    labelGap: bz.gap,
    bg,
    fg: finalValueColor,
    labelFg: finalLabelColor,
    iconColor: finalIconColor,
    border,
    dotColor,
    dotSize,
    icon: seg.icon,
    iconPaths: seg.iconPaths,
    iconViewBox: seg.iconViewBox,
    iconFillRule: seg.iconFillRule,
    iconFill: seg.iconFill,
    iconIsStroke: !!seg.iconIsStroke,
    iconStrokeWidth: seg.iconStrokeWidth ?? 2,
    iconStrokeLinecap: seg.iconStrokeLinecap,
    iconStrokeLinejoin: seg.iconStrokeLinejoin,
    iconRotation: seg.iconRotation,
  }
}

// ---------------------------------------------------------------------------
// Icon element (same as render.tsx)
// ---------------------------------------------------------------------------

function SegmentIcon({ s }: { s: ResolvedSegment }) {
  if (!s.icon) return null
  const vb = s.iconViewBox || "0 0 16 16"
  const color = s.iconFill || s.iconColor
  const [, , vbW, vbH] = vb.split(" ").map(Number)
  const aspect = vbW && vbH ? vbW / vbH : 1
  const iconH = s.iconSize
  const iconW = Math.round(s.iconSize * Math.min(aspect, 2.5))

  const rotTransform = s.iconRotation
    ? `rotate(${s.iconRotation}, ${vbW / 2}, ${vbH / 2})`
    : undefined

  if (s.iconIsStroke) {
    const paths = s.iconPaths && s.iconPaths.length > 0 ? s.iconPaths : [s.icon]
    const pathEls = paths.map((d, i) => (
      <path
        key={i}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={s.iconStrokeWidth}
        strokeLinecap={s.iconStrokeLinecap as "round" | "butt" | "square" | undefined}
        strokeLinejoin={s.iconStrokeLinejoin as "round" | "miter" | "bevel" | undefined}
      />
    ))
    return (
      <svg viewBox={vb} width={iconW} height={iconH} style={{ flexShrink: 0 }}>
        {rotTransform ? <g transform={rotTransform}>{pathEls}</g> : pathEls}
      </svg>
    )
  }

  const fr = s.iconFillRule as "nonzero" | "evenodd" | undefined
  const hasPaths = s.iconPaths && s.iconPaths.length > 0
  const pathEls = hasPaths
    ? s.iconPaths!.map((d, i) => <path key={i} fill={color} d={d} fillRule={fr} />)
    : <path fill={color} d={s.icon} fillRule={fr} />

  return (
    <svg viewBox={vb} width={iconW} height={iconH} style={{ flexShrink: 0 }}>
      {rotTransform
        ? <g transform={rotTransform}>{pathEls}</g>
        : pathEls
      }
    </svg>
  )
}

const textStyle = { lineHeight: 1 } as const

// ---------------------------------------------------------------------------
// Status dot
// ---------------------------------------------------------------------------

function DotEl({ s }: { s: ResolvedSegment }) {
  if (!s.dotColor) return null
  return (
    <>
      <div style={{
        width: s.dotSize,
        height: s.dotSize,
        borderRadius: "50%",
        backgroundColor: s.dotColor,
        flexShrink: 0,
      }} />
      <div style={{ width: s.gap }} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Render the group
// ---------------------------------------------------------------------------

function renderGroup(segments: ResolvedSegment[], borderRadius: number): React.ReactElement {
  const count = segments.length
  if (count === 0) return <div />

  const height = segments[0].height
  const modeColors = segments[0].bg ? undefined : segments[0].border
  // Separator color: use the border color, or a subtle divider
  const sepColor = segments[0].border || rgba(segments[0].fg, 0.15)

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height,
      borderRadius,
      overflow: "hidden",
      ...(segments[0].border ? { border: `1px solid ${segments[0].border}` } : {}),
    }}>
      {segments.map((s, i) => {
        const isFirst = i === 0
        const isLast = i === count - 1

        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {/* Separator line between segments */}
            {!isFirst && (
              <div style={{
                width: 1,
                height,
                backgroundColor: sepColor,
                flexShrink: 0,
              }} />
            )}
            {/* Segment content */}
            <div style={{
              display: "flex",
              alignItems: "center",
              height,
              paddingLeft: s.paddingX,
              paddingRight: s.paddingX,
              fontFamily: s.fontFamily,
              fontSize: s.fontSize,
              fontWeight: 500,
              ...(s.bg ? { backgroundColor: s.bg } : {}),
            }}>
              <DotEl s={s} />
              <SegmentIcon s={s} />
              {s.icon && <div style={{ width: s.gap }} />}
              {s.label && (
                <>
                  <span style={{ color: s.labelFg, ...textStyle }}>{s.label}</span>
                  <div style={{ width: s.labelGap }} />
                </>
              )}
              <span style={{ color: s.fg, ...textStyle }}>{s.value}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function renderBadgeGroup(config: GroupConfig): Promise<string> {
  const resolved = config.segments.map(seg => resolveSegment(seg, config))
  if (resolved.length === 0) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"0\" height=\"0\"/>"
  }

  const borderRadius = 6
  const height = resolved[0].height
  const el = renderGroup(resolved, borderRadius)
  const fonts = getFonts(config.font)
  const raw = await satori(el, { height, fonts })

  // Optimize
  try {
    const result = optimize(raw, {
      multipass: true,
      plugins: [
        {
          name: "preset-default",
          params: {
            overrides: {
              cleanupIds: false,
              mergePaths: false,
              collapseGroups: false,
            },
          },
        },
        {
          name: "convertPathData",
          params: { floatPrecision: 1, forceAbsolutePath: true },
        },
      ],
    })
    return result.data
  } catch {
    return raw
  }
}
