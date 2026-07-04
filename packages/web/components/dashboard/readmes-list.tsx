"use client"

/**
 * shieldcn
 * components/dashboard/readmes-list.tsx
 *
 * Saved-README manager: list, open in the Studio, delete (with confirmation),
 * create new, and a usage meter against the plan cap. Server passes the initial
 * docs + limit; mutations refetch from /api/studio/docs so the meter stays
 * accurate without a full reload.
 */

import { useState } from "react"
import Link from "next/link"
import { FileText, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Doc {
  id: number
  name: string
  updatedAt: string
}

export function ReadmesList({
  initialDocs,
  limit,
  plan,
}: {
  initialDocs: Doc[]
  limit: number
  plan: "free" | "plus"
}) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs)
  const [pendingDelete, setPendingDelete] = useState<Doc | null>(null)
  const [busy, setBusy] = useState(false)

  const atLimit = docs.length >= limit

  async function refresh() {
    try {
      const res = await fetch("/api/studio/docs", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      setDocs(Array.isArray(json.docs) ? json.docs : [])
    } catch {
      /* best-effort */
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      const res = await fetch(`/api/studio/docs/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      toast.success(`Deleted “${pendingDelete.name}”`)
      setPendingDelete(null)
      await refresh()
    } catch {
      toast.error("Couldn't delete that README")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <UsageMeter
          used={docs.length}
          limit={limit}
          label="saved"
          upsellHref={plan === "free" ? "/pricing" : undefined}
          upsellLabel="Upgrade for more"
        />
        <Button asChild size="sm" disabled={atLimit}>
          <Link href={atLimit ? "/pricing" : "/studio"}>
            <Plus className="size-4" /> New README
          </Link>
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">No saved READMEs yet</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Build a README in the Studio and save it to the cloud — it syncs
              across your devices and auto-saves as you edit.
            </p>
          </div>
          <Button asChild>
            <Link href="/studio">
              <Plus className="size-4" /> Open the Studio
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(d.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/studio?doc=${d.id}`}>Edit</Link>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingDelete(d)}
                  aria-label={`Delete ${d.name}`}
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
            <AlertDialogTitle>Delete this README?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be permanently removed from the cloud.
              This can&apos;t be undone.
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
