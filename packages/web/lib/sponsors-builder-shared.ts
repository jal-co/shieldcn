/**
 * shieldcn
 * lib/sponsors-builder-shared
 *
 * Shared state + URL builder for the sponsors-image generator UI.
 * Mirrors header-builder-shared but for /sponsors/{login}.svg images.
 */

import {
  HEADER_PRESETS,
  HEADER_PRESET_LABELS,
  HEADER_FONTS,
  HEADER_THEMES,
  randomUnsplashHeader,
  type HeaderPreset,
} from "./header-builder-shared"

// The sponsors card reuses the exact background system as headers.
export const SPONSORS_PRESETS = HEADER_PRESETS
export const SPONSORS_PRESET_LABELS = HEADER_PRESET_LABELS
export const SPONSORS_FONTS = HEADER_FONTS
export const SPONSORS_THEMES = HEADER_THEMES
export { randomUnsplashHeader }
export type SponsorsPreset = HeaderPreset

export const SPONSORS_SIZES = ["48", "64", "80"] as const
export type SponsorsSize = (typeof SPONSORS_SIZES)[number]
export const SPONSORS_SIZE_LABELS: Record<SponsorsSize, string> = {
  "48": "Small",
  "64": "Medium",
  "80": "Large",
}

export interface SponsorsState {
  /** GitHub user or org login. */
  login: string
  /** Card heading. Empty hides it (title=false). */
  title: string
  preset: SponsorsPreset
  theme: string
  /** Base avatar diameter (px) as a string. */
  size: SponsorsSize
  /** Show a name caption under each avatar. */
  names: boolean
  /** Comma-separated logins pinned into the larger "Special Sponsors" row. */
  special: string
  /** Comma-separated logins pinned into the smaller "Backers" row. */
  backers: string
  /** Max avatars in the default row (string for the input). */
  limit: string
  mode: "dark" | "light"
  font: string
  border: boolean
  watermark: boolean
  /** Background photo URL (Unsplash or any image). Fetched + inlined server-side. */
  image: string
  /** Scrim strength over the photo, "0"–"1". Blank = default (0.45). */
  overlay: string
}

export const SPONSORS_DEFAULTS: SponsorsState = {
  login: "shadcn",
  title: "Sponsors",
  preset: "surface",
  theme: "",
  size: "64",
  names: true,
  special: "",
  backers: "",
  limit: "",
  mode: "dark",
  font: "inter",
  border: true,
  watermark: false,
  image: "",
  overlay: "",
}

/** Build the `/sponsors/{login}.svg?...` URL from builder state. */
export function buildSponsorsUrl(s: SponsorsState, baseUrl: string): string {
  const login = s.login.trim().replace(/^@/, "") || "shadcn"
  const params = new URLSearchParams()

  // Title: default is "Sponsors". An empty title hides the heading entirely.
  if (s.title.trim() === "") params.set("title", "false")
  else if (s.title !== "Sponsors") params.set("title", s.title)

  if (s.preset && s.preset !== "surface") params.set("preset", s.preset)
  if (s.theme) params.set("theme", s.theme)
  if (s.size && s.size !== "64") params.set("size", s.size)
  if (!s.names) params.set("names", "false")
  if (s.special.trim()) params.set("special", s.special.trim())
  if (s.backers.trim()) params.set("backers", s.backers.trim())
  if (s.limit.trim()) params.set("limit", s.limit.trim())
  // Always include mode so the URL changes with the site theme (cache-safe).
  params.set("mode", s.mode)
  if (s.font && s.font !== "inter") params.set("font", s.font)
  if (s.watermark) params.set("watermark", "true")
  if (!s.border) params.set("border", "false")
  if (s.image) params.set("image", s.image)
  if (s.image && s.overlay) params.set("overlay", s.overlay)

  const qs = params.toString()
  return `${baseUrl}/sponsors/${encodeURIComponent(login)}.svg${qs ? `?${qs}` : ""}`
}
