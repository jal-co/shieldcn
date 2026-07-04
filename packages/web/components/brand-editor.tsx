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

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { Brand, BrandConfig, BrandProfile, BrandFontKind } from "@shieldcn/core/brands"

interface ImportedLogos {
  lightLogoUrl?: string
  darkLogoUrl?: string
  markUrl?: string
}

const VARIANTS = ["default", "secondary", "outline", "ghost", "branded"]
const THEMES = ["zinc", "slate", "blue", "green", "rose", "orange", "violet", "purple", "cyan", "emerald"]
const FONT_SLOTS: { kind: BrandFontKind; label: string }[] = [
  { kind: "font-sans", label: "Sans (font=brand)" },
  { kind: "font-mono", label: "Mono (font=brand-mono)" },
  { kind: "font-heading", label: "Heading (font=brand-heading)" },
]

export function BrandEditor({ brand, create }: { brand?: Brand; create?: boolean }) {
  const router = useRouter()
  const [slug, setSlug] = useState(brand?.slug ?? "")
  const [name, setName] = useState(brand?.name ?? "")
  const [profile, setProfile] = useState<BrandProfile>(brand?.profile ?? {})
  const [config, setConfig] = useState<BrandConfig>(brand?.config ?? {})
  const [brandMd, setBrandMd] = useState<string | null>(brand?.brandMd ?? null)
  const [logos, setLogos] = useState<ImportedLogos>({})
  const [domain, setDomain] = useState("")
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)

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
      setLogos({ lightLogoUrl: p.lightLogoUrl, darkLogoUrl: p.darkLogoUrl, markUrl: p.iconUrl })
      if (!name && p.title) setName(p.title)
      if (!slug && p.domain) setSlug(p.domain.split(".")[0])
      if (palette[0]) setConfig((c) => ({ ...c, color: palette[0].hex.replace("#", "") }))
      toast.success("Brand imported — review and save")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "import failed")
    } finally {
      setImporting(false)
    }
  }

  async function save() {
    if (!slug.trim()) {
      toast.error("A slug is required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/brands/${slug.trim()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || null, config, profile, brandMd }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "save failed")

      // Host any freshly-imported logo URLs into brand_assets.
      if (logos.lightLogoUrl || logos.darkLogoUrl || logos.markUrl) {
        await fetch(`/api/brands/${slug.trim()}/logos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logos),
        }).catch(() => {})
      }
      toast.success("Brand saved")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "save failed")
    } finally {
      setSaving(false)
    }
  }

  async function uploadFont(kind: BrandFontKind, file: File) {
    if (!slug.trim()) {
      toast.error("Save the brand first, then upload fonts")
      return
    }
    const form = new FormData()
    form.set("kind", kind)
    form.set("file", file)
    const res = await fetch(`/api/brands/${slug.trim()}/assets`, { method: "POST", body: form })
    if (res.ok) toast.success(`Uploaded ${kind}`)
    else toast.error((await res.json()).error ?? "upload failed")
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
          <Button onClick={runImport} disabled={importing} variant="outline">
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Import
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
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!create} placeholder="acme" />
          <p className="text-xs text-muted-foreground">Used in URLs: <code>?brand={slug || "acme"}</code></p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc" />
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

      {/* Palette */}
      {palette.length > 0 && (
        <section className="flex flex-col gap-2">
          <Label>Palette</Label>
          <div className="flex flex-wrap gap-2">
            {palette.map((c, i) => (
              <button
                key={`${c.hex}-${i}`}
                type="button"
                onClick={() => setConfig((cf) => ({ ...cf, color: c.hex.replace("#", "") }))}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
                title={`Use ${c.hex} as the brand color`}
              >
                <span className="size-4 rounded" style={{ backgroundColor: c.hex }} />
                <span className="font-mono">{c.hex}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Logos */}
      {(logos.lightLogoUrl || logos.darkLogoUrl || brand) && (
        <section className="flex flex-col gap-2">
          <Label>Logos</Label>
          <div className="flex gap-4">
            {[
              { url: logos.lightLogoUrl ?? (brand && `/b/${brand.slug}/logo-light.svg`), bg: "#fff", label: "Light bg" },
              { url: logos.darkLogoUrl ?? (brand && `/b/${brand.slug}/logo-dark.svg`), bg: "#18181b", label: "Dark bg" },
            ].map((l) => (
              <div key={l.label} className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-28 items-center justify-center rounded-md border border-border" style={{ background: l.bg }}>
                  {l.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.url} alt={l.label} className="max-h-10 max-w-24 object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">none</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
          {logos.lightLogoUrl && (
            <p className="text-xs text-muted-foreground">Logos are hosted on save at <code>/b/{slug || "acme"}/logo-light.svg</code>.</p>
          )}
        </section>
      )}

      {/* Style tokens */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Variant</Label>
          <select
            className="h-9 rounded-md border border-border bg-transparent px-2 text-sm"
            value={config.variant ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, variant: e.target.value || undefined }))}
          >
            <option value="">default</option>
            {VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Theme</Label>
          <select
            className="h-9 rounded-md border border-border bg-transparent px-2 text-sm"
            value={config.theme ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, theme: e.target.value || undefined }))}
          >
            <option value="">none</option>
            {THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </section>

      {/* Fonts */}
      <section className="flex flex-col gap-2">
        <Label>Custom fonts</Label>
        <p className="text-xs text-muted-foreground">
          Upload a TTF/OTF/WOFF to render this brand&apos;s badges in its typeface. Set a badge&apos;s
          font to <code>brand</code>, <code>brand-mono</code>, or <code>brand-heading</code>.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {FONT_SLOTS.map((slot) => (
            <label key={slot.kind} className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-border px-3 py-4 text-center text-xs hover:bg-muted/30">
              <Upload className="size-4 text-muted-foreground" />
              <span>{slot.label}</span>
              <input
                type="file"
                accept=".ttf,.otf,.woff,.woff2,font/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFont(slot.kind, e.target.files[0])}
              />
            </label>
          ))}
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
    </div>
  )
}
