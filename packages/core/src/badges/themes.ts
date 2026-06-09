/**
 * shieldcn
 * lib/badges/themes
 *
 * shadcn color palettes resolved to hex values for SVG rendering.
 *
 * Tailwind CSS tokens can't be used directly in SVG images.
 * SVGs served as `<img>` are sandboxed — no external CSS, no CSS variables,
 * no class-based styling. This module uses the same vocabulary as shadcn
 * (palette names like `zinc`, `slate`, `blue`) but resolves them to hex values
 * at render time.
 */

import type { ResolvedColors } from "./types"

/** Available theme names. */
export type ThemeName =
  | "zinc"
  | "slate"
  | "stone"
  | "neutral"
  | "gray"
  | "blue"
  | "green"
  | "rose"
  | "orange"
  | "amber"
  | "violet"
  | "purple"
  | "red"
  | "cyan"
  | "emerald"

/**
 * Map of theme names to resolved hex color values.
 *
 * The "default" style renders label + value as a segmented row component,
 * like two adjoining shadcn Badge segments. The label side is the primary
 * background; the value side is a slightly lighter variant.
 *
 * The "outline" style uses label/value bg colors *as text colors* against
 * a transparent background, matching shadcn Badge variant="outline".
 */
export const themes: Record<ThemeName, ResolvedColors> = {
  // --- Neutrals ---
  // Single background color for the whole badge.
  // labelFg = muted text for the label side (lower opacity)
  // valueFg = bright text for the value side
  zinc: {
    labelBg: "#27272a",  // zinc-800 — badge/label background
    labelFg: "#a1a1aa",  // zinc-400 — muted label text
    valueBg: "#3f3f46",  // zinc-700 — value side (for split/flat mode)
    valueFg: "#fafafa",  // zinc-50  — bright value text
    border: "#3f3f46",   // zinc-700
  },
  slate: {
    labelBg: "#1e293b",
    labelFg: "#94a3b8",
    valueBg: "#334155",  // slate-700
    valueFg: "#f8fafc",
    border: "#334155",
  },
  stone: {
    labelBg: "#292524",
    labelFg: "#a8a29e",
    valueBg: "#44403c",  // stone-700
    valueFg: "#fafaf9",
    border: "#44403c",
  },
  neutral: {
    labelBg: "#262626",
    labelFg: "#a3a3a3",
    valueBg: "#404040",  // neutral-700
    valueFg: "#fafafa",
    border: "#404040",
  },
  gray: {
    labelBg: "#1f2937",
    labelFg: "#9ca3af",
    valueBg: "#374151",  // gray-700
    valueFg: "#f9fafb",
    border: "#374151",
  },

  // --- Colors ---
  // Entire badge is the accent color. Label text is a lighter tint,
  // value text is white.
  blue: {
    labelBg: "#2563eb",  // blue-600 — badge background
    labelFg: "#93c5fd",  // blue-300 — muted label
    valueBg: "#2563eb",
    valueFg: "#ffffff",
    border: "#3b82f6",
  },
  green: {
    labelBg: "#16a34a",  // green-600
    labelFg: "#86efac",  // green-300
    valueBg: "#16a34a",
    valueFg: "#ffffff",
    border: "#22c55e",
  },
  rose: {
    labelBg: "#e11d48",  // rose-600
    labelFg: "#fda4af",  // rose-300
    valueBg: "#e11d48",
    valueFg: "#ffffff",
    border: "#f43f5e",
  },
  orange: {
    labelBg: "#ea580c",  // orange-600
    labelFg: "#fdba74",  // orange-300
    valueBg: "#ea580c",
    valueFg: "#ffffff",
    border: "#f97316",
  },
  amber: {
    labelBg: "#d97706",  // amber-600
    labelFg: "#fcd34d",  // amber-300
    valueBg: "#d97706",
    valueFg: "#ffffff",
    border: "#f59e0b",
  },
  violet: {
    labelBg: "#7c3aed",  // violet-600
    labelFg: "#c4b5fd",  // violet-300
    valueBg: "#7c3aed",
    valueFg: "#ffffff",
    border: "#8b5cf6",
  },
  purple: {
    labelBg: "#9333ea",  // purple-600
    labelFg: "#d8b4fe",  // purple-300
    valueBg: "#9333ea",
    valueFg: "#ffffff",
    border: "#a855f7",
  },
  red: {
    labelBg: "#dc2626",  // red-600
    labelFg: "#fca5a5",  // red-300
    valueBg: "#dc2626",
    valueFg: "#ffffff",
    border: "#ef4444",
  },
  cyan: {
    labelBg: "#0891b2",  // cyan-600
    labelFg: "#67e8f9",  // cyan-300
    valueBg: "#0891b2",
    valueFg: "#ffffff",
    border: "#06b6d4",
  },
  emerald: {
    labelBg: "#059669",  // emerald-600
    labelFg: "#6ee7b7",  // emerald-300
    valueBg: "#059669",
    valueFg: "#ffffff",
    border: "#10b981",
  },
}

