"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useQueryStates } from "nuqs"
import { Copy, Download, FileUp, RefreshCw, Trash2, X } from "lucide-react"
import {
  badgeHtml,
  badgeMarkdown,
  badgeUrl,
  DEFAULT_GLOBAL,
  type Badge,
  type BadgeGroup,
  type GlobalSettings,
  type Mode,
  type Overrides,
  type Size,
  type Theme,
  type Variant,
} from "@/lib/gen/shieldcn"
import { genSearchParams } from "@/lib/gen/search-params"
import { deserialize, mergeRefresh, serialize, type Config } from "@/lib/gen/config"
import { inspect, type InspectResult } from "@/lib/gen/detect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ColorInput } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { cn } from "@/lib/utils"
import { TOUR_STEP_IDS } from "@/lib/tour-constants"

const VARIANTS: Variant[] = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "branded",
]
const SIZES: Size[] = ["xs", "sm", "default", "lg"]
const MODES: Mode[] = ["dark", "light"]
const THEMES: Theme[] = [
  "none",
  "zinc",
  "slate",
  "stone",
  "neutral",
  "gray",
  "blue",
  "green",
  "rose",
  "orange",
  "amber",
  "violet",
  "purple",
  "red",
  "cyan",
  "emerald",
]

const GROUP_TITLES: Record<BadgeGroup, string> = {
  github: "GitHub",
  package: "Package",
  tooling: "Tooling",
  stack: "Stack",
  modern: "Modern",
  community: "Community",
}

const GROUP_ORDER: BadgeGroup[] = [
  "github",
  "package",
  "tooling",
  "stack",
  "modern",
  "community",
]

