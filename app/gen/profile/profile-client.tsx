"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useQueryStates } from "nuqs"
import { useOpenPanel } from "@openpanel/nextjs"
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
import { profileSearchParams } from "@/lib/gen/profile-search-params"
import { inspectProfile, type ProfileInspectResult, type GitHubUserProfile } from "@/lib/gen/detect-profile"
import type { Config } from "@/lib/gen/config"
import { mergeRefresh, serialize, deserialize } from "@/lib/gen/config"
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
import { Switch } from "@/components/ui/switch"
import { ColorInput } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import { cn } from "@/lib/utils"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { PROFILE_TOUR_STEP_IDS } from "@/lib/tour-constants"

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

const GROUP_TITLES: Record<string, string> = {
  profile: "Profile",
  social: "Social",
  skills: "Skills & Languages",
  repos: "Top Repositories",
}

const GROUP_ORDER: BadgeGroup[] = ["profile", "social", "skills", "repos"]

export default function ProfileGeneratorClient() {
  const { track } = useOpenPanel()
  const [qs, setQs] = useQueryStates(profileSearchParams, {
    history: "replace",
  })


  const [inputUser, setInputUser] = useState(qs.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [profile, setProfile] = useState<GitHubUserProfile | null>(null)
  const [useTemplate, setUseTemplate] = useState(true)
  const [refreshDiff, setRefreshDiff] = useState<
    { added: string[]; refreshed: string[]; missing: string[] } | null
  >(null)

  // Auto-generate on mount if user param is present
  const didAutoGenerate = useRef(false)
  useEffect(() => {
    if (qs.user && !didAutoGenerate.current && !config) {
      didAutoGenerate.current = true
      void handleGenerate(qs.user)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs.user])

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

  const updateGlobal = useCallback(
    (patch: Partial<GlobalSettings>) => {
      setConfig((c) => (c ? { ...c, global: { ...c.global, ...patch } } : c))
      void setQs(patch)
    },
    [setQs],
  )

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
        badges: c.badges.map((b) =>
          b.id === id ? { ...b, enabled: false } : b,
        ),
      }
    })
  }, [])

  const inspectAbortRef = useRef<AbortController | null>(null)

  const runInspect = useCallback(
    async (
      user: string,
    ): Promise<ProfileInspectResult | null> => {
      inspectAbortRef.current?.abort()
      const controller = new AbortController()
      inspectAbortRef.current = controller

      setLoading(true)
      setError(null)
      setRefreshDiff(null)
      try {
        const result = await inspectProfile(user, controller.signal)
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
    },
    [],
  )

  useEffect(() => {
    return () => {
      inspectAbortRef.current?.abort()
    }
  }, [])

  const handleGenerate = useCallback(
    async (userOverride?: string) => {
      const user = userOverride ?? inputUser.trim()
      if (!user) return
      if (user !== inputUser) setInputUser(user)
      track("generator_input", { input: user, type: "profile", source: "generator" })
      void setQs({ user })
      const result = await runInspect(user)
      if (!result) return
      setProfile(result.profile)
      setConfig({
        version: 1,
        source: { type: "profile", ...result.source },
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
      const enabledCount = result.badges.filter((b) => b.enabled).length
      track("generator_generate", {
        type: "profile",
        target: result.source.username,
        badge_count: enabledCount,
      })
      fetch("/api/gen-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: enabledCount }),
      }).catch(() => {})
    },
    [inputUser, runInspect, setQs, qs.variant, qs.size, qs.mode, qs.theme, track],
  )

  const configRef = useRef<Config | null>(null)
  useEffect(() => {
    configRef.current = config
  }, [config])

  const handleRefresh = useCallback(async () => {
    const source = configRef.current?.source
    if (!source || source.type !== "profile") return
    const result = await runInspect(source.username)
    if (!result) return
    const latest = configRef.current
    if (!latest) return
    const merged = mergeRefresh(latest, {
      badges: result.badges,
      source: { type: "profile", ...result.source },
    })
    setConfig(merged.config)
    setNotes(result.notes)
    setProfile(result.profile)
    setRefreshDiff(merged.diff)
  }, [runInspect])

  const enabledBadges = useMemo(
    () => (config ? config.badges.filter((b) => b.enabled) : []),
    [config],
  )

  const badgesByGroup = useMemo(() => {
    const map = new Map<BadgeGroup, Badge[]>()
    for (const b of enabledBadges) {
      const arr = map.get(b.group) ?? []
      arr.push(b)
      map.set(b.group, arr)
    }
    return map
  }, [enabledBadges])

  const markdown = useMemo(() => {
    if (!config) return ""
    if (!useTemplate) {
      return enabledBadges.map((b) => badgeMarkdown(b, config.global)).join("\n")
    }
    return buildProfileTemplate(config, enabledBadges, profile)
  }, [config, enabledBadges, useTemplate, profile])

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
      {/* Input */}
      <Card>
        <CardContent>
          <div id={PROFILE_TOUR_STEP_IDS.USER_INPUT} className="space-y-2">
            <Label
              htmlFor="user-input"
              className="text-xs text-muted-foreground"
            >
              GitHub username
            </Label>
            <div className="flex gap-2">
              <Input
                id="user-input"
                type="text"
                placeholder="jal-co"
                value={inputUser}
                onChange={(e) => setInputUser(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleGenerate()
                }}
                className="flex-1"
              />
              <Button
                onClick={() => void handleGenerate()}
                disabled={loading || !inputUser.trim()}
              >
                {loading ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {config && (
        <>
          {/* Profile header */}
          {profile && (
            <div className="flex items-center gap-4">
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="size-12 rounded-full border"
              />
              <div>
                <div className="font-semibold">
                  {profile.name ?? profile.login}
                </div>
                <div className="text-sm text-muted-foreground">
                  @{profile.login}
                  {profile.bio && ` · ${profile.bio}`}
                </div>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="text-sm text-muted-foreground">
            Detected{" "}
            <strong className="text-foreground">
              {enabledBadges.length}
            </strong>{" "}
            badge{enabledBadges.length === 1 ? "" : "s"} for{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {config.source.type === "profile"
                ? config.source.username
                : ""}
            </code>
            {refreshDiff && (
              <>
                {" · "}
                <span className="text-emerald-400">
                  +{refreshDiff.added.length} new
                </span>
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
          <div
            id={PROFILE_TOUR_STEP_IDS.GLOBAL_DEFAULTS}
            className="space-y-3"
          >
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
            const items = badgesByGroup.get(group)
            if (!items || items.length === 0) return null
            const isFirst =
              GROUP_ORDER.indexOf(group) ===
              GROUP_ORDER.findIndex((g) => {
                const items2 = badgesByGroup.get(g)
                return items2 && items2.length > 0
              })
            return (
              <div
                key={group}
                id={
                  isFirst ? PROFILE_TOUR_STEP_IDS.BADGE_GROUP : undefined
                }
                className="space-y-3"
              >
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold">
                    {GROUP_TITLES[group] ?? group}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((badge, badgeIdx) => (
                    <BadgeItem
                      key={badge.id}
                      badge={badge}
                      global={config.global}
                      onUpdate={(patch) => updateBadge(badge.id, patch)}
                      onUpdateOverrides={(patch) =>
                        updateOverrides(badge.id, patch)
                      }
                      onRemove={() => removeBadge(badge.id)}
                      onCopy={copy}
                      tourId={
                        isFirst && badgeIdx === 0
                          ? PROFILE_TOUR_STEP_IDS.BADGE_POPOVER
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}

          <Separator />

          {/* Output */}
          <div className="space-y-3">
            <div
              id={PROFILE_TOUR_STEP_IDS.TEMPLATE_OUTPUT}
              className="flex items-center justify-between"
            >
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Output
              </h3>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="template-toggle"
                  className="text-xs text-muted-foreground"
                >
                  Full README template
                </Label>
                <Switch
                  id="template-toggle"
                  checked={useTemplate}
                  onCheckedChange={setUseTemplate}
                />
              </div>
            </div>
            <Textarea
              readOnly
              value={markdown}
              rows={Math.min(
                Math.max(
                  useTemplate ? 20 : enabledBadges.length,
                  6,
                ),
                30,
              )}
              className="font-mono text-xs"
            />
            <div
              id={PROFILE_TOUR_STEP_IDS.COPY_ACTIONS}
              className="flex flex-wrap gap-2"
            >
              <Button size="sm" onClick={() => copy(markdown)}>
                <Copy className="size-3.5" />
                Copy {useTemplate ? "README" : "markdown"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(
                    markdown + "\n",
                    "README.md",
                    "text/markdown",
                  )
                }
              >
                <Download className="size-3.5" />
                Download README.md
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const safeName = `${config.source.type === "profile" ? config.source.username : "profile"}.shieldcngen.json`
                  downloadText(
                    serialize(config),
                    safeName,
                    "application/json",
                  )
                }}
              >
                <Download className="size-3.5" />
                Download config
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleRefresh()}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("size-3.5", loading && "animate-spin")}
                />
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Profile template builder ─────────────────────────

function buildProfileTemplate(
  config: Config,
  badges: Badge[],
  profile: GitHubUserProfile | null,
): string {
  const g = config.global
  const lines: string[] = []
  const byGroup = new Map<BadgeGroup, Badge[]>()
  for (const b of badges) {
    const arr = byGroup.get(b.group) ?? []
    arr.push(b)
    byGroup.set(b.group, arr)
  }

  const name = profile?.name ?? (config.source.type === "profile" ? config.source.username : "")
  const bio = profile?.bio ?? ""

  lines.push(`<div align="center">`)
  lines.push(``)
  if (name) lines.push(`# Hi, I'm ${name} 👋`)
  if (bio) {
    lines.push(``)
    lines.push(`**${bio}**`)
  }
  lines.push(``)

  // Social badges
  const socialBadges = byGroup.get("social")
  if (socialBadges && socialBadges.length > 0) {
    lines.push(socialBadges.map((b) => badgeMarkdown(b, g)).join(" "))
    lines.push(``)
  }

  // Profile badges
  const profileBadges = byGroup.get("profile")
  if (profileBadges && profileBadges.length > 0) {
    lines.push(profileBadges.map((b) => badgeMarkdown(b, g)).join(" "))
    lines.push(``)
  }

  lines.push(`</div>`)
  lines.push(``)

  // Skills
  const skillsBadges = byGroup.get("skills")
  if (skillsBadges && skillsBadges.length > 0) {
    lines.push(`## 🛠️ Skills & Technologies`)
    lines.push(``)
    lines.push(skillsBadges.map((b) => badgeMarkdown(b, g)).join(" "))
    lines.push(``)
  }

  // Top repos
  const repoBadges = byGroup.get("repos")
  if (repoBadges && repoBadges.length > 0) {
    lines.push(`## 📦 Top Repositories`)
    lines.push(``)
    lines.push(repoBadges.map((b) => badgeMarkdown(b, g)).join(" "))
    lines.push(``)
  }

  lines.push(`---`)
  lines.push(``)
  lines.push(
    `<sub>Badges generated with [shieldcn](https://shieldcn.dev/gen/profile)</sub>`,
  )

  return lines.join("\n")
}

// ── Shared subcomponents ─────────────────────────────

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
  const { mode: siteMode } = useBadgeMode()
  const url = badgeUrl(badge, global)
  const md = badgeMarkdown(badge, global)
  const html = badgeHtml(badge, global)
  // Preview uses site theme so badges are visible on the current background.
  // Always include mode= explicitly so the URL changes when theme toggles.
  const previewUrl = useMemo(() => {
    const base = badgeUrl(badge, { ...global, mode: siteMode })
    if (siteMode === "dark" && !/[?&]mode=/.test(base)) {
      return `${base}${base.includes("?") ? "&" : "?"}mode=dark`
    }
    return base
  }, [badge, global, siteMode])

  const setOverride = (
    key: keyof Overrides,
    value: string | number | boolean | undefined,
  ) => {
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
          <img
            src={previewUrl}
            alt={badge.label}
            loading="lazy"
            className="block max-h-10"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="start">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{badge.label}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setOpen(false)}
          >
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
                    placeholder="slug or ri:Name"
                    value={
                      typeof badge.overrides.logo === "string" &&
                      !String(badge.overrides.logo).startsWith("data:")
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
                value={
                  typeof badge.overrides.logo === "string"
                    ? badge.overrides.logo
                    : ""
                }
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
      <Button
        variant="outline"
        size="icon-xs"
        onClick={() => onCopy(value)}
        title={`Copy ${label}`}
      >
        <Copy className="size-3" />
      </Button>
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
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <ColorInput value={value} onChange={onChange} placeholder="(none)" />
    </div>
  )
}
