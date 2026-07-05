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
import { toast } from "sonner"

interface BrandRow {
  id: number
  slug: string
  name: string | null
}

export function BrandsList({ initialBrands }: { initialBrands: BrandRow[] }) {
  const [brands, setBrands] = useState<BrandRow[]>(initialBrands)
  const [pendingDelete, setPendingDelete] = useState<BrandRow | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const res = await fetch("/api/brands", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      const list = Array.isArray(json.brands) ? json.brands : []
      setBrands(list.map((b: { id: number; slug: string; name: string | null }) => ({
        id: b.id, slug: b.slug, name: b.name,
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
              className="group flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                  <Palette className="size-4" />
                </span>
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
