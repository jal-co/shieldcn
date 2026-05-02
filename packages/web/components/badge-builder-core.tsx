/**
 * shieldcn
 * components/badge-builder-core
 *
 * Shared badge builder UI used by both the landing page builder
 * and the showcase submit dialog. Renders preview + controls.
 * Does NOT render copy output — the parent handles that.
 *
 * UX flow:
 * 1. Pick a badge type from preset dropdown (grouped by category)
 * 2. Fill in dynamic params (package name, owner/repo, etc.)
 * 3. Choose variant, size, mode
 * 4. Optionally expand advanced customization (theme, icon, colors, etc.)
 */

"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { ChevronDown, RotateCcw, Code2 } from "lucide-react"
import { LogoPicker } from "@/components/logo-picker"
import { ColorInput } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  BADGE_PRESETS,
  resolveTemplate,
  VARIANTS,
  SIZES,
  MODES,
  FONTS,
  FORMATS,
  THEMES,
  BUILDER_DEFAULTS,
  type BuilderState,
  type BadgePreset,
} from "@/lib/badge-builder-shared"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group presets by category */
function groupPresets(): Map<string, BadgePreset[]> {
  const groups = new Map<string, BadgePreset[]>()
  for (const preset of BADGE_PRESETS) {
    const list = groups.get(preset.group) || []
    list.push(preset)
    groups.set(preset.group, list)
  }
  return groups
}

const PRESET_GROUPS = groupPresets()
const PRESET_GROUP_ORDER = ["Package", "GitHub", "Social", "Custom"]

