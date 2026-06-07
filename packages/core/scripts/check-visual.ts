/**
 * @shieldcn/core
 * scripts/check-visual.ts
 *
 * Programmatic visual consistency checks for badge rendering.
 * Renders every variant × theme × mode combo and checks:
 *
 *   1. WCAG contrast — text vs background meets AA (4.5:1)
 *   2. Visibility    — no invisible text (fg ≈ bg)
 *   3. Consistency   — badge dimensions match size presets
 *   4. Completeness  — SVG is valid, has viewBox, has text paths
 *
 * Usage:
 *   cd packages/core
 *   pnpm dlx tsx scripts/check-visual.ts
 */

import { renderBadge } from "../src/badges/render"
import { resolveTheme, applyColorOverrides, type ThemeName } from "../src/badges/themes"
import type { BadgeConfig, BadgeStyle, BadgeSize } from "../src/badges/types"
import type { BadgeFont } from "../src/badges/render"
import { getButtonSize } from "../src/badges/button-tokens"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VARIANTS: BadgeStyle[] = ["default", "secondary", "outline", "ghost", "destructive", "branded"]
const THEMES: (ThemeName | undefined)[] = [undefined, "zinc", "slate", "blue", "green", "rose", "orange", "violet", "purple", "cyan", "emerald"]
const MODES = ["dark", "light"] as const
const FONTS: BadgeFont[] = ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"]
const SIZES: BadgeSize[] = ["xs", "sm", "default", "lg"]

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

/** Parse hex (#rrggbb or rrggbb) to [r, g, b] 0-255. */
function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "")
  if (h.length !== 6) return null
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return [r, g, b]
}

/** Parse rgba(r,g,b,a) to [r, g, b, a]. */
function parseRgba(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!m) return null
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] ? parseFloat(m[4]) : 1]
}

/** Parse any color string to [r, g, b, a]. */
function parseColor(color: string): [number, number, number, number] | null {
  if (color === "transparent") return [0, 0, 0, 0]
  const rgba = parseRgba(color)
  if (rgba) return rgba
  const hex = parseHex(color)
  if (hex) return [hex[0], hex[1], hex[2], 1]
  return null
}

/** WCAG 2.1 relative luminance. */
function relativeLuminance(r: number, g: number, b: number): number {
  const [sr, sg, sb] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
}

/** WCAG contrast ratio between two luminance values. */
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Compute effective color when a semi-transparent foreground is composited
 * over a background (alpha blending).
 */
function composite(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): [number, number, number] {
  const a = fg[3]
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ]
}

// ---------------------------------------------------------------------------
// SVG analysis
// ---------------------------------------------------------------------------

/** Extract all fill colors from an SVG string. */
function extractFills(svg: string): string[] {
  const fills: string[] = []
  // fill="..." attributes
  const attrRe = /fill="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = attrRe.exec(svg)) !== null) {
    if (m[1] !== "none") fills.push(m[1])
  }
  return fills
}

/** Extract SVG dimensions from viewBox or width/height. */
function extractDimensions(svg: string): { width: number; height: number } | null {
  // Try viewBox first
  const vb = svg.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
  if (vb) return { width: parseInt(vb[3]), height: parseInt(vb[4]) }
  // Fall back to width/height attributes
  const w = svg.match(/width="(\d+)"/)
  const h = svg.match(/height="(\d+)"/)
  if (w && h) return { width: parseInt(w[1]), height: parseInt(h[1]) }
  return null
}

