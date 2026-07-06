"use client"

/**
 * shieldcn
 * components/brand-showcase-editor.tsx
 *
 * Manage a brand's curated showcase badges (up to MAX_BRAND_SHOWCASE). Each is
 * built with the full badge builder; the resolved relative path is stored on
 * the brand (profile.showcaseBadges) and fed into the global /showcase, styled
 * with this brand via ?brand=slug.
 */

import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { BuilderV2Core } from "@/components/builder-v2/core"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { useHydrated } from "@/lib/use-hydrated"
import {
  BUILDER_V2_DEFAULTS,
  buildBadgePathV2,
  type BuilderV2State,
} from "@/components/builder-v2/state"

// Kept in sync with @shieldcn/core/brands (which is DB-backed and Node-only, so
// we don't import it into this client component).
export const MAX_BRAND_SHOWCASE = 5
export interface BrandShowcaseBadge {
  path: string
  alt?: string
}

/** Render a stored showcase badge, styled by the brand when saved. */
function badgePreviewUrl(path: string, slug: string | undefined, saved: boolean): string {
  if (saved && slug) {
    return `${path}${path.includes("?") ? "&" : "?"}brand=${slug}`
  }
  return path
}

export function BrandShowcaseEditor({
  badges,
  onChange,
  slug,
  saved,
}: {
  badges: BrandShowcaseBadge[]
  onChange: (next: BrandShowcaseBadge[]) => void
  slug?: string
  saved: boolean
}) {
  const { adaptUrl } = useBadgeMode()
  const mounted = useHydrated()
  const [open, setOpen] = useState(false)
  // Showcase badges are always rendered with ?brand=slug, so default them to
  // the branded variant — the brand supplies the color/logo.
  const [draft, setDraft] = useState<BuilderV2State>({ ...BUILDER_V2_DEFAULTS, variant: "branded" })
  const [alt, setAlt] = useState("")

  const atLimit = badges.length >= MAX_BRAND_SHOWCASE
  const draftPath = useMemo(() => buildBadgePathV2(draft), [draft])

  function addBadge() {
    if (!draftPath) return
    onChange([...badges, { path: draftPath, alt: alt.trim() || undefined }])
    setDraft({ ...BUILDER_V2_DEFAULTS, variant: "branded" })
    setAlt("")
    setOpen(false)
  }

  function removeBadge(i: number) {
    onChange(badges.filter((_, idx) => idx !== i))
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Showcase badges</Label>
        <span className="text-xs text-muted-foreground">{badges.length} / {MAX_BRAND_SHOWCASE}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Up to {MAX_BRAND_SHOWCASE} badges shown for this brand in the public showcase. Each is styled
        by this brand automatically.
      </p>

      {badges.length > 0 && (
        <ul className="flex flex-col gap-1">
          {badges.map((b, i) => {
            const url = badgePreviewUrl(b.path, slug, saved)
            return (
              <li
                key={`${b.path}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 min-w-16 items-center">
                    {mounted ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={adaptUrl(url)} alt={b.alt || "badge"} className="h-6 w-auto" />
                    ) : (
                      <span className="h-6 w-16 animate-pulse rounded bg-muted" />
                    )}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{b.path}</span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeBadge(i)}
                  aria-label="Remove showcase badge"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="self-start" disabled={atLimit}>
            <Plus className="size-4" /> {atLimit ? "Limit reached" : "Add badge"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add a showcase badge</DialogTitle>
            <DialogDescription>
              Build the badge; this brand&apos;s style is applied in the showcase. Colors/logo you set
              here are the badge&apos;s own explicit values.
            </DialogDescription>
          </DialogHeader>

          <BuilderV2Core state={draft} onChange={setDraft} badgeUrl={draftPath} layout="stacked" showFormat={false} brandStyled />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="showcase-alt">Caption (optional)</Label>
            <Input
              id="showcase-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="e.g. Build status"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addBadge} disabled={!draftPath}>
              <Plus className="size-4" /> Add badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
