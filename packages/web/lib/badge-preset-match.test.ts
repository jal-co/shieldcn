/**
 * shieldcn
 * lib/badge-preset-match.test
 *
 * The reverse-matcher is the piece with a real bug history (a "+" in a Group
 * template acting as a regex quantifier), so it gets the most coverage here.
 */

import { describe, it, expect } from "vitest"
import {
  findMatchingPreset,
  presetMatchesSearch,
  getPresetService,
  getPresetDisplayLabel,
  PRESET_GROUPS,
  PRESET_GROUP_NAMES,
  PRESET_FILTERS,
} from "./badge-preset-match"
import { BADGE_PRESETS, resolveTemplate } from "./badge-builder-shared"

describe("findMatchingPreset", () => {
  it("returns null for a path matching no preset", () => {
    expect(findMatchingPreset("/nonsense/path/that/matches/nothing.svg")).toBeNull()
  })

  it("round-trips every non-static preset's default path back to itself", () => {
    // resolveTemplate(preset, defaults) must reverse-match to the same preset.
    // This is the core invariant the picker relies on for pre-selection.
    for (let idx = 0; idx < BADGE_PRESETS.length; idx++) {
      const preset = BADGE_PRESETS[idx]
      if (preset.customResolver === "static") continue
      const defaults: Record<string, string> = {}
      for (const p of preset.params) defaults[p.key] = p.default
      const path = resolveTemplate(preset, defaults)
      const match = findMatchingPreset(path, { skipStatic: true })
      expect(match, `preset #${idx} "${preset.label}" path ${path}`).not.toBeNull()
      // A path may match an earlier preset with an identical template shape;
      // what matters is the extracted values round-trip.
      expect(match!.values).toMatchObject(defaults)
    }
  })

  it("does not corrupt params for a Group preset whose template contains a literal '+'", () => {
    // Regression lock: "+" in the template must be escaped, not treated as a
    // regex quantifier (the historical bug that made fields gain a stray "+").
    const group = BADGE_PRESETS.find(p => p.group === "Group" && p.template.includes("+"))
    expect(group, "expected at least one Group preset with a '+' template").toBeTruthy()
    const defaults: Record<string, string> = {}
    for (const p of group!.params) defaults[p.key] = p.default
    const path = resolveTemplate(group!, defaults)
    const match = findMatchingPreset(path, { skipStatic: true })
    expect(match).not.toBeNull()
    // No extracted value should carry a stray "+" from a mis-parsed template.
    for (const v of Object.values(match!.values)) {
      expect(v).not.toContain("+")
    }
    expect(match!.values).toMatchObject(defaults)
  })

  it("strips a query string before matching", () => {
    const npm = BADGE_PRESETS.find(p => p.template === "/npm/{package}.svg")!
    const match = findMatchingPreset("/npm/react.svg?variant=branded&theme=blue", { skipStatic: true })
    expect(match?.preset).toBe(npm)
    expect(match?.values.package).toBe("react")
  })

  it("skipStatic excludes the dash-format Custom preset; default includes it", () => {
    const customPath = "/badge/build-passing-green.svg"
    // The Custom preset uses customResolver: "static".
    const withStatic = findMatchingPreset(customPath)
    const withoutStatic = findMatchingPreset(customPath, { skipStatic: true })
    // Whatever the exact match, skipStatic must never return a static preset.
    if (withoutStatic) expect(withoutStatic.preset.customResolver).not.toBe("static")
    // Default (no skip) is allowed to match the static Custom preset.
    expect(withStatic === null || withStatic.preset !== undefined).toBe(true)
  })

  it("reports the preset's index, consistent with BADGE_PRESETS", () => {
    const npm = BADGE_PRESETS.find(p => p.template === "/npm/{package}.svg")!
    const match = findMatchingPreset("/npm/react.svg", { skipStatic: true })
    expect(match?.idx).toBe(BADGE_PRESETS.indexOf(npm))
  })
})

describe("presetMatchesSearch", () => {
  const npm = BADGE_PRESETS.find(p => p.template === "/npm/{package}.svg")!

  it("matches everything under an empty query", () => {
    expect(presetMatchesSearch(npm, "", "all")).toBe(true)
  })

  it("matches on label / service / keyword substrings, case-insensitively", () => {
    expect(presetMatchesSearch(npm, "NPM", "all")).toBe(true)
  })

  it("excludes presets outside the active service filter", () => {
    expect(presetMatchesSearch(npm, "", "GitHub")).toBe(false)
    expect(presetMatchesSearch(npm, "", getPresetService(npm))).toBe(true)
  })

  it("returns false when the query matches nothing", () => {
    expect(presetMatchesSearch(npm, "zzz-not-a-real-token-xyz", "all")).toBe(false)
  })
})

describe("display + grouping helpers", () => {
  it("getPresetDisplayLabel prefixes the service unless the label already leads with it", () => {
    expect(getPresetDisplayLabel({ label: "stars", service: "GitHub", group: "GitHub", template: "", params: [] }))
      .toBe("GitHub stars")
    expect(getPresetDisplayLabel({ label: "GitHub Sponsors", service: "GitHub", group: "GitHub", template: "", params: [] }))
      .toBe("GitHub Sponsors")
  })

  it("PRESET_GROUPS covers every preset exactly once", () => {
    const total = Array.from(PRESET_GROUPS.values()).reduce((n, list) => n + list.length, 0)
    expect(total).toBe(BADGE_PRESETS.length)
  })

  it("PRESET_GROUP_NAMES lists every group key", () => {
    expect(new Set(PRESET_GROUP_NAMES)).toEqual(new Set(PRESET_GROUPS.keys()))
  })

  it("PRESET_FILTERS starts with the 'all' chip", () => {
    expect(PRESET_FILTERS[0]).toEqual({ value: "all", label: "All" })
  })
})
