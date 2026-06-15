/**
 * shieldcn
 * lib/badges/types
 *
 * Shared types for the badge rendering engine.
 */

/**
 * Visual style variants for badges (maps to shadcn Button variant).
 *
 * This is the complete, honest set — every value here has a real case in
 * `getButtonStyle` (button-tokens.ts). Do not add a value here without a
 * corresponding render case, or it becomes a phantom variant that silently
 * falls through to `default`. Legacy shields.io styles (flat, flat-square,
 * plastic, for-the-badge) are INPUTS that get mapped to one of these — they
 * are not variants themselves (see migrate/transform.ts).
 */
export type BadgeStyle = "default" | "secondary" | "outline" | "ghost" | "destructive" | "branded"

/** Badge size presets (maps to shadcn Button size). */
export type BadgeSize = "xs" | "sm" | "default" | "lg"

/** Resolved hex color values for a badge. */
export interface ResolvedColors {
  /** Background color for the label (left) side. */
  labelBg: string
  /** Text color for the label side. */
  labelFg: string
  /** Background color for the value (right) side. */
  valueBg: string
  /** Text color for the value side. */
  valueFg: string
  /** Border color. */
  border: string
}

/** Full configuration for rendering a single badge. */
export interface BadgeConfig {
  /** Left-side text (e.g. "npm", "release", "CI"). */
  label: string
  /** Right-side text (e.g. "v19.1.0", "45.2k", "passing"). */
  value: string
  /** SVG path data for the provider icon. */
  icon?: string
  /** viewBox for the icon SVG. */
  iconViewBox?: string
  /** Fill rule for the icon (defaults to "nonzero"). */
  iconFillRule?: string
  /** Override fill color for the icon (e.g. SimpleIcons brand color). */
  iconFill?: string
  /** Individual path d strings for stroke-based multi-path icons. */
  iconPaths?: string[]
  /** Whether the icon is stroke-based (e.g. Lucide, Feather). */
  iconIsStroke?: boolean
  /** Stroke width for stroke-based icons. */
  iconStrokeWidth?: number
  /** Stroke linecap for stroke-based icons. */
  iconStrokeLinecap?: string
  /** Stroke linejoin for stroke-based icons. */
  iconStrokeLinejoin?: string
  /** Icon rotation in degrees (applied around center). */
  iconRotation?: number
  /** Visual style (shadcn Button variant). */
  style: BadgeStyle
  /** Size preset (shadcn Button size). Overrides individual dimension params. */
  size?: BadgeSize
  /** Resolved hex color values. */
  colors: ResolvedColors
  /** Status color for CI-style badges (green/red/amber). Used for:
   *  - status dot color
   *  - value text color (when not in split mode)
   *  - right-side bg (when in split mode)
   */
  statusColor?: string
  /** Show a colored status dot before the label text. */
  statusDot?: boolean
  /** Override value text color (hex). */
  valueColor?: string
  /** Override label text color (hex). */
  labelTextColor?: string

  // --- Configurable layout params (all optional, sensible defaults) ---

  /** Label text opacity (0-1). Default: 0.85 */
  labelOpacity?: number
  /** Badge height in px. Default: 28 */
  height?: number
  /** Font size in px. Default: 12 */
  fontSize?: number
  /** Border radius in px. Default: 6 */
  radius?: number
  /** Horizontal padding in px. Default: 10 */
  padX?: number
  /** Icon size in px. Default: 14 */
  iconSize?: number
  /** Gap between icon and text in px. Default: 5 */
  gap?: number
  /** Gap between label and value text in px. Default: 6 */
  labelGap?: number
  /** Split mode: two background colors (label bg | value bg) within one rounded rect. */
  split?: boolean
  /** Color mode. Dark mode matches how badges appear in GitHub dark theme. */
  mode?: "light" | "dark"
  /** Whether the user explicitly set a theme or color override. */
  hasThemeOverride?: boolean
  /** Brand color for "branded" variant (hex without #). */
  brandColor?: string
  /** Font family for badge text. */
  font?: "inter" | "geist" | "geist-mono" | "jetbrains-mono" | "fira-code" | "roboto" | "space-grotesk"
  /** CSS linear-gradient value for badge background. */
  gradient?: string
  /**
   * Full-color flag SVG (raw markup) rendered as a left inset at its natural
   * 3:2 aspect ratio — used by country “built in” badges. Unlike `icon`, this
   * preserves the flag's original multi-color fills instead of recoloring it.
   */
  flagSvg?: string
  /**
   * Full-color emoji (Twemoji) SVG (raw markup) rendered as a square left
   * inset at its natural 1:1 aspect ratio. Like `flagSvg`, this preserves the
   * original multi-color fills instead of recoloring it.
   */
  emojiSvg?: string
  /** Full-color logo image data URI rendered as a square left inset. */
  logoDataUri?: string
  /** Animation mode: "pulse" | "glow" | "shimmer" | "none". Default: none. */
  animate?: "pulse" | "glow" | "shimmer" | "none"
}

/** Raw badge data returned by data providers. */
export interface BadgeData {
  /** Left-side label text. */
  label: string
  /** Right-side value text. */
  value: string
  /** Optional color hint (for CI status, etc.). */
  color?: string
  /** Optional link URL. */
  link?: string
  /**
   * Marks a terminal error verdict that still renders a real badge (e.g. a
   * genuine 404 → "invalid repository"). Such results are cached only briefly
   * and never persisted as a last-known-good value, so they self-heal quickly
   * instead of being pinned at the CDN like a success.
   */
  error?: boolean
  /**
   * Marks a value served from the last-known-good ("stale") store because the
   * live upstream fetch failed. The data is real and renderable, but it may be
   * out of date — so the route serves it with short cache headers (like an
   * error) instead of pinning it at the CDN for an hour. That way the badge
   * picks up fresh data within ~a minute of the upstream recovering rather than
   * staying frozen for up to the full success-cache window.
   */
  stale?: boolean
}
