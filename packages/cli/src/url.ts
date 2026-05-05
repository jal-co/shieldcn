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
): Record<string, string> {
  const merged: Record<string, string> = { ...badge.query }

  // Only add global overrides when they differ from server defaults
  if (global.variant && global.variant !== "default" && !merged.variant) merged.variant = global.variant
  if (global.size && global.size !== "sm" && global.size !== "default" && !merged.size) merged.size = global.size
  if (global.mode && global.mode !== "dark" && !merged.mode) merged.mode = global.mode
  if (global.theme && !merged.theme) merged.theme = global.theme

  return merged
}

export function badgeUrl(badge: Badge, global: GlobalSettings): string {
  const qs = new URLSearchParams(mergeQuery(badge, global)).toString()
  return `${SHIELDCN_BASE}${badge.path}${qs ? `?${qs}` : ""}`
}

export function badgeMarkdown(badge: Badge, global: GlobalSettings): string {
  const url = badgeUrl(badge, global)
  const alt = badge.label.replace(/[\[\]]/g, "")
  const img = `![${alt}](${url})`
  return badge.linkUrl ? `[${img}](${badge.linkUrl})` : img
}

export function badgeHtml(badge: Badge, global: GlobalSettings): string {
  const url = badgeUrl(badge, global)
  const alt = badge.label.replace(/"/g, "&quot;")
  const img = `<img src="${url}" alt="${alt}" />`
  return badge.linkUrl ? `<a href="${badge.linkUrl}">${img}</a>` : img
}
