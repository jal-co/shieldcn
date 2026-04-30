/**
 * shieldcn
 * lib/badges/icon-index
 *
 * Client-side icon index for the LogoPicker.
 * Parses the compact JSON format from icon-list.json.
 *
 * Compact format: [slug, title, sourceCode, category?]
 * Source codes: s=SimpleIcons, l=Lucide, f=FontAwesome, h=Heroicons,
 *   t=Tabler, p=Phosphor, m=Material, b=Bootstrap, e=Feather
 */

export interface IconEntry {
  slug: string
  title: string
  source: string
  sourceLabel: string
  category?: string
}

const SOURCE_LABELS: Record<string, string> = {
  c: "shieldcn",
  s: "Simple Icons",
  l: "Lucide",
  f: "Font Awesome",
  h: "Heroicons",
  t: "Tabler",
  p: "Phosphor",
  m: "Material",
  b: "Bootstrap",
  e: "Feather",
}

const SOURCE_NAMES: Record<string, string> = {
  c: "custom",
  s: "simple",
  l: "lucide",
  f: "fa",
  h: "heroicons",
  t: "tabler",
  p: "phosphor",
  m: "material",
  b: "bootstrap",
  e: "feather",
}

export function parseCompactIcons(data: unknown[]): IconEntry[] {
  return (data as (string | undefined)[][]).map(entry => ({
    slug: entry[0] as string,
    title: entry[1] as string,
    source: SOURCE_NAMES[entry[2] as string] || (entry[2] as string),
    sourceLabel: SOURCE_LABELS[entry[2] as string] || (entry[2] as string),
    category: entry[3] as string | undefined,
  }))
}

/** All available source filters */
export const ICON_SOURCES = [
  { value: "all", label: "All sources" },
  { value: "custom", label: "shieldcn", description: "Custom brand icons" },
  { value: "simple", label: "Simple Icons", description: "Brand logos" },
  { value: "lucide", label: "Lucide", description: "Clean utility icons" },
  { value: "fa", label: "Font Awesome", description: "Classic web icons" },
  { value: "heroicons", label: "Heroicons", description: "By Tailwind CSS team" },
  { value: "tabler", label: "Tabler", description: "Stroke-based icons" },
  { value: "phosphor", label: "Phosphor", description: "Flexible icon family" },
  { value: "material", label: "Material Design", description: "Google's icon set" },
  { value: "bootstrap", label: "Bootstrap Icons", description: "Bootstrap ecosystem" },
  { value: "feather", label: "Feather", description: "Minimal stroke icons" },
] as const

/** Icon categories for filtering */
export const ICON_CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "arrows", label: "Arrows & Navigation" },
  { value: "files", label: "Files & Documents" },
  { value: "users", label: "Users & People" },
  { value: "social", label: "Social & Feedback" },
  { value: "media", label: "Media & Audio" },
  { value: "security", label: "Security & Privacy" },
  { value: "communication", label: "Communication" },
  { value: "commerce", label: "Commerce & Shopping" },
  { value: "places", label: "Places & Maps" },
  { value: "weather", label: "Weather" },
  { value: "shapes", label: "Shapes & Symbols" },
  { value: "development", label: "Development" },
  { value: "settings", label: "Settings & Tools" },
  { value: "search", label: "Search" },
  { value: "transfer", label: "Transfer & Sharing" },
  { value: "alerts", label: "Alerts & Status" },
  { value: "time", label: "Time & Calendar" },
  { value: "images", label: "Images & Design" },
  { value: "charts", label: "Charts & Data" },
  { value: "layout", label: "Layout & Grid" },
  { value: "editing", label: "Text & Editing" },
] as const
