"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Copy, Check, ExternalLink } from "lucide-react"
import { useBadgeMode } from "@/lib/use-badge-mode"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { SvgIconUpload } from "@/components/svg-icon-upload"

interface BadgeModalProps {
  title: string
  subtitle: string
  badgePath: string
  description?: string
  docsHref?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "branded"]
const SIZES = ["xs", "sm", "default", "lg"]
const THEMES = ["_none", "zinc", "slate", "blue", "green", "rose", "orange", "violet", "purple", "cyan", "emerald"]
const MODES = ["dark", "light"]

type OutputFormat = "markdown" | "url" | "html" | "rst" | "asciidoc"

function withStyleParams(
  badgePath: string,
  opts: {
    variant: string
    size: string
    theme: string
    mode: string
    color: string
    labelColor: string
    valueColor: string
    labelTextColor: string
    logo: string
    logoColor: string
    label: string
    split: boolean
  }
) {
  const url = new URL(badgePath, "https://shieldcn.dev")
  if (opts.variant !== "default") url.searchParams.set("variant", opts.variant)
  if (opts.size !== "sm") url.searchParams.set("size", opts.size)
  if (opts.theme !== "_none") url.searchParams.set("theme", opts.theme)
  if (opts.mode !== "dark") url.searchParams.set("mode", opts.mode)
  if (opts.color) url.searchParams.set("color", opts.color)
  else url.searchParams.delete("color")
  if (opts.labelColor) url.searchParams.set("labelColor", opts.labelColor)
  else url.searchParams.delete("labelColor")
  if (opts.valueColor) url.searchParams.set("valueColor", opts.valueColor)
  else url.searchParams.delete("valueColor")
  if (opts.labelTextColor) url.searchParams.set("labelTextColor", opts.labelTextColor)
  else url.searchParams.delete("labelTextColor")
  if (opts.logo) url.searchParams.set("logo", opts.logo)
  if (opts.logoColor) url.searchParams.set("logoColor", opts.logoColor)
  else if (opts.logo) url.searchParams.delete("logoColor")
  if (opts.label) url.searchParams.set("label", opts.label)
  else url.searchParams.delete("label")
  if (opts.split) url.searchParams.set("split", "true")
  else if (!url.searchParams.has("split")) url.searchParams.delete("split")
  return `${url.pathname}${url.search}`
}

