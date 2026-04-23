"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Copy, Check } from "lucide-react"
import { LogoPicker } from "@/components/logo-picker"
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

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { value: "npm", label: "npm version", placeholder: "react", inputLabel: "Package name" },
  { value: "npm-downloads", label: "npm downloads", placeholder: "react", inputLabel: "Package name" },
  { value: "github-stars", label: "GitHub stars", placeholder: "vercel/next.js", inputLabel: "owner/repo" },
  { value: "github-release", label: "GitHub release", placeholder: "vercel/next.js", inputLabel: "owner/repo" },
  { value: "github-ci", label: "CI status", placeholder: "vercel/next.js", inputLabel: "owner/repo" },
  { value: "github-license", label: "License", placeholder: "vercel/next.js", inputLabel: "owner/repo" },
  { value: "discord", label: "Discord", placeholder: "1316199667142496307", inputLabel: "Server ID" },
  { value: "static", label: "Static badge", placeholder: "build-passing-green", inputLabel: "label-message-color" },
] as const

const VARIANTS = [
  { value: "default", label: "default" },
  { value: "secondary", label: "secondary" },
  { value: "outline", label: "outline" },
  { value: "ghost", label: "ghost" },
  { value: "destructive", label: "destructive" },
] as const

const SIZES = [
  { value: "xs", label: "xs (24px)" },
  { value: "sm", label: "sm (32px)" },
  { value: "default", label: "default (36px)" },
  { value: "lg", label: "lg (40px)" },
] as const

const THEMES = [
  { value: "_none", label: "none (variant colors)" },
  { value: "zinc", label: "zinc" },
  { value: "slate", label: "slate" },
  { value: "blue", label: "blue" },
  { value: "green", label: "green" },
  { value: "rose", label: "rose" },
  { value: "orange", label: "orange" },
  { value: "violet", label: "violet" },
  { value: "purple", label: "purple" },
  { value: "cyan", label: "cyan" },
] as const

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

interface State {
  provider: string
  input: string
  variant: string
  size: string
  theme: string
  mode: string
  // Flags
  split: boolean
  statusDot: "auto" | "true" | "false"
  // Icons
  logo: string
  logoColor: string
  // Text overrides
  label: string
  // Color overrides
  color: string
  valueColor: string
  labelTextColor: string
  labelOpacity: string
  // Split colors
  leftBg: string
  rightBg: string
}

