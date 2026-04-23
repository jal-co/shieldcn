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
export function applyColorOverrides(
  colors: ResolvedColors,
  overrides: { color?: string; labelColor?: string }
): ResolvedColors {
  const result = { ...colors }
  if (overrides.color) {
    const hex = `#${overrides.color}`
    result.labelBg = hex
    result.valueBg = hex
    // On a custom color background, use white text
    result.valueFg = "#ffffff"
    // Make label text a semi-transparent white
    result.labelFg = "#ffffff"
  }
  if (overrides.labelColor) {
    result.labelBg = `#${overrides.labelColor}`
    result.valueBg = `#${overrides.labelColor}`
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
