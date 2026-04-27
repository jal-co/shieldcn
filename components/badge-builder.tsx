"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
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
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { value: "npm", label: "npm version", placeholder: "react", inputLabel: "Package" },
  { value: "npm-downloads", label: "npm downloads", placeholder: "react", inputLabel: "Package" },
  { value: "github-stars", label: "GitHub stars", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "github-release", label: "GitHub release", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "github-ci", label: "CI status", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "github-license", label: "License", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "discord", label: "Discord online", placeholder: "1316199667142496307", inputLabel: "Server ID" },
  { value: "static", label: "Static badge", placeholder: "build-passing-green", inputLabel: "Text (label-message-color)" },
] as const

const VARIANTS = [
  { value: "default", label: "Default" },
  { value: "secondary", label: "Secondary" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "destructive", label: "Destructive" },
  { value: "branded", label: "Branded" },
] as const

const SIZES = [
  { value: "xs", label: "Extra small" },
  { value: "sm", label: "Small" },
  { value: "default", label: "Default" },
  { value: "lg", label: "Large" },
] as const

const THEMES = [
  { value: "_none", label: "None" },
  { value: "zinc", label: "Zinc" },
  { value: "slate", label: "Slate" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "rose", label: "Rose" },
  { value: "orange", label: "Orange" },
  { value: "violet", label: "Violet" },
  { value: "purple", label: "Purple" },
  { value: "cyan", label: "Cyan" },
] as const

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

interface State {
  provider: string
  input: string
  format: "png" | "svg"
  variant: string
  size: string
  theme: string
  mode: string
  split: boolean
  statusDot: "auto" | "true" | "false"
  font: string
  logo: string
  logoColor: string
  label: string
  color: string
  gradient: string
  valueColor: string
  labelTextColor: string
  labelOpacity: string
  leftBg: string
  rightBg: string
}

