"use client"

/**
 * shieldcn
 * components/dashboard/brands-list.tsx
 *
 * Brand manager: list, edit, delete (with confirmation), and create new.
 * Server passes the initial brands; delete refetches from /api/brands.
 */

import { useState } from "react"
import Link from "next/link"
import { Loader2, Palette, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { useHydrated } from "@/lib/use-hydrated"
import { toast } from "sonner"

interface BrandRow {
  id: number
  slug: string
  name: string | null
  /** Primary brand color (hex, no #), for the row tint. */
  color?: string | null
  /** Secondary color, used for the tint when the primary is too dark. */
  color2?: string | null
}

/** Parse a 3/6-digit hex (with or without #) to [r,g,b], or null. */
function hexToRgb(hex?: string | null): [number, number, number] | null {
  if (!hex) return null
  let h = hex.replace(/^#/, "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Relative luminance (0–1) via the sRGB coefficients. */
function luminance(rgb: [number, number, number]): number {
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
}

/**
 * A faint tint for a brand row: the primary color at low alpha, or the
 * secondary color when the primary is too dark to read on a dark surface.
 * Returns undefined when neither color is usable (no tint).
 */
function rowTint(color?: string | null, color2?: string | null): string | undefined {
  const primary = hexToRgb(color)
  const secondary = hexToRgb(color2)
  const chosen = primary && luminance(primary) >= 0.12 ? primary : (secondary ?? primary)
  if (!chosen) return undefined
  return `rgba(${chosen[0]}, ${chosen[1]}, ${chosen[2]}, 0.10)`
}

export function BrandsList({ initialBrands }: { initialBrands: BrandRow[] }) {
  const [brands, setBrands] = useState<BrandRow[]>(initialBrands)
  const [pendingDelete, setPendingDelete] = useState<BrandRow | null>(null)
  const [busy, setBusy] = useState(false)
  const mounted = useHydrated()
  const { adaptUrl } = useBadgeMode()

  async function refresh() {
    try {
      const res = await fetch("/api/brands", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      const list = Array.isArray(json.brands) ? json.brands : []
      setBrands(list.map((b: { id: number; slug: string; name: string | null; config?: { color?: string; color2?: string } }) => ({
        id: b.id, slug: b.slug, name: b.name,
        color: b.config?.color ?? null, color2: b.config?.color2 ?? null,
      })))
    } catch {
      /* best-effort */
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      const res = await fetch(`/api/brands/${pendingDelete.slug}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      toast.success(`Deleted “${pendingDelete.name ?? pendingDelete.slug}”`)
      setPendingDelete(null)
      await refresh()
    } catch {
      toast.error("Couldn't delete that brand")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end gap-4">
        <Button asChild size="sm">
          <Link href="/dashboard/brands/new">
            <Plus className="size-4" /> New brand
          </Link>
        </Button>
      </div>

      {brands.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted">
            <Palette className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">No brands yet</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Import a brand from its domain or build one by hand — logo, palette,
              and fonts — then reference it everywhere with a URL.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/brands/new">
              <Plus className="size-4" /> Create your first brand
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {brands.map((b) => (
            <li
              key={b.id}
              style={{ backgroundColor: rowTint(b.color, b.color2) }}
              className="group flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                {mounted ? (
                  // The brand's own logo on its brand color — a live icon chip.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={adaptUrl(`/badge/-.svg?brand=${b.slug}&variant=branded`)}
                    alt=""
                    className="size-8 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                    <Palette className="size-4" />
                  </span>
                )}
                <div className="flex min-w-0 flex-col">
                  <Link
                    href={`/dashboard/brands/${b.slug}`}
                    className="truncate text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {b.name ?? b.slug}
                  </Link>
                  <span className="truncate font-mono text-xs text-muted-foreground">?brand={b.slug}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/brands/${b.slug}`}>Edit</Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingDelete(b)}
                  aria-label={`Delete ${b.name ?? b.slug}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this brand?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name ?? pendingDelete?.slug}” will be permanently
              deleted, along with its hosted logos and fonts. Every badge and
              header that references{" "}
              <code className="font-mono">?brand={pendingDelete?.slug}</code>{" "}
              will fall back to defaults. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete() }}
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
