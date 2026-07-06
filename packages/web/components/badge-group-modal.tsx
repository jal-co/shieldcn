"use client"

import { useState, useCallback, useMemo, useSyncExternalStore } from "react"
import Link from "next/link"
import { Copy, Check, ExternalLink, Plus, Trash2, GripVertical } from "lucide-react"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { formatBadgeOutput, isThemeAdaptiveBadgeUrl } from "@/lib/badge-output"
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
import { ALL_VARIANTS } from "@shieldcn/core/badges/registry"

interface BadgeGroupModalProps {
  title: string
  description?: string
  badgePath: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Groups apply one variant uniformly across all badges, so every variant is
// valid. Sourced from the registry (single source of truth) rather than a copy.
const VARIANTS = [...ALL_VARIANTS]
const SIZES = ["xs", "sm", "default", "lg"]
const THEMES = ["_none", "zinc", "slate", "blue", "green", "rose", "orange", "violet", "purple", "cyan", "emerald"]
const MODES = ["dark", "light"]

type OutputFormat = "markdown" | "adaptive" | "url" | "html" | "rst" | "asciidoc"

// Human labels for the copy-format tabs.
const FORMAT_LABELS: Record<OutputFormat, string> = {
  markdown: "markdown",
  adaptive: "adaptive",
  url: "url",
  html: "html",
  rst: "rst",
  asciidoc: "asciidoc",
}

/** Parse a group badge path into individual segment paths. */
function parseGroupPath(badgePath: string): { segments: string[]; variant: string; size: string; theme: string; mode: string } {
  // Remove /group/ prefix, strip extension, extract query
  let path = badgePath
  const qIdx = path.indexOf("?")
  let query = ""
  if (qIdx !== -1) {
    query = path.slice(qIdx)
    path = path.slice(0, qIdx)
  }

  // Strip /group/ and .svg/.png
  path = path.replace(/^\/group\//, "").replace(/\.(svg|png|json)$/, "")

  const segments = path.split("+").filter(Boolean)

  // Parse query params
  const params = new URLSearchParams(query)

  return {
    segments,
    variant: params.get("variant") ?? "default",
    size: params.get("size") ?? "sm",
    theme: params.get("theme") ?? "_none",
    mode: params.get("mode") ?? "dark",
  }
}

/** Build a group badge path from segments and options. */
function buildGroupPath(
  segments: string[],
  opts: { variant: string; size: string; theme: string; mode: string },
): string {
  if (segments.length === 0) return "/group/badge/empty.svg"

  const joined = segments.join("+")
  const params = new URLSearchParams()
  if (opts.variant !== "default") params.set("variant", opts.variant)
  if (opts.size !== "sm") params.set("size", opts.size)
  if (opts.theme !== "_none") params.set("theme", opts.theme)
  if (opts.mode !== "dark") params.set("mode", opts.mode)

  const qs = params.toString()
  return `/group/${joined}.svg${qs ? `?${qs}` : ""}`
}

export function BadgeGroupModal({
  title,
  description,
  badgePath,
  open,
  onOpenChange,
}: BadgeGroupModalProps) {
  const parsed = useMemo(() => parseGroupPath(badgePath), [badgePath])

  const [segments, setSegments] = useState<string[]>(parsed.segments)
  const [variant, setVariant] = useState(parsed.variant)
  const [size, setSize] = useState(parsed.size)
  const [theme, setTheme] = useState(parsed.theme)
  const { mode: siteMode } = useBadgeMode()
  const [mode, setMode] = useState(parsed.mode || siteMode)
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown")
  const { copied, copy } = useCopyToClipboard()
  const [newSegment, setNewSegment] = useState("")

  // Hydration-safe flags (server snapshot differs from client) — no
  // setState-in-effect. `mounted` gates badge <img> rendering to avoid an SSR
  // mismatch; `baseUrl` swaps the canonical host for the real origin on client.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  // Re-sync controls when the modal (re)opens with a different badge or the
  // site theme changes — done during render via a sync key (the React “adjust
  // state when inputs change” pattern) instead of a setState-in-effect.
  const [syncKey, setSyncKey] = useState("")
  const nextSyncKey = `${open}|${siteMode}|${badgePath}`
  if (open && nextSyncKey !== syncKey) {
    setSyncKey(nextSyncKey)
    const p = parseGroupPath(badgePath)
    setSegments(p.segments)
    setVariant(p.variant)
    setSize(p.size)
    setTheme(p.theme)
    setMode(p.mode || siteMode)
  }

  const resolvedPath = useMemo(
    () => buildGroupPath(segments, { variant, size, theme, mode }),
    [segments, variant, size, theme, mode],
  )

  // For <img src>, encode + as %2B so the browser doesn't treat it as a space
  const resolvedPathEncoded = resolvedPath.replace(/\+/g, "%2B")

  const fullUrl = `${baseUrl}${resolvedPath}`

  const formattedOutput = useMemo(() => {
    switch (outputFormat) {
      case "markdown":
        return formatBadgeOutput(fullUrl, "markdown", { alt: title })
      case "adaptive":
        return formatBadgeOutput(fullUrl, "markdown", {
          alt: title,
          preferPicture: true,
          ignoreModeForPicture: true,
        })
      case "url": return fullUrl
      case "html":
        return formatBadgeOutput(fullUrl, "html", {
          alt: title,
          preferPicture: true,
          ignoreModeForPicture: true,
        })
      case "rst": return formatBadgeOutput(fullUrl, "rst", { alt: title })
      case "asciidoc": return formatBadgeOutput(fullUrl, "asciidoc", { alt: title })
    }
  }, [outputFormat, fullUrl, title])

  // The <picture> "adaptive" tab only applies to theme-adaptive badges;
  // for fixed-color badges it would just duplicate the plain markdown.
  const copyFormats = useMemo<OutputFormat[]>(() => {
    const base: OutputFormat[] = ["markdown"]
    if (isThemeAdaptiveBadgeUrl(fullUrl, { ignoreMode: true })) base.push("adaptive")
    base.push("url", "html", "rst", "asciidoc")
    return base
  }, [fullUrl])

  const handleCopy = useCallback(() => copy(formattedOutput), [copy, formattedOutput])

  const addSegment = useCallback(() => {
    const trimmed = newSegment.trim().replace(/^\//, "").replace(/\.(svg|png|json)$/, "")
    if (!trimmed) return
    setSegments(prev => [...prev, trimmed])
    setNewSegment("")
  }, [newSegment])

  const removeSegment = useCallback((index: number) => {
    setSegments(prev => prev.filter((_, i) => i !== index))
  }, [])

  const moveSegment = useCallback((from: number, to: number) => {
    setSegments(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }, [])

  const sizeHeight = { xs: "h-6", sm: "h-8", default: "h-9", lg: "h-10" }[size] || "h-8"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Customize this badge group — add, remove, or reorder segments."}
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div
          className="flex justify-center overflow-x-auto rounded-lg py-6"
          style={{ backgroundColor: mode === "light" ? "#f4f4f5" : "#101012" }}
        >
          {mounted && segments.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={resolvedPath}
              src={resolvedPathEncoded}
              alt={title}
              className={`max-w-full ${sizeHeight}`}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Add segments to preview</p>
          )}
        </div>

        {/* Segments list */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Segments</Label>
          <div className="space-y-1.5">
            {segments.map((seg, i) => (
              <div key={`${i}-${seg}`} className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => i > 0 && moveSegment(i, i - 1)}
                    disabled={i === 0}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <GripVertical className="size-3" />
                  </button>
                </div>
                <code className="flex-1 truncate rounded border border-border bg-muted/50 px-2 py-1.5 font-mono text-[11px]">
                  /{seg}
                </code>
                <button
                  type="button"
                  onClick={() => removeSegment(i)}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Remove segment"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add segment */}
          <div className="flex items-center gap-2">
            <Input
              value={newSegment}
              onChange={(e) => setNewSegment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSegment()}
              placeholder="npm/react or github/stars/owner/repo"
              className="h-8 flex-1 font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2.5"
              onClick={addSegment}
              disabled={!newSegment.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* Style controls */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Control label="Variant" value={variant} onValueChange={setVariant} options={VARIANTS} />
          <Control label="Size" value={size} onValueChange={setSize} options={SIZES} />
          <Control label="Theme" value={theme} onValueChange={setTheme} options={THEMES} />
          <Control label="Mode" value={mode} onValueChange={setMode} options={MODES} />
        </div>

        {/* Copy output */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Copy badge group</Label>
          <div className="flex flex-wrap gap-1.5">
            {copyFormats.map((format) => (
              <button
                key={format}
                onClick={() => setOutputFormat(format)}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  outputFormat === format
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {FORMAT_LABELS[format]}
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-[11px] text-muted-foreground">badge group · {segments.length} segment{segments.length !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
              <Link href="/docs/badges/group">
                <ExternalLink className="size-3" />
                Docs
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
              <a href={resolvedPath} target="_blank" rel="noopener noreferrer">
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
