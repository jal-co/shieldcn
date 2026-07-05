"use client"

/**
 * shieldcn
 * components/brand-editor.tsx
 *
 * Plus brand editor. Import a brand from a domain via Context.dev, review and
 * edit the profile / palette / style tokens, host the light+dark logos, and
 * upload custom fonts. The DB record is canonical; brand.md is generated from
 * it and shown for reference/export.
 */

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Save, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { ContextDevLogo } from "@/components/context-dev-logo"
import { BrandDemoBadges } from "@/components/brand-demo-badges"
import { BrandShowcaseEditor } from "@/components/brand-showcase-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type { Brand, BrandConfig, BrandProfile, BrandFontKind, BrandAssetKind, BrandImageKind } from "@shieldcn/core/brands"

interface ImportedLogos {
  /** Freshly-imported square mark URL, hosted as the brand mark on save. */
  markUrl?: string
}

const VARIANTS = ["default", "secondary", "outline", "ghost", "branded"]
const THEMES = ["zinc", "slate", "blue", "green", "rose", "orange", "violet", "purple", "cyan", "emerald"]
const FONT_SLOTS: { kind: BrandFontKind; label: string }[] = [
  { kind: "font-sans", label: "Sans (font=brand)" },
  { kind: "font-mono", label: "Mono (font=brand-mono)" },
  { kind: "font-heading", label: "Heading (font=brand-heading)" },
]

const LOGO_SLOTS: { kind: BrandImageKind; label: string; bg: string; hint?: string }[] = [
  { kind: "mark", label: "Mark / icon", bg: "#18181b", hint: "logo=brand" },
  { kind: "mark-alt", label: "Alt mark", bg: "#18181b", hint: "logo=brand-alt" },
]

