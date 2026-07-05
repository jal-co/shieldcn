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
import { RotateCcw, Code2, Link, ChevronDown } from "lucide-react"
import { LogoPicker } from "@/components/logo-picker"
import { SearchablePicker, type SearchablePickerSection } from "@/components/searchable-picker"
import { ColorSwatch } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
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
  VARIANT_LABELS,
  allowedVariantsForPath,
  SIZES,
  MODES,
  FONTS,
  FORMATS,
  THEMES,
  BUILDER_DEFAULTS,
  type BuilderState,
  type BadgePreset,
} from "@/lib/badge-builder-shared"
import {
  PRESET_GROUPS,
  PRESET_GROUP_NAMES,
  PRESET_FILTERS,
  getPresetService,
  getPresetDisplayLabel,
  presetMatchesSearch,
  findMatchingPreset,
} from "@/lib/badge-preset-match"

// ---------------------------------------------------------------------------
// Variant clamping
// ---------------------------------------------------------------------------

// Provider → SimpleIcons slug, for the `branded` variant's auto logo/color.
// A badge can only use `branded` if we have a known icon for its provider AND
// it isn't a static `/badge/` (which has no auto-brand). This is the builder's
// branded rule — it MUST be shared by both the dropdown filter and clampVariant
// so the selected state can never disagree with what the dropdown allows.
const PROVIDER_ICON: Record<string, string> = {
  npm: "npm", pypi: "pypi", crates: "rust", docker: "docker",
  jsr: "jsr", discord: "discord", reddit: "reddit",
  youtube: "youtube", twitch: "twitch", github: "github",
  gitlab: "gitlab", bluesky: "bluesky", x: "x", twitter: "x",
}

/** Whether the `branded` variant is usable for a given badge path. */
function brandedEligible(path: string): boolean {
  const provider = path.split("/").filter(Boolean)[0] || ""
  return !!PROVIDER_ICON[provider] && !path.startsWith("/badge/")
}

/**
 * If a state's variant isn't valid for its badge path, snap it back to
 * "default". Applied whenever the path changes so the preview/URL never carry a
 * variant the selected badge doesn't support. Mirrors the dropdown's rule:
 * registry-allowed AND (not `branded`, or branded-eligible).
 */
