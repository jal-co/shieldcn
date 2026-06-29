/**
 * shieldcn
 * components/header-builder
 *
 * Interactive repository-header generator. Pick a background preset, logo,
 * title/subtitle, size, theme, and alignment; preview live; copy the URL as
 * Markdown / HTML / plain URL. Everything resolves to a /header/{preset}.svg
 * image served from the server.
 */

"use client"

import { useState, useCallback, useMemo, useSyncExternalStore } from "react"
import { Copy, Check, Shuffle } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox"
import { LogoPicker } from "@/components/logo-picker"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { ColorSwatch } from "@/components/color-input"
import { cn } from "@/lib/utils"
import {
  HEADER_DEFAULTS,
  HEADER_PRESETS,
  HEADER_PRESET_LABELS,
  HEADER_SIZES,
  HEADER_SIZE_LABELS,
  HEADER_FONTS,
  HEADER_THEMES,
  buildHeaderUrl,
  randomUnsplashHeader,
  type HeaderState,
} from "@/lib/header-builder-shared"

type CopyFormat = "markdown" | "html" | "url"

function formatOutput(url: string, format: CopyFormat, alt: string): string {
  switch (format) {
    case "markdown":
      return `![${alt}](${url})`
    case "html":
      return `<img alt="${alt}" src="${url}">`
    case "url":
      return url
  }
}

const COPY_FORMATS: { value: CopyFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "url", label: "URL" },
]

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-xs text-muted-foreground">{children}</Label>
}

export function HeaderBuilder() {
  const [s, setS] = useState<HeaderState>(HEADER_DEFAULTS)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("markdown")
  const { resolvedTheme } = useTheme()

  // Read the origin on the client without a setState-in-effect (hydration-safe).
  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )
  // Header mode follows the site theme — derived during render, not stored.
  const mode: "dark" | "light" = resolvedTheme === "light" ? "light" : "dark"

  const set = useCallback(<K extends keyof HeaderState>(key: K, value: HeaderState[K]) => {
    setS((prev) => ({ ...prev, [key]: value }))
  }, [])

  const url = useMemo(() => buildHeaderUrl({ ...s, mode }, baseUrl), [s, mode, baseUrl])
  const altText = s.title || "repository header"
  const output = useMemo(() => formatOutput(url, copyFormat, altText), [url, copyFormat, altText])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        setCopyError(true)
        setTimeout(() => setCopyError(false), 2000)
      },
    )
  }, [output])

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* ─── Preview + output (right on desktop, first on mobile) ─── */}
      <div className="order-1 flex flex-col gap-4 lg:order-2">
        <div
          className="flex min-h-[300px] flex-1 items-center justify-center rounded-xl border border-border p-6 transition-colors md:p-10"
          style={{
            backgroundColor: mode === "light" ? "#f4f4f5" : "#0c0c0e",
            backgroundImage:
              mode === "light"
                ? "radial-gradient(circle, #d4d4d8 1px, transparent 1px)"
                : "radial-gradient(circle, #27272a 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={url}
            src={url}
            alt="header preview"
            className="w-full max-w-[760px] select-none"
            draggable={false}
          />
        </div>

        {/* Copy output */}
        <div className="space-y-3">
          <ToggleGroup
            type="single"
            value={copyFormat}
            onValueChange={(v) => v && setCopyFormat(v as CopyFormat)}
            variant="outline"
            size="sm"
            className="w-full max-w-md"
          >
            {COPY_FORMATS.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value} className="flex-1 text-xs">
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] font-mono break-all text-muted-foreground leading-relaxed min-h-[2.5rem]">
              {output}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-9">
              {copied ? (
                <>
                  <Check className="size-3.5 text-success" /> Copied
                </>
              ) : copyError ? (
                <>
                  <Copy className="size-3.5 text-destructive" /> Failed
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Controls sidebar (left on desktop) ─── */}
      <div className="order-2 lg:order-1 space-y-5 rounded-xl border border-border bg-card p-5">
        {/* Background preset */}
        <div className="space-y-2">
          <FieldLabel>Background</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {HEADER_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => set("preset", p)}
                aria-pressed={s.preset === p}
                className={cn(
                  "rounded-lg px-1 py-2 text-xs transition-colors",
                  s.preset === p
                    ? "bg-primary/10 ring-1 ring-primary text-foreground"
                    : "hover:bg-muted/60 text-muted-foreground",
                )}
              >
                {HEADER_PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Title + subtitle */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel>Title</FieldLabel>
            <Input
              value={s.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Your Project"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Subtitle</FieldLabel>
            <Input
              value={s.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="A short tagline"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <FieldLabel>Logo</FieldLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <LogoPicker
                value={/^(data:|https?:\/\/)/.test(s.logo) ? "" : s.logo}
                onChange={(v) => set("logo", v)}
              />
            </div>
            <ColorSwatch label="Logo color" value={s.logoColor} onChange={(v) => set("logoColor", v)} />
          </div>
          <SvgIconUpload allowRaster value={s.logo} onChange={(v) => set("logo", v)} className="w-full" />
        </div>

        {/* Background image */}
        <div className="space-y-2">
          <FieldLabel>Background image</FieldLabel>
          <div className="flex gap-2">
            <Input
              value={s.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="Unsplash or image URL"
              className="text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label="Random Unsplash photo"
              title="Random Unsplash photo"
              onClick={() => set("image", randomUnsplashHeader(s.image))}
            >
              <Shuffle className="size-3.5" />
            </Button>
          </div>
          {s.image ? (
            <div className="space-y-1.5">
              <FieldLabel>Overlay (0–1)</FieldLabel>
              <Input value={s.overlay} onChange={(e) => set("overlay", e.target.value)} placeholder="0.45" className="h-9" />
            </div>
          ) : null}
        </div>

        {/* Selects */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FieldLabel>Size</FieldLabel>
            <Select value={s.size} onValueChange={(v) => set("size", v as HeaderState["size"])}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADER_SIZES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {HEADER_SIZE_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Theme</FieldLabel>
            <Select value={s.theme || "_none"} onValueChange={(v) => set("theme", v === "_none" ? "" : v)}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {HEADER_THEMES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Align</FieldLabel>
            <Select value={s.align} onValueChange={(v) => set("align", v as HeaderState["align"])}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="left">Left</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Font</FieldLabel>
            <Select value={s.font} onValueChange={(v) => set("font", v)}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADER_FONTS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <ShadcnCheckbox checked={s.border} onCheckedChange={(v) => set("border", v === true)} />
            <span className="text-xs">Border</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <ShadcnCheckbox checked={s.watermark} onCheckedChange={(v) => set("watermark", v === true)} />
            <span className="text-xs">Watermark</span>
          </label>
        </div>
      </div>
    </div>
  )
}
