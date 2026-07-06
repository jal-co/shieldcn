/**
 * shieldcn
 * components/builder-v2/state
 *
 * Prototype: extended builder state surfacing EVERY badge query param,
 * including the dimension props (height, fontSize, padX, iconSize,
 * gap, labelGap) and statusDot that the v1 builder never exposed.
 */

import {
  BUILDER_DEFAULTS,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"

// ---------------------------------------------------------------------------
// Dimension props — slider-tunable numeric params
// ---------------------------------------------------------------------------

export interface DimensionSpec {
  key: DimensionKey
  label: string
  min: number
  max: number
  /** Approximate renderer default for size=sm, shown when the value is auto. */
  preview: number
}

export type DimensionKey =
  | "height"
  | "fontSize"
  | "radius"
  | "padX"
  | "iconSize"
  | "gap"
  | "labelGap"

export const DIMENSIONS: DimensionSpec[] = [
  { key: "height",   label: "Height",     min: 16, max: 56, preview: 28 },
  { key: "fontSize", label: "Font size",  min: 8,  max: 24, preview: 12 },
  { key: "padX",     label: "Padding X",  min: 0,  max: 28, preview: 10 },
  { key: "iconSize", label: "Icon size",  min: 8,  max: 28, preview: 13 },
  { key: "gap",      label: "Icon gap",   min: 0,  max: 20, preview: 6 },
  { key: "labelGap", label: "Label gap",  min: 0,  max: 20, preview: 6 },
]

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface BuilderV2State extends BuilderState {
  /** "" = auto (renderer preset), otherwise px value as string */
  height: string
  fontSize: string
  radius: string
  padX: string
  iconSize: string
  gap: string
  labelGap: string
  /** "" = auto (on for CI), "true" | "false" to force */
  statusDot: string
}

export const BUILDER_V2_DEFAULTS: BuilderV2State = {
  ...BUILDER_DEFAULTS,
  height: "",
  fontSize: "",
  radius: "",
  padX: "",
  iconSize: "",
  gap: "",
  labelGap: "",
  statusDot: "",
}

// ---------------------------------------------------------------------------
// URL builder — v1 params via shared builder, then the extended params
// ---------------------------------------------------------------------------

export function buildBadgeUrlV2(s: BuilderV2State, baseUrl: string): string {
  const base = buildBadgeUrl(s, baseUrl)
  if (!base) return ""

  const extra = new URLSearchParams()
  for (const d of DIMENSIONS) {
    if (s[d.key]) extra.set(d.key, s[d.key])
  }
  if (s.statusDot) extra.set("statusDot", s.statusDot)

  const q = extra.toString()
  if (!q) return base
  return base + (base.includes("?") ? "&" : "?") + q
}

/** Relative badge path (no origin) — for API submission (showcase, brand editor). */
export function buildBadgePathV2(s: BuilderV2State): string {
  return buildBadgeUrlV2(s, "")
}

/** Count of non-default extended params — used for section badges. */
export function countCustomized(s: BuilderV2State, keys: (keyof BuilderV2State)[]): number {
  return keys.filter(k => {
    const def = BUILDER_V2_DEFAULTS[k]
    return s[k] !== def
  }).length
}