function buildUrl(s: State, baseUrl: string): string {
  if (!s.input.trim()) return ""

  let path = ""
  switch (s.provider) {
    case "npm":            path = `/npm/${s.input}.svg`; break
    case "npm-downloads":  path = `/npm/${s.input}/downloads.svg`; break
    case "github-stars":   path = `/github/${s.input}/stars.svg`; break
    case "github-release": path = `/github/${s.input}/release.svg`; break
    case "github-ci":      path = `/github/${s.input}/ci.svg`; break
    case "github-license": path = `/github/${s.input}/license.svg`; break
    case "discord":        path = `/discord/${s.input}.svg`; break
    case "static":         path = `/badge/${s.input}.svg`; break
  }

  const p = new URLSearchParams()
  if (s.variant !== "default") p.set("variant", s.variant)
  if (s.size !== "sm") p.set("size", s.size)
  if (s.theme && s.theme !== "_none") p.set("theme", s.theme)
  if (s.mode !== "dark") p.set("mode", s.mode)
  if (s.split) p.set("split", "true")
  if (s.statusDot === "true") p.set("statusDot", "true")
  if (s.statusDot === "false") p.set("statusDot", "false")
  if (s.logo) p.set("logo", s.logo)
  if (s.logoColor) p.set("logoColor", s.logoColor)
  if (s.label) p.set("label", s.label)
  if (s.color) p.set("color", s.color)
  if (s.valueColor) p.set("valueColor", s.valueColor)
  if (s.labelTextColor) p.set("labelTextColor", s.labelTextColor)
  if (s.labelOpacity) p.set("labelOpacity", s.labelOpacity)
  if (s.split && s.leftBg) p.set("labelColor", s.leftBg)
  if (s.split && s.rightBg) p.set("color", s.rightBg)

  const q = p.toString()
  return `${baseUrl}${path}${q ? `?${q}` : ""}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const defaults: State = {
  provider: "npm",
  input: "react",
  variant: "default",
  size: "sm",
  theme: "_none",
  mode: "dark",
  split: false,
  statusDot: "auto",
  logo: "",
  logoColor: "",
  label: "",
  color: "",
  valueColor: "",
  labelTextColor: "",
  labelOpacity: "",
  leftBg: "",
  rightBg: "",
}

export function BadgeBuilder() {
  const [s, setS] = useState<State>(defaults)
  const [showCustomize, setShowCustomize] = useState(false)
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
  const isStatic = s.provider === "static"

  const handleCopy = useCallback(() => {
    if (!markdown) return
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [markdown])

  const sizeHeight = { xs: "h-6", sm: "h-8", default: "h-9", lg: "h-10" }[s.size] || "h-8"

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <h3 className="text-lg font-semibold tracking-tight">Badge Builder</h3>

      {/* ── Tier 1: Always visible ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* ── Tier 2: Logo, theme, mode, flags ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Field label="Logo" hint="slug or lucide:name">
          <LogoPicker value={s.logo} onChange={v => set("logo", v)} />
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
              <SelectItem value="dark">dark</SelectItem>
              <SelectItem value="light">light</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Logo color" hint="hex">
          <Input value={s.logoColor} onChange={e => set("logoColor", e.target.value)} placeholder="auto" />
        </Field>

        <Field label="Flags">
          <div className="flex flex-col gap-1.5 pt-1">
            <Checkbox label="split" checked={s.split} onChange={v => set("split", v)} />
            {isCI && (
              <div className="flex items-center gap-2">
                <Checkbox
                  label="statusDot"
                  checked={s.statusDot !== "false"}
                  onChange={v => set("statusDot", v ? "auto" : "false")}
                />
              </div>
            )}
          </div>
        </Field>
      </div>

      {/* ── Split mode fields ── */}
      {s.split && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-md border border-border/60 bg-muted/20 p-4">
          <p className="col-span-full text-xs font-medium uppercase tracking-wider text-muted-foreground">Split colors</p>
          <Field label="Left background" hint="hex without #">
            <Input value={s.leftBg} onChange={e => set("leftBg", e.target.value)} placeholder="auto (secondary)" />
          </Field>
          <Field label="Right background" hint="hex without #">
            <Input value={s.rightBg} onChange={e => set("rightBg", e.target.value)} placeholder="auto (status/theme)" />
          </Field>
          <Field label="Label override">
            <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="left side text" />
          </Field>
        </div>
      )}

      {/* ── Tier 3: Customize (expandable) ── */}
      <button
        onClick={() => setShowCustomize(!showCustomize)}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
      >
        <span className="text-xs">{showCustomize ? "−" : "+"}</span>
        {showCustomize ? "Hide" : "Show"} color overrides
      </button>

      {showCustomize && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-md border border-border/60 bg-muted/20 p-4">
          <Field label="Badge bg color" hint="hex without #">
            <Input value={s.color} onChange={e => set("color", e.target.value)} placeholder="auto" />
          </Field>
          <Field label="Value text color" hint="hex without #">
            <Input value={s.valueColor} onChange={e => set("valueColor", e.target.value)} placeholder="auto" />
          </Field>
          <Field label="Label text color" hint="hex without #">
            <Input value={s.labelTextColor} onChange={e => set("labelTextColor", e.target.value)} placeholder="auto" />
          </Field>
          <Field label="Label opacity" hint="0–1">
            <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" />
          </Field>
          {!s.split && (
            <Field label="Label override">
              <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" />
            </Field>
          )}
        </div>
      )}

      {/* ── Preview ── */}
      {url && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="badge preview" className={sizeHeight} />
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono break-all">
              {markdown}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Reset ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
        Logos: any{" "}
        <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Simple Icons</a>{" "}
        slug,{" "}
        <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Lucide</a>{" "}
        with <code className="text-[11px] bg-muted px-1 rounded">lucide:name</code>, or{" "}
        <a href="https://react-icons.github.io/react-icons/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">React Icons</a>{" "}
        with <code className="text-[11px] bg-muted px-1 rounded">ri:ComponentName</code>.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setS(defaults); setShowCustomize(false) }}
          className="text-muted-foreground"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1">
        <Label className="text-xs shrink-0">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground truncate">({hint})</span>}
      </div>
      {children}
    </div>
  )
}

import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox"

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <ShadcnCheckbox checked={checked} onCheckedChange={v => onChange(v === true)} />
      <span className="text-muted-foreground text-xs font-mono">{label}</span>
    </label>
  )
}