function buildUrl(s: State, baseUrl: string): string {
  if (!s.input.trim()) return ""

  const ext = s.format === "svg" ? ".svg" : ".png"
  let path = ""
  switch (s.provider) {
    case "npm":            path = `/npm/${s.input}${ext}`; break
    case "npm-downloads":  path = `/npm/${s.input}/downloads${ext}`; break
    case "github-stars":   path = `/github/${s.input}/stars${ext}`; break
    case "github-release": path = `/github/${s.input}/release${ext}`; break
    case "github-ci":      path = `/github/${s.input}/ci${ext}`; break
    case "github-license": path = `/github/${s.input}/license${ext}`; break
    case "discord":        path = `/discord/${s.input}${ext}`; break
    case "static":         path = `/badge/${s.input}${ext}`; break
  }

  const p = new URLSearchParams()
  if (s.variant !== "default") p.set("variant", s.variant)
  if (s.size !== "sm") p.set("size", s.size)
  if (s.theme && s.theme !== "_none") p.set("theme", s.theme)
  if (s.mode !== "dark") p.set("mode", s.mode)
  if (s.split) p.set("split", "true")
  if (s.statusDot === "true") p.set("statusDot", "true")
  if (s.statusDot === "false") p.set("statusDot", "false")
  if (s.font && s.font !== "inter") p.set("font", s.font)
  if (s.logo) p.set("logo", s.logo)
  if (s.logoColor) p.set("logoColor", s.logoColor)
  if (s.label) p.set("label", s.label)
  if (s.split) {
    if (s.leftBg) p.set("labelColor", s.leftBg)
    if (s.rightBg) p.set("color", s.rightBg)
  } else {
    if (s.color) p.set("color", s.color)
  }
  if (s.valueColor) p.set("valueColor", s.valueColor)
  if (s.labelTextColor) p.set("labelTextColor", s.labelTextColor)
  if (s.labelOpacity) p.set("labelOpacity", s.labelOpacity)
  if (s.gradient) p.set("gradient", s.gradient)

  const q = p.toString()
  return `${baseUrl}${path}${q ? `?${q}` : ""}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const defaults: State = {
  provider: "npm",
  input: "react",
  format: "png",
  variant: "default",
  size: "sm",
  theme: "_none",
  mode: "dark",
  split: false,
  statusDot: "auto",
  font: "inter",
  logo: "",
  logoColor: "",
  label: "",
  color: "",
  gradient: "",
  valueColor: "",
  labelTextColor: "",
  labelOpacity: "",
  leftBg: "",
  rightBg: "",
}

import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox"

export function BadgeBuilder() {
  const [s, setS] = useState<State>(defaults)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [copied, setCopied] = useState(false)
  const [baseUrl, setBaseUrl] = useState("https://shieldcn.dev")

  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  const set = useCallback(<K extends keyof State>(key: K, val: State[K]) => {
    setS(prev => ({ ...prev, [key]: val }))
  }, [])

  const url = useMemo(() => buildUrl(s, baseUrl), [s, baseUrl])
  const markdown = url ? `![badge](${url})` : ""

  const currentProvider = PROVIDERS.find(p => p.value === s.provider)
  const isCI = s.provider === "github-ci"

  const handleCopy = useCallback(() => {
    if (!markdown) return
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [markdown])

  const sizeHeight = { xs: "h-6", sm: "h-8", default: "h-9", lg: "h-10" }[s.size] || "h-8"
  const isDefault = JSON.stringify(s) === JSON.stringify(defaults)

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Badge Builder</h3>
        {!isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setS(defaults); setShowAdvanced(false) }}
            className="text-muted-foreground text-xs gap-1.5"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}
      </div>

      {/* ── Row 1: What badge? ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Badge type">
          <Select value={s.provider} onValueChange={v => {
            const p = PROVIDERS.find(x => x.value === v)
            set("provider", v)
            if (p) set("input", p.placeholder)
          }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label={currentProvider?.inputLabel || "Input"}>
          <Input value={s.input} onChange={e => set("input", e.target.value)} placeholder={currentProvider?.placeholder} />
        </Field>
      </div>

      {/* ── Row 2: Style ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Variant">
          <Select value={s.variant} onValueChange={v => set("variant", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VARIANTS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Size">
          <Select value={s.size} onValueChange={v => set("size", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SIZES.map(sz => <SelectItem key={sz.value} value={sz.value}>{sz.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Theme">
          <Select value={s.theme} onValueChange={v => set("theme", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {THEMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Mode">
          <Select value={s.mode} onValueChange={v => set("mode", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* ── Row 3: Icon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Icon">
          <div className="flex gap-2">
            <div className="flex-1">
              <LogoPicker value={s.logo.startsWith("data:") ? "" : s.logo} onChange={v => set("logo", v)} />
            </div>
            <SvgIconUpload value={s.logo} onChange={v => set("logo", v)} className="shrink-0" />
          </div>
        </Field>

        <Field label="Font">
          <Select value={s.font} onValueChange={v => set("font", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inter">Inter</SelectItem>
              <SelectItem value="geist">Geist</SelectItem>
              <SelectItem value="geist-mono">Geist Mono</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* ── Row 4: Format + Gradient ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Format">
          <Select value={s.format} onValueChange={v => set("format", v as "png" | "svg")}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="svg">SVG</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Gradient">
          <Input value={s.gradient} onChange={e => set("gradient", e.target.value)} placeholder="ff6b6b,4ecdc4" />
          <p className="text-[10px] text-muted-foreground">Comma-separated hex colors, optional angle last (e.g. ff6b6b,4ecdc4,135)</p>
        </Field>
      </div>

      {/* ── Toggles ── */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <ShadcnCheckbox checked={s.split} onCheckedChange={v => set("split", v === true)} />
          <span className="text-sm">Split mode</span>
        </label>
        {isCI && (
          <label className="flex items-center gap-2 cursor-pointer">
            <ShadcnCheckbox
              checked={s.statusDot === "true"}
              onCheckedChange={v => set("statusDot", v ? "true" : "false")}
            />
            <span className="text-sm">Status dot</span>
          </label>
        )}
      </div>

      {/* ── Split mode colors ── */}
      {s.split && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <Field label="Left background">
            <ColorInput value={s.leftBg} onChange={v => set("leftBg", v)} placeholder="auto" />
          </Field>
          <Field label="Right background">
            <ColorInput value={s.rightBg} onChange={v => set("rightBg", v)} placeholder="auto" />
          </Field>
          <Field label="Label text">
            <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" />
          </Field>
        </div>
      )}

      {/* ── Advanced ── */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")} />
        Advanced options
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 rounded-lg border border-border/50 bg-muted/10 p-4">
          <Field label="Background color" color={s.color}>
            <ColorInput value={s.color} onChange={v => set("color", v)} placeholder="auto" />
          </Field>
          <Field label="Value text color" color={s.valueColor}>
            <ColorInput value={s.valueColor} onChange={v => set("valueColor", v)} placeholder="auto" />
          </Field>
          <Field label="Label text color" color={s.labelTextColor}>
            <ColorInput value={s.labelTextColor} onChange={v => set("labelTextColor", v)} placeholder="auto" />
          </Field>
          <Field label="Icon color" color={s.logoColor}>
            <ColorInput value={s.logoColor} onChange={v => set("logoColor", v)} placeholder="auto" />
          </Field>
          <Field label="Label opacity">
            <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" />
          </Field>
          {!s.split && (
            <Field label="Custom label">
              <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" />
            </Field>
          )}
        </div>
      )}

      <Separator />

      {/* ── Preview + Output ── */}
      {url && (
        <div className="space-y-4">
          <div className="flex items-center justify-center rounded-lg border border-border bg-muted/20 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="badge preview" className={sizeHeight} />
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs font-mono break-all text-muted-foreground">
              {markdown}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
              {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, color, children }: { label: string; color?: string; children: React.ReactNode }) {
  const hasColor = color && /^#?[0-9a-fA-F]{3,8}$/.test(color.replace(/^#/, ""))
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {hasColor && (
          <span
            className="inline-block size-2.5 rounded-full border border-border/60 shrink-0"
            style={{ backgroundColor: color.startsWith("#") ? color : `#${color}` }}
          />
        )}
        {label}
      </Label>
      {children}
    </div>
  )
}
