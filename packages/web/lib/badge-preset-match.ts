/**
 * shieldcn
 * lib/badge-preset-match
 *
 * Pure preset grouping / search / reverse-matching logic for the badge
 * pickers. Previously duplicated between the homepage badge builder
 * (`badge-builder-core.tsx`) and the Studio badge inspectors
 * (`studio/inspectors.tsx`) — with two subtly different `findMatchingPreset`
 * implementations, one of which had a regex bug (see below). Consolidated
 * here so both consumers share one correct, unit-tested source of truth.
 */

import { BADGE_PRESETS, type BadgePreset } from "@/lib/badge-builder-shared"
import type { SearchablePickerFilter } from "@/components/searchable-picker"

/** Presets grouped by their `group` field (preserves declaration order). */
export const PRESET_GROUPS: Map<string, BadgePreset[]> = (() => {
  const groups = new Map<string, BadgePreset[]>()
  for (const preset of BADGE_PRESETS) {
    const list = groups.get(preset.group) || []
    list.push(preset)
    groups.set(preset.group, list)
  }
  return groups
})()

const PRESET_GROUP_ORDER = [
  "Custom", "Package", "GitHub", "Social", "Community", "Quality",
  "Funding", "Editor marketplaces", "App stores", "Localization",
  "Game/modding", "Other", "Group",
]

const PRESET_SERVICE_FILTER_ORDER = [
  "Custom", "npm", "GitHub", "Docker", "PyPI", "Crates.io", "JSR",
  "Discord", "NBA", "Reddit", "X", "YouTube", "Country flag", "Group",
]

/** Service label for a preset (falls back to its group). */
export function getPresetService(preset: BadgePreset): string {
  return preset.service ?? preset.group
}

/** Human display label — prefixes the service unless the label already leads with it. */
export function getPresetDisplayLabel(preset: BadgePreset): string {
  const service = getPresetService(preset)
  if (!service || preset.label.toLowerCase().startsWith(service.toLowerCase())) {
    return preset.label
  }
  return `${service} ${preset.label}`
}

/** Group names in curated order, with any unlisted groups appended. */
export const PRESET_GROUP_NAMES: string[] = [
  ...PRESET_GROUP_ORDER.filter(group => PRESET_GROUPS.has(group)),
  ...Array.from(PRESET_GROUPS.keys()).filter(group => !PRESET_GROUP_ORDER.includes(group)),
]

/** Service filter chips for the searchable picker, in curated order. */
export const PRESET_FILTERS: SearchablePickerFilter[] = (() => {
  const services = Array.from(new Set(BADGE_PRESETS.map(getPresetService)))
  const ordered = [
    ...PRESET_SERVICE_FILTER_ORDER.filter(service => services.includes(service)),
    ...services.filter(service => !PRESET_SERVICE_FILTER_ORDER.includes(service)),
  ]
  return [{ value: "all", label: "All" }, ...ordered.map(service => ({ value: service, label: service }))]
})()

/** True if a preset matches a free-text search under an optional service filter. */
export function presetMatchesSearch(preset: BadgePreset, search: string, serviceFilter: string): boolean {
  const service = getPresetService(preset)
  if (serviceFilter !== "all" && service !== serviceFilter) return false
  const q = search.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    preset.label, service, preset.group, preset.template,
    ...(preset.searchKeywords ?? []),
    ...preset.params.flatMap(param => [param.key, param.label, param.placeholder]),
  ].join(" ").toLowerCase()
  return haystack.includes(q)
}

/**
 * Reverse-match a badge path back to a preset, its index, and param values.
 *
 * Every regex metacharacter in the literal chunks of a template is escaped —
 * critical for "Group" presets whose templates contain a literal "+" (the
 * group segment joiner). An earlier copy of this logic in badge-builder-core
 * escaped only ".", so "+" acted as a quantifier and corrupted param
 * extraction (package/owner fields kept gaining a stray "+"). Query strings
 * are stripped before matching.
 *
 * `skipStatic` (default false) excludes `customResolver: "static"` presets
 * (i.e. the dash-format Custom badge). The Studio badge inspector sets this —
 * it handles custom static badges through a separate control, so it must not
 * reverse-match them here — while the homepage builder leaves it off so an
 * initial custom-badge path still pre-fills its content field.
 */
export function findMatchingPreset(
  path: string,
  opts: { skipStatic?: boolean } = {},
): { preset: BadgePreset; idx: number; values: Record<string, string> } | null {
  const clean = path.replace(/\?.*$/, "")
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  for (let idx = 0; idx < BADGE_PRESETS.length; idx++) {
    const preset = BADGE_PRESETS[idx]
    if (opts.skipStatic && preset.customResolver === "static") continue
    const placeholder = /\{([^}]+)\}/g
    let pattern = "^"
    let lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = placeholder.exec(preset.template)) !== null) {
      pattern += escapeRe(preset.template.slice(lastIndex, m.index)) + "([^/]+)"
      lastIndex = placeholder.lastIndex
    }
    pattern += escapeRe(preset.template.slice(lastIndex)) + "$"
    const match = clean.match(new RegExp(pattern))
    if (match) {
      const values: Record<string, string> = {}
      preset.params.forEach((p, i) => { values[p.key] = match[i + 1] || p.default })
      return { preset, idx, values }
    }
  }
  return null
}
