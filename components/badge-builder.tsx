"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { Copy, Check, ChevronDown, RotateCcw } from "lucide-react"
import { LogoPicker } from "@/components/logo-picker"
import { ColorInput } from "@/components/color-input"
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

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const BADGE_PRESETS = [
  { label: "npm version", path: "/npm/react.svg", group: "Package" },
  { label: "npm downloads", path: "/npm/react/dm.svg", group: "Package" },
  { label: "npm license", path: "/npm/react/license.svg", group: "Package" },
  { label: "npm types", path: "/npm/react/types.svg", group: "Package" },
  { label: "PyPI version", path: "/pypi/django/v.svg", group: "Package" },
  { label: "Crates.io version", path: "/crates/serde/v.svg", group: "Package" },
  { label: "JSR score", path: "/jsr/@std/path/score.svg", group: "Package" },
  { label: "Docker pulls", path: "/docker/library/nginx/pulls.svg", group: "Package" },
  { label: "GitHub stars", path: "/github/vercel/next.js/stars.svg", group: "GitHub" },
  { label: "GitHub release", path: "/github/vercel/next.js/release.svg", group: "GitHub" },
  { label: "GitHub CI", path: "/github/vercel/next.js/ci.svg", group: "GitHub" },
  { label: "GitHub license", path: "/github/vercel/next.js/license.svg", group: "GitHub" },
  { label: "GitHub forks", path: "/github/vercel/next.js/forks.svg", group: "GitHub" },
  { label: "GitHub issues", path: "/github/vercel/next.js/issues.svg", group: "GitHub" },
  { label: "GitHub contributors", path: "/github/vercel/next.js/contributors.svg", group: "GitHub" },
  { label: "GitHub last commit", path: "/github/vercel/next.js/last-commit.svg", group: "GitHub" },
  { label: "GitHub downloads", path: "/github/vercel/next.js/downloads.svg", group: "GitHub" },
  { label: "Discord online", path: "/discord/1316199667142496307.svg", group: "Social" },
  { label: "Reddit subscribers", path: "/reddit/typescript.svg", group: "Social" },
  { label: "YouTube subscribers", path: "/youtube/UCsBjURrPoezykLs9EqgamOA/subscribers.svg", group: "Social" },
  { label: "Twitch status", path: "/twitch/shroud.svg", group: "Social" },
  { label: "Static badge", path: "/badge/build-passing-22c55e.svg", group: "Custom" },
] as const

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "branded"] as const
const SIZES = ["xs", "sm", "default", "lg"] as const
const MODES = ["dark", "light"] as const
const FONTS = ["inter", "geist", "geist-mono"] as const
const FORMATS = ["svg", "png"] as const

const THEMES = [
  "_none", "zinc", "slate", "stone", "neutral", "gray",
  "blue", "green", "rose", "orange", "amber",
  "violet", "purple", "red", "cyan", "emerald",
] as const

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface State {
  path: string
  variant: string
  size: string
  theme: string
  mode: string
  font: string
  format: string
  split: boolean
  logo: string
  logoColor: string
  label: string
  color: string
  labelColor: string
  gradient: string
  valueColor: string
  labelTextColor: string
  labelOpacity: string
}

const defaults: State = {
  path: "/npm/react.svg",
  variant: "default",
  size: "sm",
  theme: "_none",
  mode: "dark",
  font: "inter",
  format: "svg",
  split: false,
  logo: "",
  logoColor: "",
  label: "",
  color: "",
  labelColor: "",
  gradient: "",
  valueColor: "",
  labelTextColor: "",
  labelOpacity: "",
}

function buildUrl(s: State, baseUrl: string): string {
  if (!s.path.trim()) return ""

  // Ensure path has correct extension
  let path = s.path.trim()
  if (!path.startsWith("/")) path = "/" + path
  // Replace extension if format changed
  path = path.replace(/\.(svg|png)$/, `.${s.format}`)
  if (!/\.(svg|png)$/.test(path)) path += `.${s.format}`

  const p = new URLSearchParams()
  if (s.variant !== "default") p.set("variant", s.variant)
  if (s.size !== "sm") p.set("size", s.size)
  if (s.theme && s.theme !== "_none") p.set("theme", s.theme)
  if (s.mode !== "dark") p.set("mode", s.mode)
  if (s.font !== "inter") p.set("font", s.font)
  if (s.split) p.set("split", "true")
  if (s.logo) p.set("logo", s.logo)
  if (s.logoColor) p.set("logoColor", s.logoColor)
  if (s.label) p.set("label", s.label)
  if (s.color) p.set("color", s.color)
  if (s.labelColor) p.set("labelColor", s.labelColor)
  if (s.valueColor) p.set("valueColor", s.valueColor)
  if (s.labelTextColor) p.set("labelTextColor", s.labelTextColor)
  if (s.labelOpacity) p.set("labelOpacity", s.labelOpacity)
  if (s.gradient) p.set("gradient", s.gradient)

  const q = p.toString()
  return `${baseUrl}${path}${q ? `?${q}` : ""}`
}

