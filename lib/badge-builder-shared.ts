/**
 * shieldcn
 * lib/badge-builder-shared
 *
 * Shared state, presets, options, and URL builder for the badge builder.
 * Used by both the landing page builder and the showcase submit dialog.
 */

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const BADGE_PRESETS = [
  { label: "npm version", path: "/npm/react.svg", group: "Package" },
  { label: "npm downloads", path: "/npm/react/dm.svg", group: "Package" },
  { label: "npm license", path: "/npm/react/license.svg", group: "Package" },
  { label: "npm types", path: "/npm/react/types.svg", group: "Package" },
  { label: "PyPI version", path: "/pypi/django/v.svg", group: "Package" },
  { label: "Crates.io version", path: "/crates/serde/v.svg", group: "Package" },
  { label: "JSR score", path: "/jsr/@std/path/score.svg", group: "Package" },
  { label: "Docker pulls", path: "/docker/library/nginx/pulls.svg", group: "Package" },
  { label: "GitHub stars", path: "/github/vercel/next.js/stars.svg", group: "GitHub" },
  { label: "GitHub release", path: "/github/vercel/next.js/release.svg", group: "GitHub" },
  { label: "GitHub CI", path: "/github/vercel/next.js/ci.svg", group: "GitHub" },
  { label: "GitHub license", path: "/github/vercel/next.js/license.svg", group: "GitHub" },
  { label: "GitHub forks", path: "/github/vercel/next.js/forks.svg", group: "GitHub" },
  { label: "GitHub issues", path: "/github/vercel/next.js/issues.svg", group: "GitHub" },
  { label: "GitHub contributors", path: "/github/vercel/next.js/contributors.svg", group: "GitHub" },
  { label: "GitHub last commit", path: "/github/vercel/next.js/last-commit.svg", group: "GitHub" },
  { label: "GitHub downloads", path: "/github/vercel/next.js/downloads.svg", group: "GitHub" },
  { label: "Discord online", path: "/discord/1316199667142496307.svg", group: "Social" },
  { label: "Reddit subscribers", path: "/reddit/typescript.svg", group: "Social" },
  { label: "YouTube subscribers", path: "/youtube/UCsBjURrPoezykLs9EqgamOA/subscribers.svg", group: "Social" },
  { label: "Twitch status", path: "/twitch/shroud.svg", group: "Social" },
  { label: "Static badge", path: "/badge/build-passing-22c55e.svg", group: "Custom" },
] as const

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "branded"] as const
export const SIZES = ["xs", "sm", "default", "lg"] as const
export const MODES = ["dark", "light"] as const
export const FONTS = ["inter", "geist", "geist-mono"] as const
export const FORMATS = ["svg", "png"] as const

export const THEMES = [
  "_none", "zinc", "slate", "stone", "neutral", "gray",
  "blue", "green", "rose", "orange", "amber",
  "violet", "purple", "red", "cyan", "emerald",
] as const

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface BuilderState {
  path: string
  variant: string
  size: string
  theme: string
  mode: string
  font: string
  format: string
  split: boolean
  logo: string
  logoColor: string
  label: string
  color: string
  labelColor: string
  gradient: string
  valueColor: string
  labelTextColor: string
  labelOpacity: string
}

export const BUILDER_DEFAULTS: BuilderState = {
  path: "/npm/react.svg",
  variant: "default",
  size: "sm",
  theme: "_none",
  mode: "dark",
  font: "inter",
  format: "svg",
  split: false,
  logo: "",
  logoColor: "",
  label: "",
  color: "",
  labelColor: "",
  gradient: "",
  valueColor: "",
  labelTextColor: "",
  labelOpacity: "",
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

export function buildBadgeUrl(s: BuilderState, baseUrl: string): string {
  if (!s.path.trim()) return ""

  // Ensure path has correct extension
  let path = s.path.trim()
  if (!path.startsWith("/")) path = "/" + path
  // Replace extension if format changed
  path = path.replace(/\.(svg|png)$/, `.${s.format}`)
  if (!/\.(svg|png)$/.test(path)) path += `.${s.format}`

  const p = new URLSearchParams()
  if (s.variant !== "default") p.set("variant", s.variant)
  if (s.size !== "sm") p.set("size", s.size)
  if (s.theme && s.theme !== "_none") p.set("theme", s.theme)
  if (s.mode !== "dark") p.set("mode", s.mode)
  if (s.font !== "inter") p.set("font", s.font)
  if (s.split) p.set("split", "true")
  if (s.logo) p.set("logo", s.logo)
  if (s.logoColor) p.set("logoColor", s.logoColor)
  if (s.label) p.set("label", s.label)
  if (s.color) p.set("color", s.color)
  if (s.labelColor) p.set("labelColor", s.labelColor)
  if (s.valueColor) p.set("valueColor", s.valueColor)
  if (s.labelTextColor) p.set("labelTextColor", s.labelTextColor)
  if (s.labelOpacity) p.set("labelOpacity", s.labelOpacity)
  if (s.gradient) p.set("gradient", s.gradient)

  const q = p.toString()
  return `${baseUrl}${path}${q ? `?${q}` : ""}`
}

/**
 * Build just the relative badge path (no origin) for API submission.
 */
export function buildBadgePath(s: BuilderState): string {
  return buildBadgeUrl(s, "")
}