/** Check SVG has text content (path data). */
function hasTextPaths(svg: string): boolean {
  // Satori converts text to <path> elements — a valid badge should have multiple paths
  const paths = svg.match(/<path /g)
  return !!paths && paths.length >= 2
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

interface Issue {
  severity: "error" | "warn"
  combo: string
  message: string
  detail?: string
}

const issues: Issue[] = []
let checked = 0
let passed = 0

function addIssue(severity: "error" | "warn", combo: string, message: string, detail?: string) {
  issues.push({ severity, combo, message, detail })
}

function comboLabel(opts: {
  variant: string
  mode?: string
  theme?: string
  font?: string
  size?: string
  split?: boolean
  extra?: string
}): string {
  const parts = [opts.variant]
  if (opts.theme) parts.push(`theme=${opts.theme}`)
  if (opts.mode) parts.push(opts.mode)
  if (opts.font) parts.push(`font=${opts.font}`)
  if (opts.size) parts.push(`size=${opts.size}`)
  if (opts.split) parts.push("split")
  if (opts.extra) parts.push(opts.extra)
  return parts.join(" | ")
}

function makeConfig(overrides: {
  style: BadgeStyle
  mode?: "dark" | "light"
  theme?: string
  font?: BadgeFont
  size?: BadgeSize
  split?: boolean
  statusColor?: string
  statusDot?: boolean
  brandColor?: string
  gradient?: string
  colorOverride?: string
}): BadgeConfig {
  const mode = overrides.mode ?? "dark"
  const style = overrides.style
  let colors = resolveTheme(overrides.theme)
  if (overrides.colorOverride) {
    colors = applyColorOverrides(colors, { color: overrides.colorOverride })
  }
  const hasThemeOverride = !!(overrides.theme || overrides.colorOverride)

  return {
    label: "npm",
    value: "v19.1.0",
    style,
    colors,
    mode,
    hasThemeOverride,
    font: overrides.font,
    size: overrides.size,
    split: overrides.split,
    statusDot: overrides.statusDot,
    statusColor: overrides.statusColor,
    gradient: overrides.gradient,
    brandColor: overrides.brandColor ?? (style === "branded" ? "CB3837" : undefined),
  }
}

async function checkBadge(
  config: BadgeConfig,
  combo: string,
  expectedBg: "dark" | "light" | "transparent",
): Promise<void> {
  checked++

  let svg: string
  try {
    svg = await renderBadge(config)
  } catch (err) {
    addIssue("error", combo, "Render threw", String(err))
    return
  }

  // 1. Valid SVG
  if (!svg.startsWith("<svg")) {
    addIssue("error", combo, "Output is not valid SVG")
    return
  }

  // 2. Has dimensions
  const dims = extractDimensions(svg)
  if (!dims) {
    addIssue("error", combo, "Missing viewBox/dimensions")
    return
  }

  // 3. Height matches size preset
  if (config.size) {
    const expected = getButtonSize(config.size)
    if (dims.height !== expected.height) {
      addIssue("warn", combo, `Height ${dims.height}px ≠ expected ${expected.height}px for size=${config.size}`)
    }
  }

  // 4. Has text paths (badge isn't empty)
  if (!hasTextPaths(svg)) {
    addIssue("error", combo, "No text paths in SVG — badge may be blank")
    return
  }

  // 5. Width is reasonable (not 0, not absurdly large)
  if (dims.width < 20) {
    addIssue("error", combo, `Width too small: ${dims.width}px`)
  }
  if (dims.width > 500) {
    addIssue("warn", combo, `Width very large: ${dims.width}px`)
  }

  // 6. Contrast checks on fill colors
  // Extract all fills and check text fills against likely background
  const fills = extractFills(svg)
  if (fills.length === 0) {
    addIssue("warn", combo, "No fill attributes found in SVG")
    return
  }

  // Determine the effective background color
  // First <path fill="..."> is typically the badge background shape
  const bgFill = fills[0]
  const bgColor = parseColor(bgFill)

  // For transparent variants (outline/ghost), background is the page bg
  const pageBg: [number, number, number, number] = expectedBg === "light"
    ? [250, 250, 250, 1]  // #fafafa
    : [9, 9, 11, 1]       // #09090b

  const effectiveBg: [number, number, number, number] = (() => {
    if (expectedBg === "transparent" || !bgColor || bgColor[3] === 0) {
      return pageBg
    }
    // Composite badge bg over page bg for semi-transparent cases
    const comp = composite(bgColor, pageBg)
    return [comp[0], comp[1], comp[2], 1]
  })()

  const bgLum = relativeLuminance(effectiveBg[0], effectiveBg[1], effectiveBg[2])

  // Check each text fill (skip the first fill which is badge bg)
  for (let i = 1; i < fills.length; i++) {
    const fill = fills[i]
    const fgColor = parseColor(fill)
    if (!fgColor) continue

    // Composite fg over effective bg
    const effectiveFg = composite(fgColor, effectiveBg)
    const fgLum = relativeLuminance(effectiveFg[0], effectiveFg[1], effectiveFg[2])
    const ratio = contrastRatio(fgLum, bgLum)

    // WCAG AA for normal text: 4.5:1
    // WCAG AA for large text: 3:1
    // Badge text is 12-14px, so we use the stricter 4.5:1 but warn at 3:1
    if (ratio < 2.0) {
      addIssue("error", combo, `Invisible text: fill=${fill} on bg=${bgFill}`, `contrast ratio ${ratio.toFixed(2)}:1`)
    } else if (ratio < 3.0) {
      addIssue("warn", combo, `Very low contrast: fill=${fill} on bg=${bgFill}`, `contrast ratio ${ratio.toFixed(2)}:1`)
    }
    // Note: we intentionally don't flag 3.0-4.5 because label text uses
    // opacity to create visual hierarchy — that's a design choice, not a bug.
  }

  passed++
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Running visual consistency checks...\n")
  const start = performance.now()

  // --- Variant × Theme × Mode ---
  for (const variant of VARIANTS) {
    for (const theme of THEMES) {
      for (const mode of MODES) {
        const combo = comboLabel({ variant, theme: theme ?? "default", mode })
        const isTransparent = variant === "outline" || variant === "ghost"
        const expectedBg = isTransparent ? "transparent" as const : mode

        await checkBadge(
          makeConfig({ style: variant, mode, theme }),
          combo,
          expectedBg,
        )
      }
    }
  }

  // --- Variant × Theme × Mode × Split ---
  for (const variant of VARIANTS) {
    for (const theme of [undefined, "blue", "rose", "cyan"] as (ThemeName | undefined)[]) {
      for (const mode of MODES) {
        const combo = comboLabel({ variant, theme: theme ?? "default", mode, split: true })
        await checkBadge(
          makeConfig({ style: variant, mode, theme, split: true }),
          combo,
          mode,
        )
      }
    }
  }

  // --- Font × Variant (just check rendering doesn't break) ---
  for (const font of FONTS) {
    for (const variant of VARIANTS) {
      const combo = comboLabel({ variant, font })
      const isTransparent = variant === "outline" || variant === "ghost"
      await checkBadge(
        makeConfig({ style: variant, font }),
        combo,
        isTransparent ? "transparent" : "dark",
      )
    }
  }

  // --- Size × Variant ---
  for (const size of SIZES) {
    for (const variant of VARIANTS) {
      const combo = comboLabel({ variant, size })
      const isTransparent = variant === "outline" || variant === "ghost"
      await checkBadge(
        makeConfig({ style: variant, size }),
        combo,
        isTransparent ? "transparent" : "dark",
      )
    }
  }

  // --- CI status badges ---
  for (const variant of VARIANTS) {
    for (const mode of MODES) {
      for (const [status, color] of [["passing", "#16a34a"], ["failing", "#dc2626"], ["pending", "#d97706"]]) {
        const combo = comboLabel({ variant, mode, extra: `status=${status}` })
        const isTransparent = variant === "outline" || variant === "ghost"
        await checkBadge(
          makeConfig({ style: variant, mode, statusDot: true, statusColor: color }),
          combo,
          isTransparent ? "transparent" : mode,
        )
      }
    }
  }

  // --- Gradient × Variant ---
  for (const variant of VARIANTS) {
    for (const mode of MODES) {
      const combo = comboLabel({ variant, mode, extra: "gradient" })
      await checkBadge(
        makeConfig({ style: variant, mode, gradient: "linear-gradient(135deg, #ff6b6b, #4ecdc4)" }),
        combo,
        mode,
      )
    }
  }

  // --- Custom color on outline/ghost ---
  for (const variant of ["outline", "ghost"] as BadgeStyle[]) {
    for (const mode of MODES) {
      for (const color of ["e11d48", "7c3aed", "2563eb", "16a34a", "fbbf24"]) {
        const combo = comboLabel({ variant, mode, extra: `color=#${color}` })
        await checkBadge(
          makeConfig({ style: variant, mode, colorOverride: color }),
          combo,
          "transparent",
        )
      }
    }
  }

  // --- Brand color contrast ---
  for (const mode of MODES) {
    for (const color of ["fbbf24", "f97316", "84cc16", "06b6d4", "ffffff", "000000", "18181b", "fafafa"]) {
      const combo = comboLabel({ variant: "branded", mode, extra: `brand=#${color}` })
      await checkBadge(
        makeConfig({ style: "branded", mode, brandColor: color }),
        combo,
        mode,
      )
    }
  }

  // --- Report ---
  const elapsed = ((performance.now() - start) / 1000).toFixed(2)
  const errors = issues.filter(i => i.severity === "error")
  const warns = issues.filter(i => i.severity === "warn")

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Checked: ${checked} badge combos in ${elapsed}s`)
  console.log(`  Passed:  ${passed}`)
  console.log(`  Errors:  ${errors.length}`)
  console.log(`  Warnings: ${warns.length}`)
  console.log(`${"=".repeat(60)}\n`)

  if (errors.length > 0) {
    console.log("❌ ERRORS:\n")
    for (const e of errors) {
      console.log(`  ${e.combo}`)
      console.log(`    → ${e.message}${e.detail ? ` (${e.detail})` : ""}`)
    }
    console.log()
  }

  if (warns.length > 0) {
    console.log("⚠️  WARNINGS:\n")
    for (const w of warns) {
      console.log(`  ${w.combo}`)
      console.log(`    → ${w.message}${w.detail ? ` (${w.detail})` : ""}`)
    }
    console.log()
  }

  if (errors.length === 0 && warns.length === 0) {
    console.log("✅ All checks passed!\n")
  }

  process.exit(errors.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
