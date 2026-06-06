/**
 * shieldcn CLI
 * src/url.ts
 *
 * Badge URL construction and formatting.
 */

import { SHIELDCN_BASE } from "./constants.js"
import type { Badge, GlobalSettings } from "./types.js"

const ENCODE_MAP: Array<[RegExp, string]> = [
  [/_/g, "__"],
  [/-/g, "--"],
]

export function encodeStaticSegment(raw: string): string {
  let s = raw
  for (const [re, rep] of ENCODE_MAP) s = s.replace(re, rep)
  return s.replace(/ /g, "_")
}

export function staticBadgePath(
  label: string,
  message: string,
  color: string,
): string {
  const enc = (s: string) => encodeURIComponent(encodeStaticSegment(s))
  return `/badge/${enc(label)}-${enc(message)}-${color.replace(/^#/, "")}.svg`
}

function mergeQuery(
  badge: Badge,
  global: GlobalSettings,
  modeOverride?: "light" | "dark",
): Record<string, string> {
  const merged: Record<string, string> = { ...badge.query }

  // Only add global overrides when they differ from server defaults
  if (global.variant && global.variant !== "default" && !merged.variant) merged.variant = global.variant
  if (global.size && global.size !== "sm" && global.size !== "default" && !merged.size) merged.size = global.size
  if (modeOverride) merged.mode = modeOverride
  else if (global.mode && global.mode !== "dark" && !merged.mode) merged.mode = global.mode
  if (global.theme && !merged.theme) merged.theme = global.theme

  return merged
}

/**
 * Variants whose colors are derived from the light/dark theme. Only these
 * benefit from theme-aware <picture> output — a badge with an explicit color
 * (e.g. /badge/label-value-green) looks identical in both modes.
 */
const THEME_DERIVED_VARIANTS = new Set([
  "default",
  "secondary",
  "outline",
  "ghost",
  "branded",
])

/**
 * Whether a badge would actually change between light and dark mode, so it's
 * worth wrapping in <picture>. True when the resolved variant is theme-derived
 * and the badge has no explicit `color` override pinning it to one look.
 */
export function isThemeAdaptive(badge: Badge, global: GlobalSettings): boolean {
  const variant = badge.query.variant || (global.variant !== "default" ? global.variant : "default")
  if (!THEME_DERIVED_VARIANTS.has(variant)) return false
  // An explicit color locks the badge to one appearance in both modes.
  if (badge.query.color) return false
  // An explicit mode pins the badge to one theme, so <picture> is pointless.
  if (badge.query.mode) return false
  return true
}

export function badgeUrl(
  badge: Badge,
  global: GlobalSettings,
  modeOverride?: "light" | "dark",
): string {
  const qs = new URLSearchParams(mergeQuery(badge, global, modeOverride)).toString()
  return `${SHIELDCN_BASE}${badge.path}${qs ? `?${qs}` : ""}`
}

/**
 * Build a GitHub theme-aware <picture> element. The <source> targets dark-theme
 * viewers; the <img> fallback (light) covers light-theme viewers and any
 * renderer that doesn't support <picture> (npm, PyPI, etc).
 */
export function badgePicture(badge: Badge, global: GlobalSettings): string {
  const dark = badgeUrl(badge, global, "dark")
  const light = badgeUrl(badge, global, "light")
  const alt = badge.label.replace(/"/g, "&quot;")
  const pic =
    `<picture>` +
    `<source media="(prefers-color-scheme: dark)" srcset="${dark}">` +
    `<img alt="${alt}" src="${light}"></picture>`
  return badge.linkUrl ? `<a href="${badge.linkUrl}">${pic}</a>` : pic
}

export function badgeMarkdown(badge: Badge, global: GlobalSettings): string {
  if (global.themeAware && isThemeAdaptive(badge, global)) {
    return badgePicture(badge, global)
  }
  const url = badgeUrl(badge, global)
  const alt = badge.label.replace(/[\[\]]/g, "")
  const img = `![${alt}](${url})`
  return badge.linkUrl ? `[${img}](${badge.linkUrl})` : img
}

export function badgeHtml(badge: Badge, global: GlobalSettings): string {
  if (global.themeAware && isThemeAdaptive(badge, global)) {
    return badgePicture(badge, global)
  }
  const url = badgeUrl(badge, global)
  const alt = badge.label.replace(/"/g, "&quot;")
  const img = `<img src="${url}" alt="${alt}" />`
  return badge.linkUrl ? `<a href="${badge.linkUrl}">${img}</a>` : img
}
