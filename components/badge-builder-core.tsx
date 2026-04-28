/**
 * shieldcn
 * components/badge-builder-core
 *
 * Shared badge builder UI used by both the landing page builder
 * and the showcase submit dialog. Renders preview + controls.
 * Does NOT render copy output — the parent handles that.
 */

"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { ChevronDown, RotateCcw, ChevronsUpDown } from "lucide-react"
import { LogoPicker } from "@/components/logo-picker"
import { ColorInput } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  VARIANTS,
  SIZES,
  MODES,
  FONTS,
  FORMATS,
  THEMES,
  BUILDER_DEFAULTS,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"

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
  const [showStyle, setShowStyle] = useState(false)
  const [imgError, setImgError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const set = useCallback(<K extends keyof BuilderState>(key: K, val: BuilderState[K]) => {
    onChange({ ...s, [key]: val })
    setImgError(false)
  }, [s, onChange])

  // Debounced path update for the text input
  const [pathInput, setPathInput] = useState(s.path)
  const handlePathInput = useCallback((val: string) => {
    setPathInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...s, path: val })
      setImgError(false)
    }, 400)
  }, [s, onChange])

  // Sync pathInput when path changes externally (presets, reset)
  const prevPath = useRef(s.path)
  useEffect(() => {
    if (s.path !== prevPath.current) {
      prevPath.current = s.path
      setPathInput(s.path)
    }
  }, [s.path])

  const isDefault = JSON.stringify(s) === JSON.stringify(BUILDER_DEFAULTS)

  // Group presets
  const presetGroups = useMemo(() => {
    const map = new Map<string, typeof BADGE_PRESETS[number][]>()
    for (const p of BADGE_PRESETS) {
      if (!map.has(p.group)) map.set(p.group, [])
      map.get(p.group)!.push(p)
    }
    return map
  }, [])

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
              onClick={() => { onChange(BUILDER_DEFAULTS); setShowStyle(false) }}
              className="text-muted-foreground text-xs gap-1.5 h-7"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          )}
        </div>
      )}

      {/* ── Preview (always visible, top) ── */}
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
            {imgError ? "Failed to load — check your badge path" : "Enter a badge path to preview"}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* ── Badge path input ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Badge path</Label>
          <Input
            value={pathInput}
            onChange={e => handlePathInput(e.target.value)}
            placeholder="/npm/react.svg"
            className="font-mono text-sm"
          />
        </div>

        {/* ── Quick presets ── */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick start</Label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(presetGroups.entries()).map(([group, presets]) => (
              <div key={group} className="contents">
                {presets.slice(0, group === "GitHub" ? 4 : group === "Package" ? 3 : 2).map(p => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => set("path", p.path)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11px] transition-colors",
                      s.path === p.path
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ))}
            <MorePresetsDropdown
              presetGroups={presetGroups}
              onSelect={v => set("path", v)}
            />
          </div>
        </div>

        {/* ── Core controls: variant + size + mode ── */}
        <div className="grid grid-cols-3 gap-3">
          <Ctrl label="Variant" value={s.variant} onChange={v => set("variant", v)} options={[...VARIANTS]} />
          <Ctrl label="Size" value={s.size} onChange={v => set("size", v)} options={[...SIZES]} />
          <Ctrl label="Mode" value={s.mode} onChange={v => set("mode", v)} options={[...MODES]} />
        </div>

        {/* ── Style & customization toggle ── */}
        <button
          onClick={() => setShowStyle(!showStyle)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <ChevronDown className={cn("size-3 transition-transform", showStyle && "rotate-180")} />
          Customize theme, icon, colors & more
        </button>

        {showStyle && (
          <div className="space-y-4 rounded-lg border border-border/50 bg-muted/5 p-4">
            {/* Theme + Font + Format */}
            <div className={cn("grid gap-3", showFormat ? "grid-cols-3" : "grid-cols-2")}>
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
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Value text" value={s.valueColor} onChange={v => set("valueColor", v)} />
              <ColorField label="Label text" value={s.labelTextColor} onChange={v => set("labelTextColor", v)} />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Label opacity</Label>
                <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" className="h-8 text-xs" />
              </div>
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

function MorePresetsDropdown({
  presetGroups,
  onSelect,
}: {
  presetGroups: Map<string, typeof BADGE_PRESETS[number][]>
  onSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          More…
          <ChevronsUpDown className="size-2.5 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        {Array.from(presetGroups.entries()).map(([group, presets]) => (
          <div key={group}>
            <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {group}
            </div>
            {presets.map(p => (
              <button
                key={p.path}
                type="button"
                onClick={() => { onSelect(p.path); setOpen(false) }}
                className="w-full rounded-sm px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
              >
                {p.label}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
