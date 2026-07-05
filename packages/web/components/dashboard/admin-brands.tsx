"use client"

/**
 * shieldcn
 * components/dashboard/admin-brands.tsx
 *
 * Admin-only list of every brand across all owners, with edit/delete. Writes go
 * through the owner-agnostic admin paths on /api/brands/[slug].
 */

import { useState } from "react"
import Link from "next/link"
import { Loader2, Palette, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface AdminBrand {
  id: number
  slug: string
  name: string | null
  ownerId: string
}

export function AdminBrands({ initialBrands }: { initialBrands: AdminBrand[] }) {
  const [brands, setBrands] = useState<AdminBrand[]>(initialBrands)
  const [pendingDelete, setPendingDelete] = useState<AdminBrand | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const res = await fetch("/api/admin/brands", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      setBrands(Array.isArray(json.brands) ? json.brands : [])
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
      toast.success(`Deleted "${pendingDelete.name ?? pendingDelete.slug}"`)
      setPendingDelete(null)
      await load()
    } catch {
      toast.error("Couldn't delete that brand")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">All brands</h2>
        <span className="text-sm text-muted-foreground">({brands.length})</span>
      </div>

      {brands.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No brands exist yet.
        </p>
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
                  <span className="truncate text-sm font-medium">{b.name ?? b.slug}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    ?brand={b.slug} · owner {b.ownerId.slice(0, 8)}…
                  </span>
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
              &quot;{pendingDelete?.name ?? pendingDelete?.slug}&quot; and its hosted assets will be
              permanently deleted for its owner. Every embed referencing{" "}
              <code className="font-mono">?brand={pendingDelete?.slug}</code> falls back to defaults.
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
