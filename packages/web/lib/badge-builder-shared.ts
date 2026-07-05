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
  /** Service/provider label shown as item metadata in searchable pickers */
  service?: string
  /** Extra searchable terms for picker UIs */
  searchKeywords?: string[]
  /** URL path template with {key} placeholders */
  template: string
  /** Fillable parameters */
  params: BadgePresetParam[]
  /** Category group */
  group: string
  /** Custom path resolver (e.g. "static" for dash-separated format) */
  customResolver?: string
  /** Default link URL template with {key} placeholders (auto-filled when preset is selected) */
  defaultLinkUrl?: string
}

export const BADGE_PRESETS: BadgePreset[] = [
  // Custom — first so "make a badge" users see it immediately
  { label: "Custom badge", service: "Custom", template: "/badge/{content}.svg", params: [{ key: "label", label: "Label", placeholder: "build", default: "build", optional: true }, { key: "value", label: "Value", placeholder: "passing", default: "passing" }, { key: "color", label: "Color (hex)", placeholder: "22c55e", default: "22c55e", optional: true }], group: "Custom", customResolver: "static" },

  // Package
  { label: "version", service: "npm", template: "/npm/{package}.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package", defaultLinkUrl: "https://www.npmjs.com/package/{package}" },
  { label: "downloads", service: "npm", searchKeywords: ["monthly"], template: "/npm/dm/{package}.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package", defaultLinkUrl: "https://www.npmjs.com/package/{package}" },
  { label: "license", service: "npm", template: "/npm/license/{package}.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package", defaultLinkUrl: "https://www.npmjs.com/package/{package}" },
  { label: "types", service: "npm", searchKeywords: ["typescript"], template: "/npm/types/{package}.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }], group: "Package", defaultLinkUrl: "https://www.npmjs.com/package/{package}" },
  { label: "version", service: "PyPI", template: "/pypi/{package}.svg", params: [{ key: "package", label: "Package", placeholder: "django", default: "django" }], group: "Package", defaultLinkUrl: "https://pypi.org/project/{package}" },
  { label: "version", service: "Crates.io", template: "/crates/{crate}.svg", params: [{ key: "crate", label: "Crate", placeholder: "serde", default: "serde" }], group: "Package", defaultLinkUrl: "https://crates.io/crates/{crate}" },
  { label: "score", service: "JSR", template: "/jsr/score/{scope}/{package}.svg", params: [{ key: "scope", label: "Scope", placeholder: "@std", default: "@std" }, { key: "package", label: "Package", placeholder: "path", default: "path" }], group: "Package", defaultLinkUrl: "https://jsr.io/{scope}/{package}" },
  { label: "pulls", service: "Docker", template: "/docker/{namespace}/{image}/pulls.svg", params: [{ key: "namespace", label: "Namespace", placeholder: "library", default: "library" }, { key: "image", label: "Image", placeholder: "nginx", default: "nginx" }], group: "Package", defaultLinkUrl: "https://hub.docker.com/r/{namespace}/{image}" },

  // GitHub
  { label: "stars", service: "GitHub", template: "/github/{owner}/{repo}/stars.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}" },
  { label: "release", service: "GitHub", template: "/github/{owner}/{repo}/release.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/releases" },
  { label: "CI", service: "GitHub", searchKeywords: ["checks", "actions"], template: "/github/{owner}/{repo}/ci.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/actions" },
  { label: "license", service: "GitHub", template: "/github/{owner}/{repo}/license.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}" },
  { label: "forks", service: "GitHub", template: "/github/{owner}/{repo}/forks.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/forks" },
  { label: "issues", service: "GitHub", template: "/github/{owner}/{repo}/issues.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/issues" },
  { label: "contributors", service: "GitHub", template: "/github/{owner}/{repo}/contributors.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/graphs/contributors" },
  { label: "sponsors", service: "GitHub", searchKeywords: ["github sponsors", "funding", "heart"], template: "/github/sponsors/{login}.svg", params: [{ key: "login", label: "User or org", placeholder: "jal-co", default: "jal-co" }], group: "GitHub", defaultLinkUrl: "https://github.com/sponsors/{login}" },
  { label: "last commit", service: "GitHub", template: "/github/{owner}/{repo}/last-commit.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/commits" },
  { label: "downloads", service: "GitHub", template: "/github/{owner}/{repo}/downloads.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}/releases" },
  { label: "repo views", service: "GitHub", searchKeywords: ["view counter", "gitviews", "hits"], template: "/views/repo/{owner}/{repo}.svg", params: [{ key: "owner", label: "Owner", placeholder: "shieldcn", default: "shieldcn" }, { key: "repo", label: "Repo", placeholder: "shieldcn", default: "shieldcn" }], group: "GitHub", defaultLinkUrl: "https://github.com/{owner}/{repo}" },
  { label: "profile views", service: "GitHub", searchKeywords: ["view counter", "gitviews", "hits", "profile"], template: "/views/user/{username}.svg", params: [{ key: "username", label: "Username", placeholder: "shieldcn", default: "shieldcn" }], group: "GitHub", defaultLinkUrl: "https://github.com/{username}" },

  // Social
  { label: "online", service: "Discord", template: "/discord/{serverId}.svg", params: [{ key: "serverId", label: "Server ID", placeholder: "1316199667142496307", default: "1316199667142496307" }], group: "Social" },
  { label: "team fan", service: "NBA", template: "/nba/{team}.svg", params: [{ key: "team", label: "Team", placeholder: "knicks", default: "knicks" }], group: "Social", defaultLinkUrl: "https://www.nba.com/{team}" },
  { label: "subscribers", service: "Reddit", template: "/reddit/subscribers/r/{subreddit}.svg", params: [{ key: "subreddit", label: "Subreddit", placeholder: "typescript", default: "typescript" }], group: "Social", defaultLinkUrl: "https://www.reddit.com/r/{subreddit}" },
  { label: "follow", service: "X", template: "/x/follow/{username}.svg", params: [{ key: "username", label: "Username", placeholder: "jal_co", default: "jal_co" }], group: "Social", defaultLinkUrl: "https://x.com/{username}" },
  { label: "mention", service: "X", template: "/x/mention/{username}.svg", params: [{ key: "username", label: "Username", placeholder: "jal_co", default: "jal_co" }], group: "Social", defaultLinkUrl: "https://x.com/{username}" },
  { label: "subscribers", service: "YouTube", template: "/youtube/subscribers/{channelId}.svg", params: [{ key: "channelId", label: "Channel ID", placeholder: "UCsBjURrPoezykLs9EqgamOA", default: "UCsBjURrPoezykLs9EqgamOA" }], group: "Social", defaultLinkUrl: "https://www.youtube.com/channel/{channelId}" },
  { label: "status", service: "Twitch", template: "/twitch/status/{channel}.svg", params: [{ key: "channel", label: "Channel", placeholder: "shroud", default: "shroud" }], group: "Social", defaultLinkUrl: "https://www.twitch.tv/{channel}" },
  { label: "followers", service: "Twitch", template: "/twitch/followers/{channel}.svg", params: [{ key: "channel", label: "Channel", placeholder: "shroud", default: "shroud" }], group: "Social", defaultLinkUrl: "https://www.twitch.tv/{channel}" },

  // Other
  { label: "built in", service: "Country flag", template: "/flag/{code}.svg", params: [{ key: "code", label: "Country code", placeholder: "us", default: "us" }], group: "Other" },

  // Groups
  { label: "npm + stars", service: "Group", template: "/group/npm/{package}+github/stars/{owner}/{repo}.svg", params: [{ key: "package", label: "Package", placeholder: "react", default: "react" }, { key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "Group", defaultLinkUrl: "https://github.com/{owner}/{repo}" },
  { label: "GitHub trio", service: "Group", template: "/group/github/stars/{owner}/{repo}+github/forks/{owner}/{repo}+github/license/{owner}/{repo}.svg", params: [{ key: "owner", label: "Owner", placeholder: "vercel", default: "vercel" }, { key: "repo", label: "Repo", placeholder: "next.js", default: "next.js" }], group: "Group", defaultLinkUrl: "https://github.com/{owner}/{repo}" },
]

/** Resolve a preset's defaultLinkUrl template with parameter values */
export function resolveDefaultLinkUrl(preset: BadgePreset, values: Record<string, string>): string {
  if (!preset.defaultLinkUrl) return ""
  let url = preset.defaultLinkUrl
  for (const param of preset.params) {
    const val = values[param.key] || param.default
    // split/join replaces *every* occurrence (templates can repeat a param).
    url = url.split(`{${param.key}}`).join(val)
  }
  return url
}

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
    // split/join replaces *every* occurrence (group templates repeat params).
    path = path.split(`{${param.key}}`).join(val)
  }
  return path
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// Single source of truth — the variants the renderer actually supports.
// Re-exported from the core registry so the builder/showcase can never drift
// from what really renders (no phantom variants in dropdowns).
export { ALL_VARIANTS as VARIANTS, VARIANT_LABELS, allowedVariantsForPath } from "@shieldcn/core/badges/registry"
export const SIZES = ["xs", "sm", "default", "lg"] as const
export const MODES = ["dark", "light"] as const
export const FONTS = ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"] as const
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
  /** Optional brand slug — overlays colors, font, theme, and logo from a stored
   *  brand server-side. Explicit builder params still win (query > brand). */
  brand: string
  /** Target URL when the badge is clicked (wraps in a link) */
  linkUrl: string
}

export const BUILDER_DEFAULTS: BuilderState = {
  path: "/badge/build-passing-22c55e.svg",
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
  brand: "",
  linkUrl: "",
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
  // A brand overlays colors/theme/font/logo server-side; the explicit params
  // above still win (precedence: query param > brand > default).
  // Optional-chain: docs persisted before `brand` existed omit the field.
  if (s.brand?.trim()) p.set("brand", s.brand.trim())

  const q = p.toString()
  return `${baseUrl}${path}${q ? `?${q}` : ""}`
}

/**
 * Build just the relative badge path (no origin) for API submission.
 */
export function buildBadgePath(s: BuilderState): string {
  return buildBadgeUrl(s, "")
}
