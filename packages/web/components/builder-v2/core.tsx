/**
 * shieldcn
 * components/builder-v2/core
 *
 * Controlled badge builder v2 core, shared by the /badge page, the showcase
 * submit dialog, and the brand showcase editor. Every documented query param
 * has a control (including dimension props and statusDot).
 *
 * Layouts:
 * - "page":    two-panel workspace — sticky preview + output slot left,
 *              controls right. Optional storyboarded entrance.
 * - "stacked": preview on top, output slot, then controls — fits dialogs.
 */

"use client"

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD (only when `animate` is true)
 *
 *    0ms   blank
 *  100ms   preview canvas fades in, scale 0.97 → 1.0
 *  350ms   badge pops onto canvas (snappy spring)
 *  500ms   output slot slides up
 *  650ms   control sections stagger in (80ms apart)
 *
 * Badge updates: img cross-fades + micro scale pulse on
 * every URL change (spring, no duration easing).
 * ───────────────────────────────────────────────────────── */

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { RotateCcw, Link as LinkIcon, Code2 } from "lucide-react"
import { IconPickerV2 } from "./icon-picker-v2"
import { DIMENSIONS, BUILDER_V2_DEFAULTS, type BuilderV2State } from "./state"
import { SearchablePicker, type SearchablePickerSection } from "@/components/searchable-picker"
import { ColorSwatch } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
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
// Animation config
// ---------------------------------------------------------------------------

const TIMING = {
  canvas:   100,   // preview canvas fades in
  badge:    350,   // badge pops onto canvas
  output:   500,   // output slot slides up
  sections: 650,   // control sections start staggering
}

const CANVAS = {
  initialScale: 0.97,
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
}

const BADGE_POP = {
  initialScale: 0.8,
  spring: { type: "spring" as const, stiffness: 500, damping: 26 },
}

const SECTIONS = {
  stagger:  0.08,   // seconds between sections
  offsetY:  14,     // px slide-up distance
  spring: { type: "spring" as const, stiffness: 350, damping: 30 },
}

// ---------------------------------------------------------------------------
// Theme swatch colors (representative accents for the dot picker)
// ---------------------------------------------------------------------------

const THEME_DOTS: Record<string, string> = {
  _none: "conic-gradient(from 0deg, #f43f5e, #f59e0b, #22c55e, #06b6d4, #8b5cf6, #f43f5e)",
  zinc: "#71717a", slate: "#64748b", stone: "#78716c", neutral: "#737373",
  gray: "#6b7280", blue: "#3b82f6", green: "#22c55e", rose: "#f43f5e",
  orange: "#f97316", amber: "#f59e0b", violet: "#8b5cf6", purple: "#a855f7",
  red: "#ef4444", cyan: "#06b6d4", emerald: "#10b981",
}

// Provider → icon for branded eligibility (mirrors v1 rule)
const PROVIDER_ICON: Record<string, string> = {
  npm: "npm", pypi: "pypi", crates: "rust", docker: "docker",
  jsr: "jsr", discord: "discord", reddit: "reddit",
  youtube: "youtube", twitch: "twitch", github: "github",
  gitlab: "gitlab", bluesky: "bluesky", x: "x", twitter: "x",
}

