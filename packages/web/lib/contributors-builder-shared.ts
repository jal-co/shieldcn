/**
 * shieldcn
 * lib/contributors-builder-shared
 *
 * Shared state + URL builder for the contributors-image generator UI.
 * Mirrors sponsors-builder-shared but for /contributors/{owner}/{repo}.svg —
 * a contrib.rocks-style grid of a repository's top contributors.
 */

import {
  HEADER_PRESETS,
  HEADER_PRESET_LABELS,
  HEADER_FONTS,
  HEADER_THEMES,
  randomUnsplashHeader,
  type HeaderPreset,
} from "./header-builder-shared"

// The contributors card reuses the exact background system as headers.
export const CONTRIBUTORS_PRESETS = HEADER_PRESETS
export const CONTRIBUTORS_PRESET_LABELS = HEADER_PRESET_LABELS
export const CONTRIBUTORS_FONTS = HEADER_FONTS
export const CONTRIBUTORS_THEMES = HEADER_THEMES
export { randomUnsplashHeader }
export type ContributorsPreset = HeaderPreset

export const CONTRIBUTORS_SIZES = ["40", "48", "64", "80"] as const
export type ContributorsSize = (typeof CONTRIBUTORS_SIZES)[number]
export const CONTRIBUTORS_SIZE_LABELS: Record<ContributorsSize, string> = {
  "40": "Compact",
  "48": "Small",
  "64": "Medium",
  "80": "Large",
}

export interface ContributorsState {
  /** GitHub repository owner (user or org). */
  owner: string
  /** GitHub repository name. */
  repo: string
  /** Card heading. Empty hides it (title=false). */
  title: string
  preset: ContributorsPreset
  theme: string
  /** Avatar diameter (px) as a string. */
  size: ContributorsSize
  /** Show a login caption under each avatar. */
  names: boolean
  /** Include bot accounts ([bot] / type:Bot). */
  bots: boolean
  /** Alignment of the card title. */
  titleAlign: "left" | "center" | "right"
  /** Alignment of the avatar rows. */
  avatarAlign: "left" | "center" | "right"
  /** Max avatars rendered (string for the input). */
  limit: string
  /** Minimum contributions to include (string for the input). */
  min: string
  mode: "dark" | "light"
  font: string
  border: boolean
  watermark: boolean
  /** Background photo URL (Unsplash or any image). Fetched + inlined server-side. */
  image: string
  /** Scrim strength over the photo, "0"–"1". Blank = default (0.45). */
  overlay: string
}

export const CONTRIBUTORS_DEFAULTS: ContributorsState = {
  owner: "vercel",
  repo: "next.js",
  title: "Contributors",
  preset: "surface",
  theme: "",
  size: "64",
  names: false,
  bots: false,
  titleAlign: "left",
  avatarAlign: "center",
  limit: "",
  min: "",
  mode: "dark",
  font: "inter",
  border: true,
  watermark: false,
  image: "",
  overlay: "",
}

/** Build the `/contributors/{owner}/{repo}.svg?...` URL from builder state. */
export function buildContributorsUrl(s: ContributorsState, baseUrl: string): string {
  const owner = s.owner.trim().replace(/^@/, "") || "vercel"
  const repo = s.repo.trim() || "next.js"
  const params = new URLSearchParams()

  // Title: default is "Contributors". An empty title hides the heading.
  if (s.title.trim() === "") params.set("title", "false")
  else if (s.title !== "Contributors") params.set("title", s.title)

  if (s.preset && s.preset !== "surface") params.set("preset", s.preset)
  if (s.theme) params.set("theme", s.theme)
  if (s.size && s.size !== "64") params.set("size", s.size)
  if (s.names) params.set("names", "true")
  if (s.bots) params.set("bots", "true")
  if (s.titleAlign && s.titleAlign !== "left") params.set("titleAlign", s.titleAlign)
  if (s.avatarAlign && s.avatarAlign !== "center") params.set("align", s.avatarAlign)
  if (s.limit.trim()) params.set("limit", s.limit.trim())
  if (s.min.trim()) params.set("min", s.min.trim())
  // Always include mode so the URL changes with the site theme (cache-safe).
  params.set("mode", s.mode)
  if (s.font && s.font !== "inter") params.set("font", s.font)
  if (s.watermark) params.set("watermark", "true")
  if (!s.border) params.set("border", "false")
  if (s.image) params.set("image", s.image)
  if (s.image && s.overlay) params.set("overlay", s.overlay)

  const qs = params.toString()
  return `${baseUrl}/contributors/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}.svg${qs ? `?${qs}` : ""}`
}