export default function GeneratorApp() {
  const [qs, setQs] = useQueryStates(genSearchParams, {
    history: "replace",
  })
  const [inputUrl, setInputUrl] = useState(qs.url)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [shieldsIoUrls, setShieldsIoUrls] = useState<string[]>([])
  const [refreshDiff, setRefreshDiff] = useState<
    { added: string[]; refreshed: string[]; missing: string[] } | null
  >(null)

  // Auto-generate on mount if URL param is present
  const didAutoGenerate = useRef(false)
  useEffect(() => {
    if (qs.url && !didAutoGenerate.current && !config) {
      didAutoGenerate.current = true
      void handleGenerate(qs.url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync global settings from URL params to config
  useEffect(() => {
    if (!config) return
    const urlGlobal: GlobalSettings = {
      variant: qs.variant,
      size: qs.size,
      mode: qs.mode,
      theme: qs.theme,
    }
    const configGlobal = config.global
    if (
      urlGlobal.variant !== configGlobal.variant ||
      urlGlobal.size !== configGlobal.size ||
      urlGlobal.mode !== configGlobal.mode ||
      urlGlobal.theme !== configGlobal.theme
    ) {
      setConfig((c) => (c ? { ...c, global: urlGlobal } : c))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs.variant, qs.size, qs.mode, qs.theme])

  const updateGlobal = useCallback((patch: Partial<GlobalSettings>) => {
    setConfig((c) => (c ? { ...c, global: { ...c.global, ...patch } } : c))
    // Sync to URL
    void setQs(patch)
  }, [setQs])

  const updateBadge = useCallback((id: string, patch: Partial<Badge>) => {
    setConfig((c) => {
      if (!c) return c
      return {
        ...c,
        badges: c.badges.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }
    })
  }, [])

  const updateOverrides = useCallback((id: string, patch: Overrides) => {
    setConfig((c) => {
      if (!c) return c
      return {
        ...c,
        badges: c.badges.map((b) =>
          b.id === id ? { ...b, overrides: { ...b.overrides, ...patch } } : b,
        ),
      }
    })
  }, [])

  const removeBadge = useCallback((id: string) => {
    setConfig((c) => {
      if (!c) return c
      return {
        ...c,
        badges: c.badges.map((b) => (b.id === id ? { ...b, enabled: false } : b)),
      }
    })
  }, [])

  const inspectAbortRef = useRef<AbortController | null>(null)

  const runInspect = useCallback(async (url: string): Promise<InspectResult | null> => {
    inspectAbortRef.current?.abort()
    const controller = new AbortController()
    inspectAbortRef.current = controller

    setLoading(true)
    setError(null)
    setRefreshDiff(null)
    try {
      const result = await inspect(url, controller.signal)
      if (controller.signal.aborted) return null
      if ("error" in result) {
        setError(result.error)
        return null
      }
      return result
    } catch (e) {
      if (controller.signal.aborted) return null
      setError((e as Error).message)
      return null
    } finally {
      if (inspectAbortRef.current === controller) {
        setLoading(false)
        inspectAbortRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      inspectAbortRef.current?.abort()
    }
  }, [])

  const handleGenerate = useCallback(async (urlOverride?: string) => {
    const url = urlOverride ?? inputUrl.trim()
    if (!url) return
    if (url !== inputUrl) setInputUrl(url)
    void setQs({ url })
    const result = await runInspect(url)
    if (!result) return
    setConfig({
      version: 1,
      source: { type: "github", ...result.source },
      global: {
        variant: qs.variant,
        size: qs.size,
        mode: qs.mode,
        theme: qs.theme,
      },
      badges: result.badges,
      generatedAt: new Date().toISOString(),
    })
    setNotes(result.notes)
    setShieldsIoUrls(result.existingShieldsIoUrls)
  }, [inputUrl, runInspect, setQs, qs.variant, qs.size, qs.mode, qs.theme])

  const handleConfigUpload = useCallback(async (file: File) => {
    setError(null)
    try {
      const text = await file.text()
      const parsed = deserialize(text)
      if (!parsed.ok) {
        setError(parsed.error)
        return
      }
      setConfig(parsed.config)
      setInputUrl(parsed.config.source.url)
      void setQs({
        url: parsed.config.source.url,
        variant: parsed.config.global.variant,
        size: parsed.config.global.size,
        mode: parsed.config.global.mode,
        theme: parsed.config.global.theme,
      })
      setNotes([])
      setShieldsIoUrls([])
      setRefreshDiff(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [setQs])

  const configRef = useRef<Config | null>(null)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const handleRefresh = useCallback(async () => {
    const sourceUrl = configRef.current?.source.url
    if (!sourceUrl) return
    const result = await runInspect(sourceUrl)
    if (!result) return
    const latest = configRef.current
    if (!latest) return
    const merged = mergeRefresh(latest, {
      badges: result.badges,
      source: { type: "github", ...result.source },
    })
    setConfig(merged.config)
    setNotes(result.notes)
    setShieldsIoUrls(result.existingShieldsIoUrls)
    setRefreshDiff(merged.diff)
  }, [runInspect])

  const markdown = useMemo(() => {
    if (!config) return ""
    return config.badges
      .filter((b) => b.enabled)
      .map((b) => badgeMarkdown(b, config.global))
      .join("\n")
  }, [config])

  const enabledBadges = useMemo(
    () => (config ? config.badges.filter((b) => b.enabled) : []),
    [config],
  )

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignore */
    }
  }, [])

  const downloadText = useCallback(
    (text: string, filename: string, type: string) => {
      const blob = new Blob([text], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [],
  )

  return (
    <div className="space-y-6">
      <Tabs defaultValue="url">
        <TabsList>
          <TabsTrigger value="url">From GitHub URL</TabsTrigger>
          <TabsTrigger value="config">From config file</TabsTrigger>
        </TabsList>

        <TabsContent value="url">
          <Card>
            <CardContent>
              <div id={TOUR_STEP_IDS.URL_INPUT} className="space-y-2">
                <Label htmlFor="url-input" className="text-xs text-muted-foreground">
                  GitHub repository URL or owner/repo
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="url-input"
                    type="text"
                    placeholder="vercel/next.js or https://github.com/vercel/next.js"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleGenerate()
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => void handleGenerate()}
                    disabled={loading || !inputUrl.trim()}
                  >
                    {loading ? "Generating…" : "Generate"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <ConfigDropZone onFile={handleConfigUpload} />
        </TabsContent>
      </Tabs>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {config && (
        <ResultsPanel
          config={config}
          notes={notes}
          shieldsIoUrls={shieldsIoUrls}
          refreshDiff={refreshDiff}
          markdown={markdown}
          enabledBadges={enabledBadges}
          updateGlobal={updateGlobal}
          updateBadge={updateBadge}
          updateOverrides={updateOverrides}
          removeBadge={removeBadge}
          onRefresh={() => void handleRefresh()}
          onCopy={copy}
          onDownload={downloadText}
          loading={loading}
        />
      )}
    </div>
  )
}

/* ── Config drop zone ─────────────────────────────── */

function ConfigDropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        dragOver && "border-primary",
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
    >
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <FileUp className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drop a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.shieldcngen.json</code> file here, or
        </p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose a file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFile(file)
            e.target.value = ""
          }}
        />
      </CardContent>
    </Card>
  )
}

/* ── Global select ────────────────────────────────── */

function GlobalSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ── Results panel ────────────────────────────────── */

type ResultsPanelProps = {
  config: Config
  notes: string[]
  shieldsIoUrls: string[]
  refreshDiff: { added: string[]; refreshed: string[]; missing: string[] } | null
  markdown: string
  enabledBadges: Badge[]
  updateGlobal: (patch: Partial<GlobalSettings>) => void
  updateBadge: (id: string, patch: Partial<Badge>) => void
  updateOverrides: (id: string, patch: Overrides) => void
  removeBadge: (id: string) => void
  onRefresh: () => void
  onCopy: (text: string) => void
  onDownload: (text: string, filename: string, type: string) => void
  loading: boolean
}

function ResultsPanel({
  config,
  notes,
  shieldsIoUrls,
  refreshDiff,
  markdown,
  enabledBadges,
  updateGlobal,
  updateBadge,
  updateOverrides,
  removeBadge,
  onRefresh,
  onCopy,
  onDownload,
  loading,
}: ResultsPanelProps) {
  const byGroup = useMemo(() => {
    const map = new Map<BadgeGroup, Badge[]>()
    for (const b of config.badges) {
      const arr = map.get(b.group) ?? []
      arr.push(b)
      map.set(b.group, arr)
    }
    return map
  }, [config.badges])

  const downloadConfig = useCallback(() => {
    const safeName = `${config.source.owner}-${config.source.repo}.shieldcngen.json`
    onDownload(serialize(config), safeName, "application/json")
  }, [config, onDownload])

  const downloadMarkdown = useCallback(() => {
    onDownload(markdown + "\n", "badges.md", "text/markdown")
  }, [markdown, onDownload])

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="text-sm text-muted-foreground">
        Detected <strong className="text-foreground">{enabledBadges.length}</strong> badge
        {enabledBadges.length === 1 ? "" : "s"} for{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {config.source.owner}/{config.source.repo}
        </code>
        {refreshDiff && (
          <>
            {" · "}
            <span className="text-emerald-400">+{refreshDiff.added.length} new</span>
            {refreshDiff.missing.length > 0 && (
              <>
                {" · "}
                <span className="text-red-400">
                  {refreshDiff.missing.length} no longer detected
                </span>
              </>
            )}
          </>
        )}
      </div>

      {notes.length > 0 && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {notes.map((n) => (
            <div key={n}>· {n}</div>
          ))}
        </div>
      )}

      {/* Global defaults */}
      <div id={TOUR_STEP_IDS.GLOBAL_DEFAULTS} className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Global defaults
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlobalSelect
            label="Variant"
            value={config.global.variant}
            options={VARIANTS}
            onChange={(v) => updateGlobal({ variant: v as Variant })}
          />
          <GlobalSelect
            label="Size"
            value={config.global.size}
            options={SIZES}
            onChange={(v) => updateGlobal({ size: v as Size })}
          />
          <GlobalSelect
            label="Theme"
            value={config.global.theme}
            options={THEMES}
            onChange={(v) => updateGlobal({ theme: v as Theme })}
          />
          <GlobalSelect
            label="Mode"
            value={config.global.mode}
            options={MODES}
            onChange={(v) => updateGlobal({ mode: v as Mode })}
          />
        </div>
      </div>

      {/* Badge groups */}
      {GROUP_ORDER.map((group) => {
        const items = byGroup.get(group)
        if (!items || items.length === 0) return null
        const visible = items.filter((b) => b.enabled)
        if (visible.length === 0) return null
        const isFirst = GROUP_ORDER.indexOf(group) === GROUP_ORDER.findIndex((g) => {
          const items2 = byGroup.get(g)
          return items2 && items2.some((b) => b.enabled)
        })
        return (
          <div key={group} id={isFirst ? TOUR_STEP_IDS.BADGE_GROUP : undefined} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold">{GROUP_TITLES[group]}</h3>
              <span className="text-xs text-muted-foreground">{visible.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visible.map((badge, badgeIdx) => (
                <BadgeItem
                  key={badge.id}
                  badge={badge}
                  global={config.global}
                  onUpdate={(patch) => updateBadge(badge.id, patch)}
                  onUpdateOverrides={(patch) => updateOverrides(badge.id, patch)}
                  onRemove={() => removeBadge(badge.id)}
                  onCopy={onCopy}
                  tourId={isFirst && badgeIdx === 0 ? TOUR_STEP_IDS.BADGE_POPOVER : undefined}
                />
              ))}
            </div>
          </div>
        )
      })}

      <Separator />

      {/* Markdown output */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Markdown output
        </h3>
        <Textarea
          readOnly
          value={markdown}
          rows={Math.min(Math.max(enabledBadges.length, 4), 16)}
          className="font-mono text-xs"
        />
        <div id={TOUR_STEP_IDS.COPY_ACTIONS} className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onCopy(markdown)}>
            <Copy className="size-3.5" />
            Copy markdown
          </Button>
          <Button variant="outline" size="sm" onClick={downloadMarkdown}>
            <Download className="size-3.5" />
            Download .md
          </Button>
          <Button variant="outline" size="sm" onClick={downloadConfig}>
            <Download className="size-3.5" />
            Download config
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Refreshing…" : "Refresh from GitHub"}
          </Button>
        </div>
      </div>

      {/* Existing shields.io badges */}
      {shieldsIoUrls.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            {shieldsIoUrls.length} existing shields.io badge
            {shieldsIoUrls.length === 1 ? "" : "s"} found in README
          </summary>
          <ul className="mt-2 space-y-1">
            {shieldsIoUrls.map((u) => (
              <li key={u}>
                <code className="text-[11px] break-all">{u}</code>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/* ── Badge item with popover ──────────────────────── */

function BadgeItem({
  badge,
  global,
  onUpdate,
  onUpdateOverrides,
  onRemove,
  onCopy,
  tourId,
}: {
  badge: Badge
  global: GlobalSettings
  onUpdate: (patch: Partial<Badge>) => void
  onUpdateOverrides: (patch: Overrides) => void
  onRemove: () => void
  onCopy: (text: string) => void
  tourId?: string
}) {
  const [open, setOpen] = useState(false)
  const url = badgeUrl(badge, global)
  const md = badgeMarkdown(badge, global)
  const html = badgeHtml(badge, global)

  const setOverride = (key: keyof Overrides, value: string | number | boolean | undefined) => {
    if (value === "" || value === undefined) {
      const next = { ...badge.overrides }
      delete next[key]
      onUpdate({ overrides: next })
    } else {
      onUpdateOverrides({ [key]: value } as Overrides)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={tourId}
          className={cn(
            "inline-flex items-center rounded-md border border-transparent p-0.5 transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            open && "border-primary",
            !badge.enabled && "opacity-30 grayscale-[60%]",
          )}
        >
          <img src={url} alt={badge.label} loading="lazy" className="block max-h-10" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{badge.label}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => setOpen(false)}>
            <X className="size-3" />
          </Button>
        </div>

        {/* Override selects */}
        <div className="grid grid-cols-2 gap-2">
          <OverrideSelect
            label="Variant"
            value={badge.overrides.variant ?? ""}
            options={VARIANTS}
            onChange={(v) => setOverride("variant", v)}
          />
          <OverrideSelect
            label="Size"
            value={badge.overrides.size ?? ""}
            options={SIZES}
            onChange={(v) => setOverride("size", v)}
          />
          <OverrideSelect
            label="Theme"
            value={badge.overrides.theme ?? ""}
            options={THEMES}
            onChange={(v) => setOverride("theme", v)}
          />
          <OverrideSelect
            label="Mode"
            value={badge.overrides.mode ?? ""}
            options={MODES}
            onChange={(v) => setOverride("mode", v)}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="Value color"
            value={badge.overrides.color ?? ""}
            onChange={(v) => setOverride("color", v)}
          />
          <ColorField
            label="Label color"
            value={badge.overrides.labelColor ?? ""}
            onChange={(v) => setOverride("labelColor", v)}
          />
        </div>

        {/* Advanced */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Advanced
          </summary>
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <ColorField
                label="Value text"
                value={badge.overrides.valueColor ?? ""}
                onChange={(v) => setOverride("valueColor", v)}
              />
              <ColorField
                label="Label text"
                value={badge.overrides.labelTextColor ?? ""}
                onChange={(v) => setOverride("labelTextColor", v)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Custom label
              </Label>
              <Input
                placeholder="(default)"
                value={badge.overrides.label ?? ""}
                onChange={(e) => setOverride("label", e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Logo
                  </Label>
                  <Input
                    placeholder="slug or lucide:name"
                    value={
                      typeof badge.overrides.logo === "string" && !String(badge.overrides.logo).startsWith("data:")
                        ? badge.overrides.logo
                        : badge.overrides.logo === false
                          ? "false"
                          : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.trim()
                      if (raw === "false") setOverride("logo", false)
                      else setOverride("logo", raw)
                    }}
                    className="h-7 text-xs"
                  />
                </div>
                <ColorField
                  label="Logo color"
                  value={badge.overrides.logoColor ?? ""}
                  onChange={(v) => setOverride("logoColor", v)}
                />
              </div>
              <SvgIconUpload
                value={typeof badge.overrides.logo === "string" ? badge.overrides.logo : ""}
                onChange={(v) => setOverride("logo", v || undefined)}
                className="w-full"
              />
            </div>
          </div>
        </details>

        <Separator />

        {/* Embed */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Embed
          </Label>
          <EmbedField label="Markdown" value={md} onCopy={onCopy} />
          <EmbedField label="HTML" value={html} onCopy={onCopy} />
          <EmbedField label="URL" value={url} onCopy={onCopy} />
        </div>

        <Separator />

        {/* Remove */}
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            onRemove()
            setOpen(false)
          }}
        >
          <Trash2 className="size-3.5" />
          Remove this badge
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/* ── Override select (with global fallback) ───────── */

function OverrideSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value || "__global__"}
        onValueChange={(v) => onChange(v === "__global__" ? "" : v)}
      >
        <SelectTrigger className="h-7 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__global__">(global)</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ── Embed field ──────────────────────────────────── */

function EmbedField({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (text: string) => void
}) {
  return (
    <div className="flex gap-1.5">
      <Textarea
        readOnly
        value={value}
        rows={1}
        aria-label={label}
        className="h-7 min-h-0 flex-1 resize-none py-1 font-mono text-[11px]"
      />
      <Button variant="outline" size="icon-xs" onClick={() => onCopy(value)} title={`Copy ${label}`}>
        <Copy className="size-3" />
      </Button>
    </div>
  )
}

/* ── Color field ──────────────────────────────────── */

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
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <ColorInput value={value} onChange={onChange} placeholder="(none)" />
    </div>
  )
}