function clampVariant(next: BuilderState, brandStyled = false): BuilderState {
  const allowed = allowedVariantsForPath(next.path)
  const ok =
    allowed.includes(next.variant as never) &&
    (next.variant !== "branded" || brandStyled || brandedEligible(next.path))
  return ok ? next : { ...next, variant: "default" }
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
  /**
   * Brand-showcase context: the badge is always rendered with `?brand=slug`, so
   * the brand supplies the color/logo. Makes the `branded` variant always
   * selectable (not just for provider badges) so a brand's showcase badges can
   * default to and use branded. Default: false.
   */
  brandStyled?: boolean
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
  brandStyled = false,
  children,
}: BadgeBuilderCoreProps) {
  const [showRawPath, setShowRawPath] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [presetSearch, setPresetSearch] = useState("")
  const [presetServiceFilter, setPresetServiceFilter] = useState("all")
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Single debounce window for all text inputs that feed the badge URL.
  const URL_DEBOUNCE_MS = 300

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

  const presetSections = useMemo<SearchablePickerSection[]>(() => {
    return PRESET_GROUP_NAMES.map(group => {
      const presets = PRESET_GROUPS.get(group) ?? []
      const items = presets
        .map(preset => ({ preset, idx: BADGE_PRESETS.indexOf(preset) }))
        .filter(({ preset }) => presetMatchesSearch(preset, presetSearch, presetServiceFilter))
        .map(({ preset, idx }) => {
          const service = getPresetService(preset)
          return {
            value: String(idx),
            label: getPresetDisplayLabel(preset),
            tag: service,
          }
        })

      return { heading: group, items }
    })
  }, [presetSearch, presetServiceFilter])

  const set = useCallback(<K extends keyof BuilderState>(key: K, val: BuilderState[K]) => {
    onChange({ ...s, [key]: val })
    setImgError(false)
  }, [s, onChange])

  const updatePath = useCallback((preset: BadgePreset, values: Record<string, string>, extraState?: Partial<BuilderState>) => {
    const path = resolveTemplate(preset, values)
    onChange(clampVariant({ ...s, ...extraState, path }, brandStyled))
    setImgError(false)
  }, [s, onChange, brandStyled])

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

  const handlePresetPickerChange = useCallback((indexStr: string) => {
    handlePresetChange(indexStr)
    setPresetSearch("")
  }, [handlePresetChange])

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
    }, URL_DEBOUNCE_MS)
  }, [paramValues, selectedPreset, updatePath, s.linkUrl])

  // --- Raw path editing (advanced) ---
  const [rawPathInput, setRawPathInput] = useState(s.path)
  const handleRawPathInput = useCallback((val: string) => {
    setRawPathInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange(clampVariant({ ...s, path: val }, brandStyled))
      setImgError(false)
    }, URL_DEBOUNCE_MS)
  }, [s, onChange, brandStyled])

  const prevPath = useRef(s.path)
  useEffect(() => {
    if (s.path !== prevPath.current) {
      prevPath.current = s.path
      setRawPathInput(s.path)
    }
  }, [s.path])

  const isDefault = JSON.stringify(s) === JSON.stringify(BUILDER_DEFAULTS)

  const currentProvider = useMemo(() => s.path.split("/").filter(Boolean)[0] || "", [s.path])
  const brandedIcon = PROVIDER_ICON[currentProvider] || ""
  // Shared with clampVariant so the dropdown and the selected state never drift.
  const hasBranded = brandStyled || brandedEligible(s.path)

  // Variants the SELECTED badge actually supports, per the core registry
  // (source of truth). Combined with the branded-icon check below so the
  // dropdown never lists a variant this badge can't render.
  const allowedForPath = useMemo(() => new Set(allowedVariantsForPath(s.path)), [s.path])
  const variantAllowed = useCallback(
    (v: string) => allowedForPath.has(v as never) && (v !== "branded" || hasBranded),
    [allowedForPath, hasBranded],
  )


  // Build variant preview URLs — static badges showing variant name in that variant's style
  const variantPreviewUrls = useMemo(() => {
    if (!badgeUrl) return {} as Record<string, string>
    const map: Record<string, string> = {}
    try {
      const base = new URL(badgeUrl).origin
      for (const v of VARIANTS) {
        if (!variantAllowed(v)) continue
        const label = VARIANT_LABELS[v] ?? v
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
  }, [badgeUrl, s.mode, brandedIcon, variantAllowed])

  const handleReset = useCallback(() => {
    onChange(BUILDER_DEFAULTS)
    setSelectedPresetIndex(0)
    const defaults: Record<string, string> = {}
    for (const p of BADGE_PRESETS[0].params) defaults[p.key] = p.default
    setParamValues(defaults)
    setShowRawPath(false)
    setShowAdvanced(false)
    setPresetSearch("")
    setPresetServiceFilter("all")
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
        <span className="absolute right-3 top-3 rounded-md border border-border/40 bg-background/60 px-1.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
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
              tabIndex={isDefault ? -1 : 0}
              aria-hidden={isDefault}
              className={cn(
                "text-muted-foreground text-xs gap-1.5 h-7",
                isDefault && "invisible pointer-events-none",
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
              <SearchablePicker
                value={String(selectedPresetIndex)}
                triggerLabel={getPresetDisplayLabel(selectedPreset)}
                placeholder="Search badge types..."
                emptyLabel="No badge type found."
                search={presetSearch}
                onSearchChange={setPresetSearch}
                filters={PRESET_FILTERS}
                activeFilter={presetServiceFilter}
                onFilterChange={setPresetServiceFilter}
                sections={presetSections}
                onValueChange={handlePresetPickerChange}
                contentClassName="w-[min(520px,calc(100vw-2rem))]"
                listClassName="max-h-[360px]"
              />
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
            <div className={cn("grid grid-cols-3 gap-1.5", "sm:grid-cols-6")}>
              {VARIANTS.filter(variantAllowed).map(v => (
                <button
                  key={v}
                  onClick={() => set("variant", v)}
                  aria-pressed={s.variant === v}
                  className={cn(
                    "flex items-center justify-center rounded-lg px-1 py-2.5 transition-colors",
                    s.variant === v
                      ? "bg-primary/10 ring-1 ring-primary"
                      : "hover:bg-muted/60",
                  )}
                >
                  {variantPreviewUrls[v] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variantPreviewUrls[v]}
                      alt={VARIANT_LABELS[v] ?? v}
                      className="h-[26px] select-none"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {VARIANT_LABELS[v] ?? v}
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

          {/* ── Advanced disclosure: icon, link, colors, raw path ── */}
          <div className="h-px bg-border/50" />
          <button
            onClick={() => setShowAdvanced(!showAdvanced)
            }
            aria-expanded={showAdvanced}
            className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")} />
            Advanced customization
          </button>
          <Reveal open={showAdvanced}>
          <div className="space-y-5 pt-1">

          {/* ── Row 3: Icon ── */}
          <div className="space-y-2">
            <SectionLabel>Icon</SectionLabel>
            <div className="flex gap-2">
              <div className="flex-1">
                <LogoPicker value={s.logo.startsWith("data:") ? "" : s.logo} onChange={v => set("logo", v)} ariaLabel="Badge logo icon" />
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
                className="h-8 pl-8 text-xs"
              />
            </div>
            {s.linkUrl && (
              <p className="text-xs text-muted-foreground/60">
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
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Brand</Label>
                <Input value={s.brand} onChange={e => set("brand", e.target.value)} placeholder="acme" className="h-8 text-xs" />
              </div>
              <div className="flex items-end h-full pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <ShadcnCheckbox checked={s.split} onCheckedChange={v => set("split", v === true)} />
                  <span className="text-xs">Split mode</span>
                </label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Brand</span> overlays a stored brand&apos;s colors, theme, font &amp; logo. Add
              {" "}<code className="font-mono">logo=brand</code> or <code className="font-mono">font=brand</code> in the URL to use hosted assets.
            </p>
          </div>

          {/* ── Raw path ── */}
          <div className="pt-1">
            <button
              onClick={() => setShowRawPath(!showRawPath)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
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
                <p className="text-xs text-muted-foreground/60">
                  Overrides the badge type selector
                </p>
              </div>
            </Reveal>
          </div>
          </div>
          </Reveal>
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
    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
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
        <SelectTrigger className="h-9 w-full text-sm">
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