// ---------------------------------------------------------------------------
// Copy format helpers
// ---------------------------------------------------------------------------

type CopyFormat = "markdown" | "html" | "url" | "rst"

function formatOutput(url: string, format: CopyFormat): string {
  switch (format) {
    case "markdown": return `![badge](${url})`
    case "html": return `<img alt="badge" src="${url}">`
    case "url": return url
    case "rst": return `.. image:: ${url}\n   :alt: badge`
  }
}

const COPY_FORMATS: { value: CopyFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "url", label: "URL" },
  { value: "rst", label: "RST" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeBuilder() {
  const [s, setS] = useState<State>(defaults)
  const [copied, setCopied] = useState(false)
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("markdown")
  const [showStyle, setShowStyle] = useState(false)
  const [baseUrl, setBaseUrl] = useState("https://shieldcn.dev")
  const [imgError, setImgError] = useState(false)
  const [imgKey, setImgKey] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  const set = useCallback(<K extends keyof State>(key: K, val: State[K]) => {
    setS(prev => ({ ...prev, [key]: val }))
    setImgError(false)
  }, [])

  // Debounced path update for the text input
  const [pathInput, setPathInput] = useState(defaults.path)
  const handlePathInput = useCallback((val: string) => {
    setPathInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setS(prev => ({ ...prev, path: val }))
      setImgError(false)
    }, 400)
  }, [])

  // Sync pathInput when path changes from presets
  useEffect(() => {
    setPathInput(s.path)
  }, [s.path])

  const url = useMemo(() => buildUrl(s, baseUrl), [s, baseUrl])
  const output = useMemo(() => formatOutput(url, copyFormat), [url, copyFormat])
  const isDefault = JSON.stringify(s) === JSON.stringify(defaults)

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

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
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold tracking-tight">Badge Builder</h3>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setS(defaults); setShowStyle(false) }}
            className="text-muted-foreground text-xs gap-1.5 h-7"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}
      </div>

      {/* ── Preview (always visible, top) ── */}
      <div
        className="flex items-center justify-center border-b border-border py-10 px-6 transition-colors"
        style={{ backgroundColor: s.mode === "light" ? "#f4f4f5" : "#0c0c0e" }}
      >
        {url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${url}-${imgKey}`}
            src={url}
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
            <Select onValueChange={v => set("path", v)}>
              <SelectTrigger className="h-7 w-auto gap-1 border-border/60 text-[11px] text-muted-foreground px-2.5">
                <span>More…</span>
              </SelectTrigger>
              <SelectContent>
                {Array.from(presetGroups.entries()).map(([group, presets]) => (
                  <div key={group}>
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{group}</div>
                    {presets.map(p => (
                      <SelectItem key={p.path} value={p.path} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
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
            <div className="grid grid-cols-3 gap-3">
              <Ctrl label="Theme" value={s.theme} onChange={v => set("theme", v)} options={[...THEMES]} displayMap={{ _none: "None" }} />
              <Ctrl label="Font" value={s.font} onChange={v => set("font", v)} options={[...FONTS]} />
              <Ctrl label="Format" value={s.format} onChange={v => set("format", v)} options={[...FORMATS]} displayMap={{ svg: "SVG", png: "PNG" }} />
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

        {/* ── Copy output ── */}
        {url && (
          <div className="space-y-3">
            {/* Format tabs */}
            <div className="flex items-center gap-1">
              {COPY_FORMATS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setCopyFormat(f.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    copyFormat === f.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Output + copy */}
            <div className="flex items-start gap-2">
              <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] font-mono break-all text-muted-foreground leading-relaxed min-h-[2.5rem]">
                {output}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-9">
                {copied
                  ? <><Check className="size-3.5 text-green-500" /> Copied</>
                  : <><Copy className="size-3.5" /> Copy</>
                }
              </Button>
            </div>
          </div>
        )}
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