/** An editable hex color field with a native picker + palette quick-picks. */
function BrandColorField({
  label,
  hint,
  value,
  onChange,
  palette,
}: {
  label: string
  hint: ReactNode
  value: string | undefined
  onChange: (hex: string) => void
  palette: { hex: string; name?: string }[]
}) {
  const hex = (value || "").replace(/^#/, "")
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={`#${hex || "000000"}`}
          onChange={(e) => onChange(e.target.value.replace(/^#/, ""))}
          className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-1"
        />
        <div className="flex items-center rounded-md border border-border">
          <span className="px-2 text-sm text-muted-foreground">#</span>
          <Input
            value={hex}
            onChange={(e) => onChange(e.target.value.replace(/^#/, "").slice(0, 8))}
            placeholder="000000"
            className="h-9 w-28 border-0 font-mono focus-visible:ring-0"
          />
        </div>
      </div>
      {palette.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {palette.map((c, i) => {
            const active = hex.toLowerCase() === c.hex.replace(/^#/, "").toLowerCase()
            return (
              <button
                key={`${c.hex}-${i}`}
                type="button"
                onClick={() => onChange(c.hex.replace("#", ""))}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors",
                  active ? "border-ring ring-1 ring-ring" : "border-border hover:border-ring/40",
                )}
                title={`Use ${c.hex}`}
              >
                <span className="size-4 rounded border border-border" style={{ backgroundColor: c.hex }} />
                <span className="font-mono">{c.hex}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function BrandEditor({
  brand,
  create,
  admin = false,
}: {
  brand?: Brand
  create?: boolean
  /** Admins may rename an existing brand's slug (breaks live embeds — warned). */
  admin?: boolean
}) {
  const router = useRouter()
  const [slug, setSlug] = useState(brand?.slug ?? "")
  // The slug this editor loaded with (the DB key). A rename PUTs to the old
  // slug with a `newSlug` so the server can move the row + assets atomically.
  const originalSlug = brand?.slug ?? ""
  const slugRenamed = Boolean(brand) && slug.trim() !== originalSlug
  const [name, setName] = useState(brand?.name ?? "")
  const [profile, setProfile] = useState<BrandProfile>(brand?.profile ?? {})
  const [config, setConfig] = useState<BrandConfig>(brand?.config ?? {})
  const [brandMd, setBrandMd] = useState<string | null>(brand?.brandMd ?? null)
  const [logos, setLogos] = useState<ImportedLogos>({})
  const [domain, setDomain] = useState("")
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  // Per-slot asset upload state: which kind is uploading, and which are stored.
  const [uploadingKind, setUploadingKind] = useState<BrandAssetKind | null>(null)
  const [storedAssets, setStoredAssets] = useState<Record<string, string | null>>({})
  // Bumped after a logo upload to cache-bust the hosted logo <img> previews.
  const [logoRev, setLogoRev] = useState(0)
  // Whether this brand exists in the DB yet (an existing brand, or one we saved
  // during this session). Fonts/logos can only attach to a persisted brand.
  const [persisted, setPersisted] = useState<boolean>(Boolean(brand))

  const palette = profile.palette ?? []

  // Arriving from the Studio's "Save as brand": prefill the style tokens
  // captured from the current README's dominant look (theme, variant, colors,
  // font). One-shot — the seed is consumed so a reload starts clean.
  useEffect(() => {
    if (!create) return
    try {
      const raw = sessionStorage.getItem("shieldcn:brand-seed")
      if (!raw) return
      sessionStorage.removeItem("shieldcn:brand-seed")
      const seed = JSON.parse(raw) as BrandConfig
      if (seed && typeof seed === "object" && Object.keys(seed).length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConfig((c) => ({ ...seed, ...c }))
        toast.success("Style captured from your README — review and save")
      }
    } catch {
      /* ignore a malformed seed */
    }
  }, [create])

  // Load which font/logo assets already exist for a saved brand so the slots
  // reflect reality (and re-uploads read as "replace").
  useEffect(() => {
    if (!brand?.slug) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/brands/${brand.slug}/assets`, { credentials: "include" })
        if (!res.ok) return
        const json = (await res.json()) as { assets?: { kind: string; fileName: string | null }[] }
        if (cancelled || !json.assets) return
        const map: Record<string, string | null> = {}
        for (const a of json.assets) map[a.kind] = a.fileName
        setStoredAssets(map)
      } catch {
        /* best-effort */
      }
    })()
    return () => { cancelled = true }
  }, [brand?.slug])

  async function runImport() {
    if (!domain.trim()) return
    setImporting(true)
    try {
      const res = await fetch("/api/brands/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: domain.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "import failed")
      // The import route returns Context.dev's normalized shape: `colors`
      // (not `palette`), `iconUrl` (mark), plus a generated `markdown`.
      const p = json.profile as {
        title?: string
        description?: string
        slogan?: string
        domain?: string
        colors?: { hex: string; name?: string }[]
        lightLogoUrl?: string
        darkLogoUrl?: string
        iconUrl?: string
      }
      const palette = (p.colors ?? []).map((c) => ({ hex: c.hex, name: c.name }))
      setProfile({
        title: p.title,
        description: p.description,
        slogan: p.slogan,
        domain: p.domain,
        palette,
      })
      if (typeof json.markdown === "string") setBrandMd(json.markdown)
      // We only keep a single square mark (+ optional alt). Prefer the icon;
      // fall back to whichever logo the scrape returned.
      setLogos({ markUrl: p.iconUrl ?? p.darkLogoUrl ?? p.lightLogoUrl })
      if (!name && p.title) setName(p.title)
      if (!slug && p.domain) setSlug(p.domain.split(".")[0])
      // Drive badges from the brand's own palette color, not a preset theme:
      // set the primary color, force the branded variant, and CLEAR any theme
      // so the scraped color (e.g. black) actually shows in the preview.
      setConfig((c) => ({
        ...c,
        color: palette[0] ? palette[0].hex.replace("#", "") : c.color,
        color2: palette[1] ? palette[1].hex.replace("#", "") : c.color2,
        theme: undefined,
        variant: c.variant ?? "branded",
      }))
      toast.success("Brand imported — review and save")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "import failed")
    } finally {
      setImporting(false)
    }
  }

  /** Persist the brand record (+ imported logo URLs). Returns true on success. */
  async function persist(): Promise<boolean> {
    // For an admin rename, PUT to the ORIGINAL slug with `newSlug`; the server
    // moves the row + assets, then upserts under the new slug.
    const putSlug = slugRenamed ? originalSlug : slug.trim()
    const res = await fetch(`/api/brands/${putSlug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || null,
        config,
        profile,
        brandMd,
        ...(slugRenamed ? { newSlug: slug.trim() } : {}),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? "save failed")

    // Host any freshly-imported logo URLs into brand_assets (under the new slug).
    if (logos.markUrl) {
      await fetch(`/api/brands/${slug.trim()}/logos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logos),
      }).catch(() => {})
    }
    setPersisted(true)
    return true
  }

  async function save() {
    if (!slug.trim()) {
      toast.error("A slug is required")
      return
    }
    setSaving(true)
    try {
      await persist()
      toast.success("Brand saved")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "save failed")
    } finally {
      setSaving(false)
    }
  }

  /** Upload/replace any brand asset (font or logo). Auto-saves first if needed. */
  async function uploadAsset(kind: BrandAssetKind, file: File) {
    if (!slug.trim()) {
      toast.error("Enter a slug first, then upload assets")
      return
    }
    setUploadingKind(kind)
    try {
      // An asset can only attach to a persisted brand. If this is a brand-new
      // brand (or unsaved edits), save it first so the upload has somewhere to
      // land — no more silent 404s from uploading before the first save.
      if (!persisted) await persist()

      const form = new FormData()
      form.set("kind", kind)
      form.set("file", file)
      const res = await fetch(`/api/brands/${slug.trim()}/assets`, {
        method: "POST",
        body: form,
        credentials: "include",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "upload failed")
      setStoredAssets((prev) => ({ ...prev, [kind]: file.name }))
      // Bust the <img> cache for logos so the preview reflects the new file.
      setLogoRev((r) => r + 1)
      toast.success(`Uploaded ${file.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "upload failed")
    } finally {
      setUploadingKind(null)
    }
  }

  /** Remove a stored asset (logo/mark or font). */
  async function removeAsset(kind: BrandAssetKind) {
    if (!slug.trim()) return
    setUploadingKind(kind)
    try {
      const res = await fetch(`/api/brands/${slug.trim()}/assets?kind=${encodeURIComponent(kind)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "remove failed")
      setStoredAssets((prev) => {
        const next = { ...prev }
        delete next[kind]
        return next
      })
      // Clear a freshly-imported preview URL for the mark too.
      if (kind === "mark") setLogos((l) => ({ ...l, markUrl: undefined }))
      setLogoRev((r) => r + 1)
      toast.success("Removed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "remove failed")
    } finally {
      setUploadingKind(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Import */}
      <section className="flex flex-col gap-2">
        <Label>Import from a domain</Label>
        <div className="flex gap-2">
          <Input
            placeholder="stripe.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runImport()}
          />
          <Button
            onClick={runImport}
            disabled={importing}
            className="shrink-0 bg-[#2564EA] text-white hover:bg-[#1d4fd0]"
          >
            {importing ? <Loader2 className="size-4 animate-spin" /> : <ContextDevLogo bare className="size-4" />}
            Import from Context.dev
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Pulls the logo, palette, and description via Context.dev. Review everything before saving.
        </p>
      </section>

      {/* Identity */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            disabled={!create && !admin}
            placeholder="acme"
          />
          {slugRenamed ? (
            <p className="text-xs text-amber-500">
              Renaming the slug changes the URL. Every badge/README referencing{" "}
              <code>?brand={originalSlug}</code> will break unless updated to{" "}
              <code>?brand={slug || "…"}</code>.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Used in URLs: <code>?brand={slug || "acme"}</code>
              {!create && !admin && " · locked (renaming breaks existing badges)"}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc" />
          {brand?.ownerId && (
            <p className="text-xs text-muted-foreground">
              Owner: <code className="font-mono">{brand.ownerId}</code>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={profile.description ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
            rows={3}
          />
        </div>
      </section>

      {/* Brand color — drives every badge when theme is "none". Editable, with
          the scraped palette as quick-pick swatches. */}
      <section className="grid gap-6 sm:grid-cols-2">
        <BrandColorField
          label="Brand color"
          hint={<>The badge color for the <code>default</code>/<code>branded</code> look. Edit the hex or pick from the palette.</>}
          value={config.color}
          onChange={(hex) => setConfig((c) => ({ ...c, color: hex }))}
          palette={palette}
        />
        <BrandColorField
          label="Secondary color"
          hint={<>Background for the <code>secondary</code> variant. Defaults to your 2nd palette color.</>}
          value={config.color2}
          onChange={(hex) => setConfig((c) => ({ ...c, color2: hex || undefined }))}
          palette={palette}
        />
      </section>

      {/* Logos */}
      {/* Logos — upload / replace each slot with an SVG (or raster). */}
      <section className="flex flex-col gap-2">
        <Label>Logos</Label>
        <p className="text-xs text-muted-foreground">
          Upload a square mark SVG (PNG/JPEG/WebP also work). Reference it in any badge with
          <code>logo=brand</code>, or the alt with <code>logo=brand-alt</code>. Importing a brand
          auto-generates the alt mark by recoloring for the opposite mode.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {LOGO_SLOTS.map((l) => {
            // Prefer a freshly-imported URL, else the hosted asset (cache-busted
            // after an upload), else nothing.
            const imported = l.kind === "mark" ? logos.markUrl : undefined
            const hosted =
              (persisted || storedAssets[l.kind] != null) && (slug || brand?.slug)
                ? `/b/${slug || brand?.slug}/${l.kind}.svg?r=${logoRev}`
                : undefined
            const url = imported ?? hosted
            const busy = uploadingKind === l.kind
            // Removable only when a persisted asset exists (a fresh import URL is
            // removed client-side via the mark clear inside removeAsset).
            const removable = storedAssets[l.kind] != null || (l.kind === "mark" && !!logos.markUrl)
            return (
              <div key={l.kind} className="group relative">
                {removable && !busy && (
                  <button
                    type="button"
                    onClick={() => removeAsset(l.kind)}
                    aria-label={`Remove ${l.label}`}
                    className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                )}
                <label
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:border-ring/40",
                    busy && "pointer-events-none opacity-70",
                  )}
                >
                  <div
                    className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-md border border-border"
                    style={{ background: l.bg }}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={l.label} className="max-h-10 max-w-[80%] object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">none</span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="mr-1 size-3" /> {url ? "Replace" : "Upload"}
                    </span>
                  </div>
                  <span className="text-center text-[10px] text-muted-foreground">
                    {l.label}
                    {l.hint && <span className="block font-mono text-[9px] opacity-70">{l.hint}</span>}
                  </span>
                  <input
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => e.target.files?.[0] && uploadAsset(l.kind, e.target.files[0])}
                  />
                </label>
              </div>
            )
          })}
        </div>
      </section>

      {/* Style tokens */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Variant</Label>
          <Select
            value={config.variant ?? "default"}
            onValueChange={(v) => setConfig((c) => ({ ...c, variant: v === "default" ? undefined : v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">default</SelectItem>
              {VARIANTS.filter((v) => v !== "default").map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Theme</Label>
          <Select
            value={config.theme ?? "none"}
            onValueChange={(t) => setConfig((c) => ({ ...c, theme: t === "none" ? undefined : t }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="none" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">none</SelectItem>
              {THEMES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Live preview — demo badges keyed to the brand's colors/theme/variant */}
      <section className="flex flex-col gap-2">
        <Label>Preview</Label>
        <p className="text-xs text-muted-foreground">
          Real badges styled by this brand. {persisted ? "Uses your hosted logo/font via " : "Reflects your current tokens; save to resolve hosted assets via "}
          <code>?brand={slug || "acme"}</code>.
        </p>
        <BrandDemoBadges
          config={config}
          slug={slug || undefined}
          saved={persisted}
          hasLogo={storedAssets["mark"] != null || storedAssets["mark-alt"] != null}
          rev={logoRev}
        />
      </section>

      {/* Showcase badges — curated badges shown for this brand in /showcase */}
      <BrandShowcaseEditor
        badges={profile.showcaseBadges ?? []}
        onChange={(next) => setProfile((p) => ({ ...p, showcaseBadges: next }))}
        slug={slug || undefined}
        saved={persisted}
      />

      {/* Fonts */}
      <section className="flex flex-col gap-2">
        <Label>Custom fonts</Label>
        <p className="text-xs text-muted-foreground">
          Upload a TTF/OTF/WOFF to render this brand&apos;s badges in its typeface. Set a badge&apos;s
          font to <code>brand</code>, <code>brand-mono</code>, or <code>brand-heading</code>.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {FONT_SLOTS.map((slot) => {
            const stored = storedAssets[slot.kind]
            const busy = uploadingKind === slot.kind
            const filled = stored !== undefined && stored !== null
            return (
            <div key={slot.kind} className="relative">
              {filled && !busy && (
                <button
                  type="button"
                  onClick={() => removeAsset(slot.kind)}
                  aria-label={`Remove ${slot.label}`}
                  className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              )}
              <label
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-4 text-center text-xs transition-colors hover:bg-muted/30",
                  filled ? "border-solid border-border bg-muted/20" : "border-dashed border-border",
                  busy && "pointer-events-none opacity-70",
                )}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : filled ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Upload className="size-4 text-muted-foreground" />
                )}
                <span className="font-medium">{slot.label}</span>
                {filled ? (
                  <span className="max-w-full truncate text-[10px] text-muted-foreground">{stored || "uploaded"} · replace</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">TTF / OTF / WOFF</span>
                )}
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => e.target.files?.[0] && uploadAsset(slot.kind, e.target.files[0])}
                />
              </label>
            </div>
            )
          })}
        </div>
      </section>

      {/* brand.md preview */}
      {brandMd && (
        <section className="flex flex-col gap-2">
          <Label>brand.md</Label>
          <Textarea value={brandMd} readOnly rows={6} className="font-mono text-xs" />
        </section>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save brand
        </Button>
      </div>

      {/* Attribution */}
      <div className="flex items-center justify-center gap-2 border-t border-border pt-6 text-xs text-muted-foreground">
        <ContextDevLogo className="size-4 rounded" />
        <span>
          brand.md scraping &amp; generation provided by{" "}
          <a
            href="https://context.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Context.dev
          </a>
        </span>
      </div>
    </div>
  )
}
