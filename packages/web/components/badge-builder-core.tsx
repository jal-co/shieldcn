/**
 * shieldcn
 * components/badge-builder-core
 *
 * Shared badge builder UI used by both the landing page builder
 * and the showcase submit dialog. Single card with split layout:
 * preview (left) + controls panel (right) on desktop, stacked on mobile.
 *
 * UX flow:
 * 1. Pick a badge type from preset dropdown (grouped by category)
 * 2. Fill in dynamic params (package name, owner/repo, etc.)
 * 3. Choose variant, size, mode
 * 4. Optionally expand advanced customization (theme, icon, colors, etc.)
 */

"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { RotateCcw, Code2, Link } from "lucide-react"
import { LogoPicker } from "@/components/logo-picker"
import { ColorSwatch } from "@/components/color-input"
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
  resolveDefaultLinkUrl,
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
const PRESET_GROUP_ORDER = ["Custom", "Package", "GitHub", "Social", "Other", "Group"]

/** Find a preset that matches a given path */
function findMatchingPreset(path: string): { preset: BadgePreset; values: Record<string, string> } | null {
  for (const preset of BADGE_PRESETS) {
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
// Variant display
// ---------------------------------------------------------------------------

const VARIANT_DISPLAY: Record<string, { label: string }> = {
  default: { label: "Default" },
  secondary: { label: "Secondary" },
  outline: { label: "Outline" },
  ghost: { label: "Ghost" },
  destructive: { label: "Destructive" },
  branded: { label: "Branded" },
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
  /** Additional content rendered below the preview area. */
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

  const updatePath = useCallback((preset: BadgePreset, values: Record<string, string>, extraState?: Partial<BuilderState>) => {
    const path = resolveTemplate(preset, values)
    onChange({ ...s, ...extraState, path })
    setImgError(false)
  }, [s, onChange])

  const handlePresetChange = useCallback((indexStr: string) => {
    const idx = parseInt(indexStr, 10)
    if (isNaN(idx) || idx < 0 || idx >= BADGE_PRESETS.length) return
    const preset = BADGE_PRESETS[idx]
    setSelectedPresetIndex(idx)
    const defaults: Record<string, string> = {}
    for (const p of preset.params) defaults[p.key] = p.default
    setParamValues(defaults)
    // Auto-fill link URL from preset default
    const linkUrl = resolveDefaultLinkUrl(preset, defaults)
    updatePath(preset, defaults, { linkUrl })
  }, [updatePath])

  const handleParamChange = useCallback((key: string, value: string) => {
    const next = { ...paramValues, [key]: value }
    setParamValues(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Update link URL if user hasn't customized it (still matches previous auto-filled value)
      const prevAutoLink = resolveDefaultLinkUrl(selectedPreset, paramValues)
      const nextAutoLink = resolveDefaultLinkUrl(selectedPreset, next)
      const isAutoLink = !s.linkUrl || s.linkUrl === prevAutoLink
      updatePath(selectedPreset, next, isAutoLink ? { linkUrl: nextAutoLink } : undefined)
    }, 300)
  }, [paramValues, selectedPreset, updatePath, s.linkUrl])

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

  const prevPath = useRef(s.path)
  useEffect(() => {
    if (s.path !== prevPath.current) {
      prevPath.current = s.path
      setRawPathInput(s.path)
    }
  }, [s.path])

  const isDefault = JSON.stringify(s) === JSON.stringify(BUILDER_DEFAULTS)

  // Map provider to its SimpleIcons slug for branded preview
  const PROVIDER_ICON: Record<string, string> = {
    npm: "npm", pypi: "pypi", crates: "rust", docker: "docker",
    jsr: "jsr", discord: "discord", reddit: "reddit",
    youtube: "youtube", twitch: "twitch", github: "github",
    gitlab: "gitlab", bluesky: "bluesky", x: "x", twitter: "x",
  }

  const currentProvider = useMemo(() => s.path.split("/").filter(Boolean)[0] || "", [s.path])
  const brandedIcon = PROVIDER_ICON[currentProvider] || ""
  const hasBranded = brandedIcon !== "" && !s.path.startsWith("/badge/")

  // Build variant preview URLs — static badges showing variant name in that variant's style
  const variantPreviewUrls = useMemo(() => {
    if (!badgeUrl) return {} as Record<string, string>
    const map: Record<string, string> = {}
    try {
      const base = new URL(badgeUrl).origin
      for (const v of VARIANTS) {
        if (v === "branded" && !hasBranded) continue
        const label = VARIANT_DISPLAY[v]?.label ?? v
        const p = new URLSearchParams()
        if (v !== "default") p.set("variant", v)
        p.set("size", "default")
        if (v === "branded") p.set("logo", brandedIcon)
        else p.set("logo", "false")
        if (s.mode !== "dark") p.set("mode", s.mode)
        const q = p.toString()
        map[v] = `${base}/badge/${encodeURIComponent(label)}.svg${q ? `?${q}` : ""}`
      }
    } catch { /* noop */ }
    return map
  }, [badgeUrl, s.mode, brandedIcon, hasBranded])

  const handleReset = useCallback(() => {
    onChange(BUILDER_DEFAULTS)
    setSelectedPresetIndex(0)
    const defaults: Record<string, string> = {}
    for (const p of BADGE_PRESETS[0].params) defaults[p.key] = p.default
    setParamValues(defaults)
    setShowRawPath(false)
  }, [onChange])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ─── Top: Preview ─── */}
      <div
        className="relative flex h-[140px] items-center justify-center transition-colors"
        style={{
          backgroundColor: s.mode === "light" ? "#f4f4f5" : "#0c0c0e",
          backgroundImage: s.mode === "light"
            ? "radial-gradient(circle, #d4d4d8 1px, transparent 1px)"
            : "radial-gradient(circle, #27272a 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {badgeUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={badgeUrl}
            src={badgeUrl}
            alt="badge preview"
            className="max-h-14 select-none drop-shadow-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">
            {imgError ? "Failed to load — check your settings" : "Configure your badge below"}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-md border border-border/40 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
          {s.mode}
        </span>
      </div>

      {/* ─── Copy output (slotted from parent) ─── */}
      {children && (
        <div className="border-t border-border px-5 py-4">
          {children}
        </div>
      )}

      {/* ─── Controls ─── */}
      <div className="border-t border-border">
        {/* Header */}
        {showHeader && (
          <div className="flex h-10 items-center justify-between px-5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-foreground/20" />
              <span className="text-xs font-medium tracking-tight text-muted-foreground">Controls</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className={cn(
                "text-muted-foreground text-xs gap-1.5 h-7",
                isDefault && "invisible",
              )}
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* ── Row 1: Badge type + params ── */}
          <div className="space-y-3">
            <SectionLabel>Badge type</SectionLabel>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={String(selectedPresetIndex)} onValueChange={handlePresetChange}>
                <SelectTrigger className="w-full text-sm h-9">
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
            <div className={cn("grid gap-3 pt-3", selectedPreset.params.length >= 2 ? "grid-cols-2" : "grid-cols-1")}>
              {selectedPreset.params.map(param => (
                <div key={param.key} className="space-y-1 animate-in fade-in-0 duration-200">
                  <Label className="text-xs text-muted-foreground">
                    {param.label}
                    {param.optional && <span className="text-muted-foreground/50 ml-1">(opt)</span>}
                  </Label>
                  <Input
                    value={paramValues[param.key] || ""}
                    onChange={e => handleParamChange(param.key, e.target.value)}
                    placeholder={param.placeholder}
                    className="text-sm h-9"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* ── Row 2: Style (variant + dropdowns) ── */}
          <div className="space-y-3">
            <SectionLabel>Style</SectionLabel>
            <div className={cn("grid grid-cols-3 gap-1.5", hasBranded ? "sm:grid-cols-6" : "sm:grid-cols-5")}>
              {VARIANTS.filter(v => v !== "branded" || hasBranded).map(v => (
                <button
                  key={v}
                  onClick={() => set("variant", v)}
                  className={cn(
                    "flex items-center justify-center rounded-lg px-1 py-2.5 transition-colors",
                    s.variant === v
                      ? "bg-foreground/10 ring-1 ring-foreground/20"
                      : "hover:bg-muted/60",
                  )}
                >
                  {variantPreviewUrls[v] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variantPreviewUrls[v]}
                      alt={VARIANT_DISPLAY[v]?.label ?? v}
                      className="h-[26px] select-none"
                    />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {VARIANT_DISPLAY[v]?.label ?? v}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className={cn("grid gap-3", showFormat ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
              <Ctrl label="Size" value={s.size} onChange={v => set("size", v)} options={[...SIZES]} />
              <Ctrl label="Mode" value={s.mode} onChange={v => set("mode", v)} options={[...MODES]} />
              <Ctrl label="Theme" value={s.theme} onChange={v => set("theme", v)} options={[...THEMES]} displayMap={{ _none: "None" }} />
              <Ctrl label="Font" value={s.font} onChange={v => set("font", v)} options={[...FONTS]} />
              {showFormat && (
                <Ctrl label="Format" value={s.format} onChange={v => set("format", v)} options={[...FORMATS]} displayMap={{ svg: "SVG", png: "PNG" }} />
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* ── Row 3: Icon ── */}
          <div className="space-y-2">
            <SectionLabel>Icon</SectionLabel>
            <div className="flex gap-2">
              <div className="flex-1">
                <LogoPicker value={s.logo.startsWith("data:") ? "" : s.logo} onChange={v => set("logo", v)} />
              </div>
              <SvgIconUpload value={s.logo} onChange={v => set("logo", v)} className="shrink-0" />
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* ── Row 4: Link URL ── */}
          <div className="space-y-2">
            <SectionLabel>Link</SectionLabel>
            <div className="relative">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
              <Input
                value={s.linkUrl}
                onChange={e => set("linkUrl", e.target.value)}
                placeholder="https://… — where the badge links to when clicked"
                className="h-9 pl-8 text-sm"
              />
            </div>
            {s.linkUrl && (
              <p className="text-[10px] text-muted-foreground/50">
                Badge will be wrapped in a clickable link in Markdown/HTML output.
              </p>
            )}
          </div>

          <div className="h-px bg-border/50" />

          {/* ── Row 5: Customize — all swatches + text inputs in one flat section ── */}
          <div className="space-y-3">
            <SectionLabel>Customize</SectionLabel>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <ColorSwatch label="Icon color" value={s.logoColor} onChange={v => set("logoColor", v)} />
              <ColorSwatch label="Background" value={s.color} onChange={v => set("color", v)} />
              <ColorSwatch label="Value text" value={s.valueColor} onChange={v => set("valueColor", v)} />
              <ColorSwatch label="Label text" value={s.labelTextColor} onChange={v => set("labelTextColor", v)} />
              <Reveal open={s.split}>
                <ColorSwatch label="Label bg" value={s.labelColor} onChange={v => set("labelColor", v)} />
              </Reveal>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Label opacity</Label>
                <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gradient</Label>
                <Input value={s.gradient} onChange={e => set("gradient", e.target.value)} placeholder="ff6b6b,4ecdc4" className="h-8 text-xs" />
              </div>
              <div className="flex items-end h-full pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <ShadcnCheckbox checked={s.split} onCheckedChange={v => set("split", v === true)} />
                  <span className="text-xs">Split mode</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Raw path ── */}
          <div className="pt-1">
            <button
              onClick={() => setShowRawPath(!showRawPath)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <Code2 className="size-3" />
              {showRawPath ? "Hide" : "Edit"} raw path
            </button>
            <Reveal open={showRawPath}>
              <div className="mt-2 space-y-1">
                <Input
                  value={rawPathInput}
                  onChange={e => handleRawPathInput(e.target.value)}
                  placeholder="/npm/react.svg"
                  className="font-mono text-xs h-8"
                />
                <p className="text-[10px] text-muted-foreground/50">
                  Overrides the badge type selector
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animate height from 0 to auto using the grid-rows trick. */
function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {children}
    </span>
  )
}

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