/** Find a preset that matches a given path */
function findMatchingPreset(path: string): { preset: BadgePreset; values: Record<string, string> } | null {
  for (const preset of BADGE_PRESETS) {
    // Build a regex from the template: /npm/{package}.svg → /npm/([^/]+)\.svg
    let pattern = preset.template
      .replace(/\./g, "\\.")
      .replace(/\{([^}]+)\}/g, "([^/]+)")
    pattern = `^${pattern}$`
    const match = path.match(new RegExp(pattern))
    if (match) {
      const values: Record<string, string> = {}
      preset.params.forEach((p, i) => {
        values[p.key] = match[i + 1] || p.default
      })
      return { preset, values }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BadgeBuilderCoreProps {
  /** Current builder state (controlled). */
  state: BuilderState
  /** Called when any field changes. */
  onChange: (state: BuilderState) => void
  /** The full badge URL (with origin). */
  badgeUrl: string
  /** Whether to show the header with title + reset. Default: true */
  showHeader?: boolean
  /** Whether to show format (SVG/PNG) selector. Default: true */
  showFormat?: boolean
  /** Additional content rendered after the controls. */
  children?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeBuilderCore({
  state: s,
  onChange,
  badgeUrl,
  showHeader = true,
  showFormat = true,
  children,
}: BadgeBuilderCoreProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showRawPath, setShowRawPath] = useState(false)
  const [imgError, setImgError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // --- Preset state ---
  const initialMatch = useMemo(() => findMatchingPreset(s.path), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(() => {
    if (initialMatch) return BADGE_PRESETS.indexOf(initialMatch.preset)
    return 0
  })
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    if (initialMatch) return initialMatch.values
    const preset = BADGE_PRESETS[0]
    const defaults: Record<string, string> = {}
    for (const p of preset.params) defaults[p.key] = p.default
    return defaults
  })

  const selectedPreset = BADGE_PRESETS[selectedPresetIndex]

  const set = useCallback(<K extends keyof BuilderState>(key: K, val: BuilderState[K]) => {
    onChange({ ...s, [key]: val })
    setImgError(false)
  }, [s, onChange])

  // --- When preset or param values change, update the path ---
  const updatePath = useCallback((preset: BadgePreset, values: Record<string, string>) => {
    const path = resolveTemplate(preset, values)
    onChange({ ...s, path })
    setImgError(false)
  }, [s, onChange])

  const handlePresetChange = useCallback((indexStr: string) => {
    const idx = parseInt(indexStr, 10)
    if (isNaN(idx) || idx < 0 || idx >= BADGE_PRESETS.length) return
    const preset = BADGE_PRESETS[idx]
    setSelectedPresetIndex(idx)
    // Reset param values to defaults for the new preset
    const defaults: Record<string, string> = {}
    for (const p of preset.params) defaults[p.key] = p.default
    setParamValues(defaults)
    updatePath(preset, defaults)
  }, [updatePath])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleParamChange = useCallback((key: string, value: string) => {
    const next = { ...paramValues, [key]: value }
    setParamValues(next)
    // Debounce path update for typing
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updatePath(selectedPreset, next)
    }, 300)
  }, [paramValues, selectedPreset, updatePath])

  // --- Raw path editing (advanced) ---
  const [rawPathInput, setRawPathInput] = useState(s.path)
  const handleRawPathInput = useCallback((val: string) => {
    setRawPathInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...s, path: val })
      setImgError(false)
    }, 400)
  }, [s, onChange])

  // Sync rawPathInput when path changes from preset/params
  const prevPath = useRef(s.path)
  useEffect(() => {
    if (s.path !== prevPath.current) {
      prevPath.current = s.path
      setRawPathInput(s.path)
    }
  }, [s.path])

  const isDefault = JSON.stringify(s) === JSON.stringify(BUILDER_DEFAULTS)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ── Header ── */}
      {showHeader && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold tracking-tight">Badge Builder</h3>
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(BUILDER_DEFAULTS)
                setSelectedPresetIndex(0)
                const defaults: Record<string, string> = {}
                for (const p of BADGE_PRESETS[0].params) defaults[p.key] = p.default
                setParamValues(defaults)
                setShowAdvanced(false)
                setShowRawPath(false)
              }}
              className="text-muted-foreground text-xs gap-1.5 h-7"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}
        </div>
      )}

      {/* ── Preview ── */}
      <div
        className="flex items-center justify-center border-b border-border py-10 px-6 transition-colors"
        style={{ backgroundColor: s.mode === "light" ? "#f4f4f5" : "#0c0c0e" }}
      >
        {badgeUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={badgeUrl}
            src={badgeUrl}
            alt="badge preview"
            className="max-h-12 select-none"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {imgError ? "Failed to load — check your badge settings" : "Configure your badge below"}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* ── Badge type selector ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Badge type</Label>
          <Select value={String(selectedPresetIndex)} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_GROUP_ORDER.map(group => {
                const presets = PRESET_GROUPS.get(group)
                if (!presets) return null
                return (
                  <SelectGroup key={group}>
                    <SelectLabel className="text-xs text-muted-foreground font-medium">{group}</SelectLabel>
                    {presets.map(preset => {
                      const idx = BADGE_PRESETS.indexOf(preset)
                      return (
                        <SelectItem key={idx} value={String(idx)}>
                          {preset.label}
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* ── Dynamic parameters ── */}
        {selectedPreset.params.length > 0 && (
          <div className={cn("grid gap-3 grid-cols-1", selectedPreset.params.length === 2 && "sm:grid-cols-2", selectedPreset.params.length >= 3 && "sm:grid-cols-3")}>
            {selectedPreset.params.map(param => (
              <div key={param.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {param.label}
                  {param.optional && <span className="text-muted-foreground/50 ml-1">(optional)</span>}
                </Label>
                <Input
                  value={paramValues[param.key] || ""}
                  onChange={e => handleParamChange(param.key, e.target.value)}
                  placeholder={param.optional ? `${param.placeholder}` : param.placeholder}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Core controls: variant + size + mode ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Ctrl label="Variant" value={s.variant} onChange={v => set("variant", v)} options={[...VARIANTS]} />
          <Ctrl label="Size" value={s.size} onChange={v => set("size", v)} options={[...SIZES]} />
          <Ctrl label="Mode" value={s.mode} onChange={v => set("mode", v)} options={[...MODES]} />
        </div>

        {/* ── Advanced customization toggle ── */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <ChevronDown className={cn("size-3 transition-transform", showAdvanced && "rotate-180")} />
          Customize theme, icon, colors & more
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg border border-border/50 bg-muted/5 p-4">
            {/* Theme + Font + Format */}
            <div className={cn("grid gap-3 grid-cols-1 sm:grid-cols-2", showFormat && "sm:grid-cols-3")}>
              <Ctrl label="Theme" value={s.theme} onChange={v => set("theme", v)} options={[...THEMES]} displayMap={{ _none: "None" }} />
              <Ctrl label="Font" value={s.font} onChange={v => set("font", v)} options={[...FONTS]} />
              {showFormat && (
                <Ctrl label="Format" value={s.format} onChange={v => set("format", v)} options={[...FORMATS]} displayMap={{ svg: "SVG", png: "PNG" }} />
              )}
            </div>

            {/* Icon */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <LogoPicker value={s.logo.startsWith("data:") ? "" : s.logo} onChange={v => set("logo", v)} />
                </div>
                <SvgIconUpload value={s.logo} onChange={v => set("logo", v)} className="shrink-0" />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <ShadcnCheckbox checked={s.split} onCheckedChange={v => set("split", v === true)} />
                <span className="text-xs">Split mode</span>
              </label>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Background" value={s.color} onChange={v => set("color", v)} />
              <ColorField label="Icon color" value={s.logoColor} onChange={v => set("logoColor", v)} />
              {s.split && (
                <ColorField label="Label background" value={s.labelColor} onChange={v => set("labelColor", v)} />
              )}
            </div>

            {/* Text overrides */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Custom label</Label>
                <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gradient</Label>
                <Input value={s.gradient} onChange={e => set("gradient", e.target.value)} placeholder="ff6b6b,4ecdc4" className="h-8 text-xs" />
              </div>
            </div>

            {/* Fine-grain color overrides */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ColorField label="Value text" value={s.valueColor} onChange={v => set("valueColor", v)} />
              <ColorField label="Label text" value={s.labelTextColor} onChange={v => set("labelTextColor", v)} />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Label opacity</Label>
                <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" className="h-8 text-xs" />
              </div>
            </div>

            {/* Raw path (for power users) */}
            <div className="pt-1 border-t border-border/30">
              <button
                onClick={() => setShowRawPath(!showRawPath)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
              >
                <Code2 className="size-3" />
                {showRawPath ? "Hide" : "Edit"} raw badge path
              </button>
              {showRawPath && (
                <div className="mt-2 space-y-1.5">
                  <Input
                    value={rawPathInput}
                    onChange={e => handleRawPathInput(e.target.value)}
                    placeholder="/npm/react.svg"
                    className="font-mono text-xs h-8"
                  />
                  <p className="text-[10px] text-muted-foreground/50">
                    Direct URL path — overrides the badge type selector above
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Slot for parent-specific content (copy output, submit button, etc.) ── */}
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Ctrl({
  label,
  value,
  onChange,
  options,
  displayMap,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  displayMap?: Record<string, string>
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              {displayMap?.[opt] ?? opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <ColorInput value={value} onChange={onChange} placeholder="auto" />
    </div>
  )
}