/** Default theme. */
export const DEFAULT_THEME: ThemeName = "zinc"

// ---------------------------------------------------------------------------
// User-supplied color validation
// ---------------------------------------------------------------------------

/** Named color map (subset matching shields.io / badge-maker). */
export const NAMED_COLORS: Record<string, string> = {
  brightgreen: "44cc11",
  green: "16a34a",
  yellow: "d97706",
  yellowgreen: "a3e635",
  orange: "ea580c",
  red: "dc2626",
  blue: "2563eb",
  grey: "6b7280",
  gray: "6b7280",
  lightgrey: "9ca3af",
  lightgray: "9ca3af",
  critical: "dc2626",
  important: "ea580c",
  success: "16a34a",
  informational: "2563eb",
  inactive: "9ca3af",
  // CSS named colors (common subset)
  black: "000000",
  white: "ffffff",
  purple: "9333ea",
  violet: "7c3aed",
  pink: "ec4899",
  cyan: "0891b2",
  teal: "0d9488",
  lime: "84cc16",
  indigo: "6366f1",
}

/**
 * Resolve a user-supplied color string to a normalized hex value (without #).
 * Accepts named colors and 3/4/6/8-digit hex (with or without #). Short hex
 * is expanded (abc → aabbcc) so downstream luminance math sees full channels.
 * Returns undefined for anything invalid — callers must drop the override
 * rather than pass garbage into the renderer.
 */
export function resolveColor(color: string | undefined | null): string | undefined {
  if (!color) return undefined
  const lower = color.toLowerCase().trim()
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower]
  const hex = lower.replace(/^#/, "")
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) return undefined
  if (hex.length <= 4) return hex.split("").map(c => c + c).join("")
  return hex
}

/**
 * Resolve a theme name to hex colors.
 * Falls back to the default theme for unknown names.
 */
export function resolveTheme(name?: string): ResolvedColors {
  if (name && name in themes) {
    return themes[name as ThemeName]
  }
  return themes[DEFAULT_THEME]
}

/**
 * Apply custom color overrides to a resolved theme.
 *
 * Since badges are single-background, `color` sets the entire badge
 * background (labelBg) and adjusts text to white. `labelColor` is
 * kept for shields.io compat but is an alias for the same thing.
 */
/**
 * Check if a hex color is light (should use dark text on it).
 */
function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6
}

export function applyColorOverrides(
  colors: ResolvedColors,
  overrides: { color?: string; labelColor?: string }
): ResolvedColors {
  const result = { ...colors }
  // Validate before use — an unvalidated ?color= would flow straight into
  // the SVG and break the render for anything that isn't a clean hex value.
  const color = resolveColor(overrides.color)
  if (color) {
    const hex = `#${color}`
    const textColor = isLightColor(hex) ? "#18181b" : "#ffffff"
    result.labelBg = hex
    result.valueBg = hex
    result.valueFg = textColor
    result.labelFg = textColor
  }
  const labelColor = resolveColor(overrides.labelColor)
  if (labelColor) {
    const hex = `#${labelColor}`
    const textColor = isLightColor(hex) ? "#18181b" : "#ffffff"
    result.labelBg = hex
    result.labelFg = textColor
  }
  return result
}

/** Status colors for CI badges. */
export const statusColors: Record<string, string> = {
  success: "#16a34a",
  passing: "#16a34a",
  failure: "#dc2626",
  failing: "#dc2626",
  pending: "#d97706",
  cancelled: "#6b7280",
  skipped: "#6b7280",
  error: "#dc2626",
}
