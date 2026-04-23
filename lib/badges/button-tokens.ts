/**
 * shieldcn
 * lib/badges/button-tokens
 *
 * Exact shadcn Button design tokens resolved to hex values.
 *
 * These are the computed CSS values from the shadcn Button component for
 * each variant × size combo. By using these tokens in Satori, the rendered
 * SVG badges are pixel-identical to `<Button>` in the browser.
 *
 * Dark mode values are used by default (README badges typically appear on
 * dark backgrounds). Light mode available via `?mode=light`.
 */

// ---------------------------------------------------------------------------
// Resolved shadcn CSS variable values (oklch → hex)
// ---------------------------------------------------------------------------

export interface ModeColors {
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  destructive: string
  destructiveForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  border: string
  input: string
  muted: string
  mutedForeground: string
}

export const darkMode: ModeColors = {
  primary: "#fafafa",             // oklch(0.985 0 0)
  primaryForeground: "#18181b",   // oklch(0.205 0.025 264)
  secondary: "#27272a",           // oklch(0.27 0.025 264)
  secondaryForeground: "#fafafa", // oklch(0.985 0 0)
  destructive: "#dc2626",         // oklch(0.63 0.19 23.03) — approx
  destructiveForeground: "#ffffff",
  accent: "#27272a",              // oklch(0.27 0.025 264)
  accentForeground: "#fafafa",    // oklch(0.985 0 0)
  background: "#09090b",          // oklch(0.145 0.025 264)
  foreground: "#fafafa",          // oklch(0.985 0 0)
  border: "#27272a",              // oklch(0.27 0.025 264)
  input: "#27272a",
  muted: "#27272a",
  mutedForeground: "#a1a1aa",     // oklch(0.72 0 0)
}

export const lightMode: ModeColors = {
  primary: "#18181b",             // oklch(0.205 0.025 264)
  primaryForeground: "#fafafa",   // oklch(0.985 0 0)
  secondary: "#f4f4f5",           // oklch(0.94 0.01 264)
  secondaryForeground: "#18181b", // oklch(0.205 0.025 264)
  destructive: "#dc2626",
  destructiveForeground: "#ffffff",
  accent: "#f4f4f5",
  accentForeground: "#18181b",
  background: "#fafafa",          // oklch(0.99 0 0)
  foreground: "#18181b",          // oklch(0.145 0.025 264)
  border: "#e4e4e7",              // oklch(0.91 0.01 264)
  input: "#e4e4e7",
  muted: "#f4f4f5",
  mutedForeground: "#71717a",     // oklch(0.46 0.02 264)
}

// ---------------------------------------------------------------------------
// Button variant styles — maps variant name to resolved inline styles
// ---------------------------------------------------------------------------

export interface ButtonStyle {
  bg: string
  fg: string
  border?: string        // if set, renders a 1px border
  borderRadius: number   // px
}

export function getButtonStyle(
  variant: string,
  mode: ModeColors
): ButtonStyle {
  const r = 6 // rounded-md = 0.375rem ≈ 6px

  switch (variant) {
    case "default":
      return { bg: mode.primary, fg: mode.primaryForeground, borderRadius: r }
    case "secondary":
      return { bg: mode.secondary, fg: mode.secondaryForeground, borderRadius: r }
    case "destructive":
      return { bg: mode.destructive, fg: mode.destructiveForeground, borderRadius: r }
    case "outline":
      return { bg: "transparent", fg: mode.accentForeground, border: mode.border, borderRadius: r }
    case "ghost":
      return { bg: "transparent", fg: mode.accentForeground, borderRadius: r }
    default:
      return { bg: mode.primary, fg: mode.primaryForeground, borderRadius: r }
  }
}

// ---------------------------------------------------------------------------
// Button size styles — maps size name to resolved inline styles
// ---------------------------------------------------------------------------

export interface ButtonSize {
  height: number         // px
  paddingX: number       // px
  fontSize: number       // px
  gap: number            // gap between icon and text, px
  iconSize: number       // px
}

export function getButtonSize(size: string): ButtonSize {
  switch (size) {
    case "xs":
      return { height: 24, paddingX: 8, fontSize: 12, gap: 4, iconSize: 12 }
    case "sm":
      return { height: 32, paddingX: 12, fontSize: 14, gap: 6, iconSize: 16 }
    case "lg":
      return { height: 40, paddingX: 24, fontSize: 14, gap: 8, iconSize: 16 }
    case "default":
    default:
      return { height: 36, paddingX: 16, fontSize: 14, gap: 8, iconSize: 16 }
  }
}
