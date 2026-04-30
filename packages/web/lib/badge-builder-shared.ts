/**
 * shieldcn
 * lib/badge-builder-shared
 *
 * Shared state, presets, options, and URL builder for the badge builder.
 * Used by both the landing page builder and the showcase submit dialog.
 */

// ---------------------------------------------------------------------------
// Presets — template-based with fillable parameters
// ---------------------------------------------------------------------------

export interface BadgePresetParam {
  /** URL-safe key used in the path template */
  key: string
  /** Human-readable label */
  label: string
  /** Placeholder / example value */
  placeholder: string
  /** Default value */
  default: string
  /** Whether this param can be left blank */
  optional?: boolean
}

export interface BadgePreset {
  /** Display label */
  label: string
  /** URL path template with {key} placeholders */
  template: string
  /** Fillable parameters */
  params: BadgePresetParam[]
  /** Category group */
  group: string
  /** Custom path resolver (e.g. "static" for dash-separated format) */
  customResolver?: string
}

export const BADGE_PRESETS: BadgePreset[] = [
  // Package
  { label: "npm — version", template: "/npm/{package}.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package" },
  { label: "npm — downloads", template: "/npm/{package}/dm.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package" },
  { label: "npm — license", template: "/npm/{package}/license.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package" },
  { label: "npm — types", template: "/npm/{package}/types.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package" },
  { label: "PyPI — version", template: "/pypi/{package}/v.svg", params: [{ key: "package", label: "Package", placeholder: "django", default: "django" }], group: "Package" },
  { label: "Crates.io — version", template: "/crates/{crate}/v.svg", params: [{ key: "crate", label: "Crate", placeholder: "serde", default: "serde" }], group: "Package" },
  { label: "JSR — score", template: "/jsr/{scope}/{package}/score.svg", params: [{ key: "scope", label: "Scope", placeholder: "@std", default: "@std" }, { key: "package", label: "Package", placeholder: "path", default: "path" }], group: "Package" },
  { label: "Docker — pulls", template: "/docker/{namespace}/{image}/pulls.svg", params: [{ key: "namespace", label: "Namespace", placeholder: "library", default: "library" }, { key: "image", label: "Image", placeholder: "nginx", default: "nginx" }], group: "Package" },

  // GitHub
  { label: "GitHub — stars", template: "/github/{owner}/{repo}/stars.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — release", template: "/github/{owner}/{repo}/release.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — CI", template: "/github/{owner}/{repo}/ci.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — license", template: "/github/{owner}/{repo}/license.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — forks", template: "/github/{owner}/{repo}/forks.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — issues", template: "/github/{owner}/{repo}/issues.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — contributors", template: "/github/{owner}/{repo}/contributors.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — last commit", template: "/github/{owner}/{repo}/last-commit.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },
  { label: "GitHub — downloads", template: "/github/{owner}/{repo}/downloads.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub" },

  // Social
  { label: "Discord — online", template: "/discord/{serverId}.svg", params: [{ key: "serverId", label: "Server ID", placeholder: "1316199667142496307", default: "1316199667142496307" }], group: "Social" },
  { label: "Reddit — subscribers", template: "/reddit/{subreddit}.svg", params: [{ key: "subreddit", label: "Subreddit", placeholder: "typescript", default: "typescript" }], group: "Social" },
  { label: "YouTube — subscribers", template: "/youtube/{channelId}/subscribers.svg", params: [{ key: "channelId", label: "Channel ID", placeholder: "UCsBjURrPoezykLs9EqgamOA", default: "UCsBjURrPoezykLs9EqgamOA" }], group: "Social" },
  { label: "Twitch — status", template: "/twitch/{channel}.svg", params: [{ key: "channel", label: "Channel", placeholder: "shroud", default: "shroud" }], group: "Social" },

  // Custom
  { label: "Static badge", template: "/badge/{content}.svg", params: [{ key: "label", label: "Label", placeholder: "build", default: "build", optional: true }, { key: "value", label: "Value", placeholder: "passing", default: "passing" }, { key: "color", label: "Color (hex)", placeholder: "22c55e", default: "22c55e", optional: true }], group: "Custom", customResolver: "static" },
]

/** Resolve a preset template with parameter values */
export function resolveTemplate(preset: BadgePreset, values: Record<string, string>): string {
  // Static badge has special dash-separated format
  if (preset.customResolver === "static") {
    const label = values.label?.trim() || ""
    const value = values.value?.trim() || "badge"
    const color = values.color?.trim() || ""
    // Encode spaces as %20 and dashes as -- for the static badge parser
    const encodeSegment = (s: string) => s.replace(/-/g, "--").replace(/ /g, "%20")
    const parts = []
    if (label) parts.push(encodeSegment(label))
    parts.push(encodeSegment(value))
    if (color) parts.push(color)
    return `/badge/${parts.join("-")}.svg`
  }

  let path = preset.template
  for (const param of preset.params) {
    const val = values[param.key] || param.default
    path = path.replace(`{${param.key}}`, val)
  }
  return path
}

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
