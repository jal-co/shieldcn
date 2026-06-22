/**
 * shieldcn
 * lib/header-builder-shared
 *
 * Shared state + URL builder for the repository-header generator UI.
 * Mirrors badge-builder-shared but for /header/{preset}.svg images.
 */

export const HEADER_PRESETS = [
  "surface",
  "gradient",
  "dots",
  "grid",
  "graph",
  "glow",
  "transparent",
] as const
export type HeaderPreset = (typeof HEADER_PRESETS)[number]

export const HEADER_PRESET_LABELS: Record<HeaderPreset, string> = {
  surface: "Surface",
  gradient: "Gradient",
  dots: "Dots",
  grid: "Grid",
  graph: "Graph",
  glow: "Glow",
  transparent: "Transparent",
}

export const HEADER_SIZES = ["banner", "wide", "social", "square"] as const
export type HeaderSize = (typeof HEADER_SIZES)[number]

export const HEADER_SIZE_LABELS: Record<HeaderSize, string> = {
  banner: "Banner",
  wide: "Wide",
  social: "Social",
  square: "Square",
}

export const HEADER_ALIGN = ["center", "left"] as const
export const HEADER_FONTS = [
  "inter",
  "geist",
  "geist-mono",
  "jetbrains-mono",
  "fira-code",
  "roboto",
  "space-grotesk",
] as const
export const HEADER_THEMES = [
  "zinc",
  "slate",
  "blue",
  "green",
  "rose",
  "orange",
  "violet",
  "purple",
  "cyan",
  "emerald",
] as const

export interface HeaderState {
  preset: HeaderPreset
  title: string
  subtitle: string
  logo: string
  logoColor: string
  size: HeaderSize
  mode: "dark" | "light"
  theme: string
  align: "center" | "left"
  font: string
  border: boolean
  watermark: boolean
  /** Background photo URL (Unsplash or any image). Fetched + inlined server-side. */
  image: string
  /** Scrim strength over the photo, "0"–"1". Blank = default (0.45). */
  overlay: string
}

// Curated Unsplash photos that read well as wide banners (sized via imgix).
const UNSPLASH_SAMPLES = [
  "photo-1517336714731-489689fd1ca8", // laptop / code
  "photo-1451187580459-43490279c0fa", // earth / network
  "photo-1462331940025-496dfbfc7564", // galaxy
  "photo-1550745165-9bc0b252726f", // retro tech
  "photo-1499951360447-b19be8fe80f5", // workspace
  "photo-1480506132288-68f7705954bd", // mountains
  "photo-1509822929063-6b6cfc9b42f2", // gradient paper
  "photo-1614850523459-c2f4c699c52e", // abstract gradient
]

/** Build an Unsplash image URL (banner-sized) for a given photo id. */
export function unsplashUrl(id: string): string {
  return `https://images.unsplash.com/${id}?w=1600&q=70&fit=crop&fm=jpg`
}

/** A random curated Unsplash banner URL, different from `current` when possible. */
export function randomUnsplashHeader(current?: string): string {
  const currentId = current?.match(/photo-[\w-]+/)?.[0]
  const pool = UNSPLASH_SAMPLES.filter(id => id !== currentId)
  const list = pool.length ? pool : UNSPLASH_SAMPLES
  return unsplashUrl(list[Math.floor(Math.random() * list.length)])
}

export const HEADER_DEFAULTS: HeaderState = {
  preset: "surface",
  title: "Acme Toolkit",
  subtitle: "A delightful component library",
  logo: "",
  logoColor: "",
  size: "banner",
  mode: "dark",
  theme: "",
  align: "center",
  font: "inter",
  border: true,
  watermark: false,
  image: "",
  overlay: "",
}

/** Build the `/header/{preset}.svg?...` URL from builder state. */
export function buildHeaderUrl(s: HeaderState, baseUrl: string): string {
  const params = new URLSearchParams()
  if (s.title) params.set("title", s.title)
  if (s.subtitle) params.set("subtitle", s.subtitle)
  if (s.logo) params.set("logo", s.logo)
  if (s.logo && s.logoColor) params.set("logoColor", s.logoColor)
  if (s.size && s.size !== "banner") params.set("size", s.size)
  // Always include mode so the URL changes with the site theme (cache-safe).
  params.set("mode", s.mode)
  if (s.theme) params.set("theme", s.theme)
  if (s.align && s.align !== "center") params.set("align", s.align)
  if (s.font && s.font !== "inter") params.set("font", s.font)
  if (s.watermark) params.set("watermark", "true")
  if (!s.border) params.set("border", "false")
  if (s.image) params.set("image", s.image)
  if (s.image && s.overlay) params.set("overlay", s.overlay)

  const preset = s.preset || "surface"
  const qs = params.toString()
  return `${baseUrl}/header/${preset}.svg${qs ? `?${qs}` : ""}`
}
