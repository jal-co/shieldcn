/**
 * shieldcn
 * components/sponsors-builder
 *
 * Interactive sponsors-image generator. Pick a GitHub login, arrange tiers
 * (special / backers), choose a background preset, theme, avatar size, and
 * toggles; preview live; copy the URL as Markdown / HTML / plain URL.
 * Everything resolves to a /sponsors/{login}.svg image served from the server.
 */

"use client"

import { useState, useCallback, useMemo, useSyncExternalStore } from "react"
import { Shuffle, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
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
import { CopyOutputSection } from "@/components/copy-output-section"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { formatImageOutput, IMAGE_COPY_FORMATS, type ImageCopyFormat } from "@/lib/builder-output"
import { cn } from "@/lib/utils"
import {
  SPONSORS_DEFAULTS,
  SPONSORS_PRESETS,
  SPONSORS_PRESET_LABELS,
  SPONSORS_SIZES,
  SPONSORS_SIZE_LABELS,
  SPONSORS_FONTS,
  SPONSORS_THEMES,
  buildSponsorsUrl,
  randomUnsplashHeader,
  type SponsorsState,
} from "@/lib/sponsors-builder-shared"

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{children}</Label>
}

type Align = "left" | "center" | "right"
function AlignField({ label, value, onChange }: { label: string; value: Align; onChange: (v: Align) => void }) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as Align)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <ToggleGroupItem value="left" aria-label="Align left" className="flex-1"><AlignLeft className="size-3.5" /></ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Align center" className="flex-1"><AlignCenter className="size-3.5" /></ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Align right" className="flex-1"><AlignRight className="size-3.5" /></ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export function SponsorsBuilder() {
  const [s, setS] = useState<SponsorsState>(SPONSORS_DEFAULTS)
  const [copyFormat, setCopyFormat] = useState<ImageCopyFormat>("markdown")
  const { copied, copyError, copy } = useCopyToClipboard()
  const { resolvedTheme } = useTheme()

  // Read the origin on the client without a setState-in-effect (hydration-safe).
  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )
  // Sponsors card mode follows the site theme — derived during render.
  const mode: "dark" | "light" = resolvedTheme === "light" ? "light" : "dark"

  const set = useCallback(<K extends keyof SponsorsState>(key: K, value: SponsorsState[K]) => {
    setS((prev) => ({ ...prev, [key]: value }))
  }, [])

  const url = useMemo(() => buildSponsorsUrl({ ...s, mode }, baseUrl), [s, mode, baseUrl])
  const altText = `${s.login || "shadcn"} sponsors`
  const output = useMemo(() => formatImageOutput(url, copyFormat, altText), [url, copyFormat, altText])

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
            alt="sponsors preview"
            className="w-full max-w-[760px] select-none"
            draggable={false}
          />
        </div>

        {/* Copy output */}
        <CopyOutputSection
          formats={IMAGE_COPY_FORMATS}
          format={copyFormat}
          onFormatChange={setCopyFormat}
          output={output}
          copied={copied}
          copyError={copyError}
          onCopy={() => copy(output)}
          toggleClassName="max-w-md"
        />
      </div>

      {/* ─── Controls sidebar (left on desktop) ─── */}
      <div className="order-2 lg:order-1 space-y-5 rounded-xl border border-border bg-card p-5">
        {/* Login + title */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sponsors-login">GitHub login (user or org)</FieldLabel>
            <Input
              id="sponsors-login"
              value={s.login}
              onChange={(e) => set("login", e.target.value)}
              placeholder="shadcn"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sponsors-title">Title (empty to hide)</FieldLabel>
            <Input
              id="sponsors-title"
              value={s.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Sponsors"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Tiers */}
        <div className="space-y-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <ShadcnCheckbox
              checked={s.featured}
              onCheckedChange={(v) => set("featured", v === true)}
              disabled={!!s.special.trim()}
              className="mt-0.5"
            />
            <span className="text-xs leading-snug">
              Auto featured tier
              <span className="block text-muted-foreground">
                Uses your GitHub “Featured sponsors” as the top row. Overridden by Special sponsors below.
              </span>
            </span>
          </label>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sponsors-special">Special sponsors (comma-separated logins)</FieldLabel>
            <Input
              id="sponsors-special"
              value={s.special}
              onChange={(e) => set("special", e.target.value)}
              placeholder={s.featured ? "auto from Featured sponsors" : "vercel, clerk"}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sponsors-backers">Backers (comma-separated logins)</FieldLabel>
            <Input
              id="sponsors-backers"
              value={s.backers}
              onChange={(e) => set("backers", e.target.value)}
              placeholder="octocat"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Background preset */}
        <div className="space-y-2">
          <FieldLabel>Background</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {SPONSORS_PRESETS.map((p) => (
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
                {SPONSORS_PRESET_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Background image */}
        <div className="space-y-2">
          <FieldLabel htmlFor="sponsors-bg-image">Background image</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="sponsors-bg-image"
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
              <FieldLabel htmlFor="sponsors-overlay">Overlay (0–1)</FieldLabel>
              <Input id="sponsors-overlay" value={s.overlay} onChange={(e) => set("overlay", e.target.value)} placeholder="0.45" className="h-9" />
            </div>
          ) : null}
        </div>

        {/* Selects */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FieldLabel>Avatar size</FieldLabel>
            <Select value={s.size} onValueChange={(v) => set("size", v as SponsorsState["size"])}>
              <SelectTrigger aria-label="Avatar size" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPONSORS_SIZES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {SPONSORS_SIZE_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Theme</FieldLabel>
            <Select value={s.theme || "_none"} onValueChange={(v) => set("theme", v === "_none" ? "" : v)}>
              <SelectTrigger aria-label="Sponsors theme" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {SPONSORS_THEMES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="sponsors-limit">Limit</FieldLabel>
            <Input
              id="sponsors-limit"
              value={s.limit}
              onChange={(e) => set("limit", e.target.value)}
              placeholder="60"
              inputMode="numeric"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Font</FieldLabel>
            <Select value={s.font} onValueChange={(v) => set("font", v)}>
              <SelectTrigger aria-label="Sponsors font" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPONSORS_FONTS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alignment */}
        <div className="grid grid-cols-2 gap-3">
          <AlignField label="Title alignment" value={s.titleAlign} onChange={(v) => set("titleAlign", v)} />
          <AlignField label="Avatar alignment" value={s.avatarAlign} onChange={(v) => set("avatarAlign", v)} />
        </div>

        {/* Tier separator + visibility */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <FieldLabel>Tier separator</FieldLabel>
            <Select value={s.separator} onValueChange={(v) => set("separator", v as SponsorsState["separator"])}>
              <SelectTrigger aria-label="Tier separator" className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="label">Text labels</SelectItem>
                <SelectItem value="line">Line only</SelectItem>
                <SelectItem value="none">None (spacing)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Show tiers</FieldLabel>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <ShadcnCheckbox checked={s.tierFeatured} onCheckedChange={(v) => set("tierFeatured", v === true)} />
                <span className="text-xs">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <ShadcnCheckbox checked={s.tierSponsors} onCheckedChange={(v) => set("tierSponsors", v === true)} />
                <span className="text-xs">Sponsors</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <ShadcnCheckbox checked={s.tierBackers} onCheckedChange={(v) => set("tierBackers", v === true)} />
                <span className="text-xs">Backers</span>
              </label>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <ShadcnCheckbox checked={s.names} onCheckedChange={(v) => set("names", v === true)} />
            <span className="text-xs">Names</span>
          </label>
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