// Static /badge/ paths encode an optional trailing hex color segment
// (label-value-COLOR.svg). Treat that as a bg hex just like ?color=.
const STATIC_COLOR_RE = /-([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(\.(?:svg|png))$/

function pathHasStaticColor(path: string): boolean {
  return path.startsWith("/badge/") && STATIC_COLOR_RE.test(path)
}

/** `/badge/build-passing-22c55e.svg` → `/badge/build-passing.svg` */
function stripStaticColor(path: string): string {
  return path.replace(STATIC_COLOR_RE, "$2")
}

function variantOwnsBackground(s: BuilderV2State): boolean {
  return s.variant === "destructive" || s.variant === "branded" || !!s.brand.trim()
}

/** Theme applies only when nothing else owns the badge background. */
function themeApplicable(s: BuilderV2State): boolean {
  return !s.color
    && !pathHasStaticColor(s.path)
    && !variantOwnsBackground(s)
}

/**
 * Clear props whenever they're inapplicable so the URL never carries stale params:
 * - destructive/branded variants (and brand overlays) own the background → clear color
 * - anything that owns the background → clear theme
 */
function normalizeTheme(next: BuilderV2State): BuilderV2State {
  let out = next
  if (variantOwnsBackground(out)) {
    if (out.color) out = { ...out, color: "" }
    if (pathHasStaticColor(out.path)) out = { ...out, path: stripStaticColor(out.path) }
  }
  if (!themeApplicable(out) && out.theme !== "_none") out = { ...out, theme: "_none" }
  return out
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BuilderV2CoreProps {
  /** Current builder state (controlled). */
  state: BuilderV2State
  onChange: (state: BuilderV2State) => void
  /** The full badge URL (or relative path) to preview. */
  badgeUrl: string
  /** "page" = two-column sticky workspace; "stacked" = dialog-friendly. */
  layout?: "page" | "stacked"
  /** Whether to show the SVG/PNG format selector. Default: true */
  showFormat?: boolean
  /**
   * Brand-showcase context: the badge is always rendered with ?brand=slug, so
   * `branded` is always selectable and brand fields are hidden.
   */
  brandStyled?: boolean
  /** Run the storyboarded entrance. Default: false (dialogs load into a task). */
  animate?: boolean
  /** Rendered in the output slot (copy output on the page, actions in dialogs). */
  children?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BuilderV2Core({
  state: s,
  onChange,
  badgeUrl,
  layout = "page",
  showFormat = true,
  brandStyled = false,
  animate = false,
  children,
}: BuilderV2CoreProps) {
  const [stage, setStage] = React.useState(animate ? 0 : 99)
  // Track the URL that failed rather than a boolean, so a new URL resets the
  // error state during render without a setState-in-effect.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null)
  const imgError = failedUrl === badgeUrl
  const [showRawPath, setShowRawPath] = React.useState(false)

  // --- Entrance sequence (page only) ---
  React.useEffect(() => {
    if (!animate) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reduced-motion escape hatch
      setStage(99)
      return
    }
    const timers = [
      setTimeout(() => setStage(1), TIMING.canvas),
      setTimeout(() => setStage(2), TIMING.badge),
      setTimeout(() => setStage(3), TIMING.output),
      setTimeout(() => setStage(4), TIMING.sections),
    ]
    return () => timers.forEach(clearTimeout)
  }, [animate])

  const baseUrl = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  const set = React.useCallback(<K extends keyof BuilderV2State>(key: K, val: BuilderV2State[K]) => {
    onChange(normalizeTheme({ ...s, [key]: val }))
  }, [s, onChange])

  // --- Brand directory (public slug list) for the brand picker ---
  const [brandList, setBrandList] = React.useState<{ slug: string; name: string }[] | null>(null)
  const [brandOpen, setBrandOpen] = React.useState(false)
  const [brandSearch, setBrandSearch] = React.useState("")
  const brandLoadingRef = React.useRef(false)
  const ensureBrandList = React.useCallback(() => {
    if (brandList || brandLoadingRef.current) return
    brandLoadingRef.current = true
    fetch("/api/brands/list")
      .then(res => res.json())
      .then(data => setBrandList(data.brands ?? []))
      .catch(() => setBrandList([]))
      .finally(() => { brandLoadingRef.current = false })
  }, [brandList])

  const brandSections = React.useMemo<SearchablePickerSection[]>(() => {
    const q = brandSearch.trim().toLowerCase()
    const items = (brandList ?? [])
      .filter(b => !q || b.slug.includes(q) || b.name.toLowerCase().includes(q))
      .map(b => ({ value: b.slug, label: b.name, meta: b.slug }))
    return [
      ...(q ? [] : [{ items: [{ value: "_none", label: "None", meta: "no brand overlay" }] }]),
      { heading: "Brands", items },
    ]
  }, [brandList, brandSearch])

  // --- Presets (initial selection derived from the incoming path) ---
  const initialMatch = React.useMemo(() => findMatchingPreset(s.path), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [presetIndex, setPresetIndex] = React.useState<number>(() =>
    initialMatch ? BADGE_PRESETS.indexOf(initialMatch.preset) : 0,
  )
  const [paramValues, setParamValues] = React.useState<Record<string, string>>(() => {
    if (initialMatch) return initialMatch.values
    const d: Record<string, string> = {}
    for (const p of BADGE_PRESETS[0].params) d[p.key] = p.default
    return d
  })
  const [presetSearch, setPresetSearch] = React.useState("")
  const [presetFilter, setPresetFilter] = React.useState("all")
  const preset = BADGE_PRESETS[presetIndex]

  // Keep the Custom-badge "Color (hex)" param field in sync when a bg-owning
  // variant/brand strips the static color out of the path.
  React.useEffect(() => {
    if (variantOwnsBackground(s) && paramValues.color) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParamValues(prev => ({ ...prev, color: "" }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.variant, s.brand])

  const presetSections = React.useMemo<SearchablePickerSection[]>(() =>
    PRESET_GROUP_NAMES.map(group => ({
      heading: group,
      items: (PRESET_GROUPS.get(group) ?? [])
        .map(p => ({ p, idx: BADGE_PRESETS.indexOf(p) }))
        .filter(({ p }) => presetMatchesSearch(p, presetSearch, presetFilter))
        .map(({ p, idx }) => ({
          value: String(idx),
          label: getPresetDisplayLabel(p),
          tag: getPresetService(p),
        })),
    })), [presetSearch, presetFilter])

  const applyPreset = React.useCallback((p: BadgePreset, values: Record<string, string>, extra?: Partial<BuilderV2State>) => {
    const path = resolveTemplate(p, values)
    const next = { ...s, ...extra, path }
    const allowed = allowedVariantsForPath(path)
    const provider = path.split("/").filter(Boolean)[0] || ""
    const brandedOk = brandStyled || (!!PROVIDER_ICON[provider] && !path.startsWith("/badge/"))
    const ok = allowed.includes(next.variant as never) && (next.variant !== "branded" || brandedOk)
    onChange(normalizeTheme(ok ? next : { ...next, variant: "default" }))
  }, [s, onChange, brandStyled])

  const handlePresetChange = (indexStr: string) => {
    const idx = parseInt(indexStr, 10)
    if (isNaN(idx)) return
    const p = BADGE_PRESETS[idx]
    setPresetIndex(idx)
    const defaults: Record<string, string> = {}
    for (const param of p.params) defaults[param.key] = param.default
    setParamValues(defaults)
    applyPreset(p, defaults, { linkUrl: resolveDefaultLinkUrl(p, defaults) })
    setPresetSearch("")
  }

  const handleParamChange = (key: string, value: string) => {
    const next = { ...paramValues, [key]: value }
    setParamValues(next)
    const prevAuto = resolveDefaultLinkUrl(preset, paramValues)
    const isAuto = !s.linkUrl || s.linkUrl === prevAuto
    applyPreset(preset, next, isAuto ? { linkUrl: resolveDefaultLinkUrl(preset, next) } : undefined)
  }

  // --- Variants ---
  const provider = s.path.split("/").filter(Boolean)[0] || ""
  const brandedIcon = PROVIDER_ICON[provider] || ""
  const hasBranded = brandStyled || (!!brandedIcon && !s.path.startsWith("/badge/"))
  const allowedForPath = React.useMemo(() => new Set(allowedVariantsForPath(s.path)), [s.path])
  const variantAllowed = (v: string) =>
    allowedForPath.has(v as never) && (v !== "branded" || hasBranded)

  const variantPreviewUrls = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const v of VARIANTS) {
      if (!variantAllowed(v)) continue
      const p = new URLSearchParams()
      if (v !== "default") p.set("variant", v)
      p.set("size", "default")
      if (v === "branded" && brandedIcon) p.set("logo", brandedIcon)
      else if (v !== "branded") p.set("logo", "false")
      if (s.mode !== "dark") p.set("mode", s.mode)
      map[v] = `${baseUrl}/badge/${encodeURIComponent(VARIANT_LABELS[v] ?? v)}.svg?${p}`
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, s.mode, s.path, brandedIcon, hasBranded])

  const isDefault = JSON.stringify(s) === JSON.stringify(BUILDER_V2_DEFAULTS)
  const handleReset = () => {
    onChange(BUILDER_V2_DEFAULTS)
    setPresetIndex(0)
    const d: Record<string, string> = {}
    for (const p of BADGE_PRESETS[0].params) d[p.key] = p.default
    setParamValues(d)
  }

  // ------------------------------------------------------------------
  // Render pieces
  // ------------------------------------------------------------------

  const previewCanvas = (
    <motion.div
      initial={false}
      animate={{ opacity: stage >= 1 ? 1 : 0, scale: stage >= 1 ? 1 : CANVAS.initialScale }}
      transition={CANVAS.spring}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl border border-border",
        layout === "page" ? "h-[220px]" : "h-[140px]",
      )}
      style={{
        backgroundColor: s.mode === "light" ? "#f4f4f5" : "#0c0c0e",
        backgroundImage: s.mode === "light"
          ? "radial-gradient(circle, #d4d4d8 1px, transparent 1px)"
          : "radial-gradient(circle, #27272a 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {badgeUrl && !imgError ? (
          <motion.img
            key={badgeUrl}
            src={badgeUrl}
            alt="badge preview"
            initial={{ opacity: 0, scale: BADGE_POP.initialScale }}
            animate={{ opacity: stage >= 2 ? 1 : 0, scale: stage >= 2 ? 1 : BADGE_POP.initialScale }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={BADGE_POP.spring}
            className="max-h-16 select-none drop-shadow-sm"
            onError={() => setFailedUrl(badgeUrl)}
          />
        ) : (
          <motion.span
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground"
          >
            {imgError ? "Failed to load — check your settings" : "Configure your badge"}
          </motion.span>
        )}
      </AnimatePresence>

      {/* In-canvas mode toggle */}
      <div className="absolute right-3 top-3 flex overflow-hidden rounded-md border border-border/40 bg-background/60 backdrop-blur-sm">
        {MODES.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => set("mode", m)}
            className={cn(
              "px-2 py-0.5 text-[11px] font-medium transition-colors",
              s.mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {!isDefault && (
        <Button
          variant="ghost" size="sm" onClick={handleReset}
          className="absolute left-2 top-2 h-6 gap-1 px-2 text-[11px] text-muted-foreground"
        >
          <RotateCcw className="size-3" /> Reset
        </Button>
      )}
    </motion.div>
  )

  const outputSlot = children ? (
    <motion.div
      initial={false}
      animate={{ opacity: stage >= 3 ? 1 : 0, y: stage >= 3 ? 0 : 12 }}
      transition={SECTIONS.spring}
    >
      {children}
    </motion.div>
  ) : null

  const sections = [
    // ── Section 1: Badge ──
    <Section key="badge" title="Badge">
      <SearchablePicker
        value={String(presetIndex)}
        triggerLabel={getPresetDisplayLabel(preset)}
        placeholder="Search badge types..."
        emptyLabel="No badge type found."
        search={presetSearch}
        onSearchChange={setPresetSearch}
        filters={PRESET_FILTERS}
        activeFilter={presetFilter}
        onFilterChange={setPresetFilter}
        sections={presetSections}
        onValueChange={handlePresetChange}
        contentClassName="w-[min(520px,calc(100vw-2rem))]"
        listClassName="max-h-[360px]"
      />
      <div className={cn("grid gap-3", preset.params.length >= 2 ? "grid-cols-2" : "grid-cols-1")}>
        {preset.params
          // Static color param is owned by destructive/branded/brand — hide it
          .filter(param => !(param.key === "color" && variantOwnsBackground(s)))
          .map(param => (
          <Field key={param.key} label={param.label} optional={param.optional}>
            <Input
              value={paramValues[param.key] || ""}
              onChange={e => handleParamChange(param.key, e.target.value)}
              placeholder={param.placeholder}
              className="h-9 text-sm"
            />
          </Field>
        ))}
      </div>
      <div>
        <button
          type="button"
          onClick={() => setShowRawPath(!showRawPath)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <Code2 className="size-3" />
          {showRawPath ? "Hide" : "Edit"} raw path
        </button>
        {showRawPath && (
          <Input
            value={s.path}
            onChange={e => set("path", e.target.value)}
            placeholder="/npm/react.svg"
            className="mt-2 h-8 font-mono text-xs"
          />
        )}
      </div>
    </Section>,

    // ── Section 2: Style ──
    <Section key="style" title="Style">
      {/* Adaptive tile row: mirrors the preview canvas so light/dark mode
          is felt on the row too. Same bg + dot-grid pattern as the canvas. */}
      <div
        className="grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-1.5 rounded-[10px] px-1.5 py-2 transition-colors duration-200"
        style={{
          backgroundColor: s.mode === "light" ? "#f4f4f5" : "#0c0c0e",
          backgroundImage: s.mode === "light"
            ? "radial-gradient(circle, #d4d4d8 1px, transparent 1px)"
            : "radial-gradient(circle, #27272a 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {VARIANTS.filter(variantAllowed).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => set("variant", v)}
            aria-pressed={s.variant === v}
            className={cn(
              "flex items-center justify-center rounded-lg px-1 py-2.5 transition-colors",
              s.variant === v
                ? s.mode === "light" ? "bg-black/5 ring-1 ring-zinc-500" : "bg-white/5 ring-1 ring-primary"
                : s.mode === "light" ? "hover:bg-black/5" : "hover:bg-white/5",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={variantPreviewUrls[v]} alt={VARIANT_LABELS[v] ?? v} className="h-[26px] select-none" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Size">
          <Segmented options={[...SIZES]} value={s.size} onChange={v => set("size", v)} />
        </Field>
        {showFormat ? (
          <Field label="Format">
            <Segmented options={[...FORMATS]} value={s.format} onChange={v => set("format", v)} upper />
          </Field>
        ) : <div />}
      </div>
      {themeApplicable(s) && (
        <Field label="Theme">
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map(t => (
              <button
                key={t}
                type="button"
                title={t === "_none" ? "None" : t}
                onClick={() => set("theme", t)}
                aria-pressed={s.theme === t}
                className={cn(
                  "size-6 rounded-full border border-border/60 transition-all",
                  s.theme === t ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-110",
                )}
                style={{ background: THEME_DOTS[t] }}
              />
            ))}
          </div>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Font">
          <Select value={s.font} onValueChange={v => set("font", v)}>
            <SelectTrigger className="h-9 w-full text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-end gap-4 pb-1.5">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={s.split} onCheckedChange={v => set("split", v)} />
            Split
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={s.statusDot === "true"}
              onCheckedChange={v => set("statusDot", v ? "true" : "")}
            />
            Status dot
          </label>
        </div>
      </div>
    </Section>,

    // ── Section 3: Icon ──
    <Section key="icon" title="Icon">
      <div className="flex gap-2">
        <div className="flex-1">
          <IconPickerV2
            value={s.logo.startsWith("data:") ? "" : s.logo}
            onChange={v => set("logo", v)}
            hasBrand={brandStyled || !!s.brand.trim()}
          />
        </div>
        <SvgIconUpload value={s.logo} onChange={v => set("logo", v)} className="shrink-0" />
      </div>
      <div className="flex items-center gap-4">
        <ColorSwatch label="Icon color" value={s.logoColor} onChange={v => set("logoColor", v)} />
      </div>
    </Section>,

    // ── Section 4: Colors & text ──
    <Section key="colors" title="Colors & text">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {!variantOwnsBackground(s) && (
          <ColorSwatch label="Background" value={s.color} onChange={v => set("color", v)} />
        )}
        <ColorSwatch label="Value text" value={s.valueColor} onChange={v => set("valueColor", v)} />
        <ColorSwatch label="Label text" value={s.labelTextColor} onChange={v => set("labelTextColor", v)} />
        {s.split && (
          <ColorSwatch label="Label bg" value={s.labelColor} onChange={v => set("labelColor", v)} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Label override" optional>
          <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" className="h-8 text-xs" />
        </Field>
        <Field label="Label opacity" optional>
          <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" className="h-8 text-xs" />
        </Field>
        <Field label="Gradient" optional>
          <Input value={s.gradient} onChange={e => set("gradient", e.target.value)} placeholder="ff6b6b,4ecdc4,135" className="h-8 text-xs" />
        </Field>
      </div>
    </Section>,

    // ── Section 5: Dimensions ──
    <Section key="dims" title="Dimensions" hint="px overrides — auto uses the size preset">
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {DIMENSIONS.map(d => (
          <DialRow
            key={d.key}
            label={d.label}
            min={d.min}
            max={d.max}
            preview={d.preview}
            value={s[d.key]}
            onChange={v => set(d.key, v)}
          />
        ))}
      </div>
    </Section>,

    // ── Section 6: Link & brand (brand hidden in brand-styled contexts) ──
    <Section key="extras" title={brandStyled ? "Link" : "Link & brand"}>
      <Field label="Link URL" optional>
        <div className="relative">
          <LinkIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={s.linkUrl}
            onChange={e => set("linkUrl", e.target.value)}
            placeholder="https://… — where the badge links when clicked"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </Field>
      {!brandStyled && (
        <Field label="Brand" optional>
          <SearchablePicker
            value={s.brand || "_none"}
            triggerLabel={
              s.brand
                ? brandList?.find(b => b.slug === s.brand)?.name ?? s.brand
                : "None"
            }
            ariaLabel="Brand overlay"
            placeholder="Search brands..."
            emptyLabel="No brand found."
            search={brandSearch}
            onSearchChange={setBrandSearch}
            sections={brandSections}
            onValueChange={v => {
              set("brand", v === "_none" ? "" : v)
              setBrandSearch("")
            }}
            open={brandOpen}
            onOpenChange={next => {
              setBrandOpen(next)
              if (next) ensureBrandList()
              else setBrandSearch("")
            }}
            loading={brandOpen && !brandList}
            loadingLabel="Loading brands..."
          />
          {s.brand && (
            <p className="text-[11px] text-muted-foreground/70">
              Overlays the brand&apos;s colors, font &amp; mark. Explicit params above still win.
            </p>
          )}
        </Field>
      )}
    </Section>,
  ]

  const animatedSections = sections.map((section, i) => (
    <motion.div
      key={section.key}
      initial={false}
      animate={{ opacity: stage >= 4 ? 1 : 0, y: stage >= 4 ? 0 : SECTIONS.offsetY }}
      transition={{ ...SECTIONS.spring, delay: animate ? i * SECTIONS.stagger : 0 }}
    >
      {section}
    </motion.div>
  ))

  // ------------------------------------------------------------------
  // Layouts
  // ------------------------------------------------------------------

  if (layout === "stacked") {
    return (
      <div className="space-y-4">
        {previewCanvas}
        {outputSlot}
        {animatedSections}
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ═══ Left: preview + output (sticky on desktop) ═══ */}
      <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
        {previewCanvas}
        {outputSlot}
      </div>

      {/* ═══ Right: controls ═══ */}
      <div className="space-y-4">
        {animatedSections}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</h3>
        {hint && <span className="text-[10px] text-muted-foreground/50">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-4 items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {optional && (
          <span className="rounded border border-border/60 px-1 text-[9px] font-medium uppercase leading-[13px] tracking-wide text-muted-foreground/50">
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function Segmented({
  options, value, onChange, upper,
}: { options: string[]; value: string; onChange: (v: string) => void; upper?: boolean }) {
  return (
    <div className="flex h-9 w-full overflow-hidden rounded-md border border-input p-0.5">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={cn(
            "flex-1 rounded-[5px] text-xs font-medium transition-colors",
            upper && "uppercase",
            value === opt ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/**
 * DialKit-inspired slider row: label, range input, live readout.
 * "" = auto (renderer preset); dragging engages an explicit px value;
 * the × chip resets to auto.
 */
function DialRow({
  label, min, max, preview, value, onChange,
}: {
  label: string
  min: number
  max: number
  preview: number
  value: string
  onChange: (v: string) => void
}) {
  const engaged = value !== ""
  const num = engaged ? Number(value) : preview
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
          {engaged ? (
            <>
              <span className="text-foreground">{num}px</span>
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label={`Reset ${label} to auto`}
                className="rounded px-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            </>
          ) : (
            <span className="text-muted-foreground/50">auto</span>
          )}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={num}
        onChange={e => onChange(e.target.value)}
        className={cn(
          "w-full accent-foreground transition-opacity",
          !engaged && "opacity-40",
        )}
      />
    </div>
  )
}