export function BadgeModal({
  title,
  subtitle,
  badgePath,
  description,
  docsHref,
  open,
  onOpenChange,
}: BadgeModalProps) {
  const initialParams = useMemo(() => new URL(badgePath, "https://shieldcn.dev").searchParams, [badgePath])
  const [baseUrl, setBaseUrl] = useState("https://shieldcn.dev")
  const [variant, setVariant] = useState(initialParams.get("variant") ?? "default")
  const [size, setSize] = useState(initialParams.get("size") ?? "sm")
  const [theme, setTheme] = useState(initialParams.get("theme") ?? "_none")
  const { mode: siteMode } = useBadgeMode()
  const [mode, setMode] = useState(initialParams.get("mode") || siteMode)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown")
  const [copied, setCopied] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [color, setColor] = useState("")
  const [labelColor, setLabelColor] = useState("")
  const [valueColor, setValueColor] = useState("")
  const [labelTextColor, setLabelTextColor] = useState("")
  const [logo, setLogo] = useState("")
  const [logoColor, setLogoColor] = useState("")
  const [label, setLabel] = useState("")
  const [split, setSplit] = useState(false)

  useEffect(() => {
    setBaseUrl(window.location.origin)
  }, [])

  useEffect(() => {
    setVariant(initialParams.get("variant") ?? "default")
    setSize(initialParams.get("size") ?? "sm")
    setTheme(initialParams.get("theme") ?? "_none")
    setMode(initialParams.get("mode") || siteMode)
  }, [initialParams, open, siteMode])

  const resolvedBadgePath = useMemo(
    () => withStyleParams(badgePath, {
      variant,
      size,
      theme,
      mode,
      color,
      labelColor,
      valueColor,
      labelTextColor,
      logo,
      logoColor,
      label,
      split,
    }),
    [badgePath, variant, size, theme, mode, color, labelColor, valueColor, labelTextColor, logo, logoColor, label, split]
  )

  const fullUrl = `${baseUrl}${resolvedBadgePath}`

  const formattedOutput = useMemo(() => {
    switch (outputFormat) {
      case "markdown":
        return `![${title}](${fullUrl})`
      case "url":
        return fullUrl
      case "html":
        return `<img alt="${title}" src="${fullUrl}">`
      case "rst":
        return `.. image:: ${fullUrl}\n   :alt: ${title}`
      case "asciidoc":
        return `image:${fullUrl}[${title}]`
    }
  }, [outputFormat, fullUrl, title])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(formattedOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [formattedOutput])

  const sizeHeight = { xs: "h-6", sm: "h-8", default: "h-9", lg: "h-10" }[size] || "h-8"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? `Example badge from ${subtitle}. Tweak the styling, then copy the snippet you want to use.`}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex justify-center overflow-hidden rounded-lg py-8"
          style={{
            backgroundColor: mode === "light" ? "#f4f4f5" : "#101012",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={resolvedBadgePath} src={resolvedBadgePath} alt={title} className={sizeHeight} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Control label="Variant" value={variant} onValueChange={setVariant} options={VARIANTS} />
          <Control label="Size" value={size} onValueChange={setSize} options={SIZES} />
          <Control label="Theme" value={theme} onValueChange={setTheme} options={THEMES} />
          <Control label="Mode" value={mode} onValueChange={setMode} options={MODES} />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showMore ? "Hide advanced props" : "Edit more"}
          </button>

          {showMore ? (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-3">
              <TextControl label="Badge bg" value={color} onChange={setColor} placeholder="hex" />
              <TextControl label="Label bg (split only)" value={labelColor} onChange={setLabelColor} placeholder="hex" />
              <TextControl label="Value text" value={valueColor} onChange={setValueColor} placeholder="hex" />
              <TextControl label="Label text" value={labelTextColor} onChange={setLabelTextColor} placeholder="hex" />
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Logo</Label>
                <Input
                  value={logo.startsWith("data:") ? "" : logo}
                  onChange={(e) => setLogo(e.target.value)}
                  placeholder="slug or ri:Name"
                  className="h-8 text-xs"
                />
                <SvgIconUpload value={logo} onChange={setLogo} className="w-full" />
              </div>
              <TextControl label="Logo color" value={logoColor} onChange={setLogoColor} placeholder="hex" />
              <TextControl label="Label override" value={label} onChange={setLabel} placeholder="text" />
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Split</Label>
                <button
                  type="button"
                  onClick={() => setSplit((prev) => !prev)}
                  className={`h-9 rounded-md border px-3 text-xs ${split ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
                >
                  {split ? "enabled" : "disabled"}
                </button>
              </div>
              <div className="col-span-2 sm:col-span-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setColor("")
                    setLabelColor("")
                    setValueColor("")
                    setLabelTextColor("")
                    setLogo("")
                    setLogoColor("")
                    setLabel("")
                    setSplit(false)
                  }}
                >
                  Reset advanced props
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Copy badge</Label>
          <div className="flex flex-wrap gap-1.5">
            {(["markdown", "url", "html", "rst", "asciidoc"] as OutputFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => setOutputFormat(format)}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  outputFormat === format
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {format}
              </button>
            ))}
          </div>

          <div className="group relative">
            <pre className="break-all whitespace-pre-wrap rounded-md border border-border bg-muted/50 p-3 pr-10 font-mono text-xs">
              {formattedOutput}
            </pre>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleCopy}
              className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            >
              {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          <div className="flex items-center gap-2">
            {docsHref ? (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                <a href={docsHref}>
                  <ExternalLink className="size-3" />
                  Docs
                </a>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
              <a href={resolvedBadgePath} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TextControl({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
    </div>
  )
}

function Control({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option === "_none" ? "auto" : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
