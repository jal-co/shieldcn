"use client"

/**
 * shieldcn
 * components/dashboard/badges-library.tsx
 *
 * Saved-badges manager: list with live thumbnails, copy Markdown, open in the
 * Studio, delete (with confirmation), and a usage meter against the plan cap.
 * Server passes the initial badges + limit; delete refetches from /api/badges
 * so the meter stays accurate without a full reload.
 *
 * Thumbnails render the badge's live URL (built from its saved BuilderState) so
 * the row always reflects the current engine output; the cached SVG snapshot is
 * used elsewhere (Studio picker) where an offline thumbnail matters.
 */

import { useState } from "react"
import Link from "next/link"
import { BadgeCheck, Copy, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UsageMeter } from "@/components/dashboard/usage-meter"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { useHydrated } from "@/lib/use-hydrated"
import { buildBadgeUrl, BUILDER_DEFAULTS, type BuilderState } from "@/lib/badge-builder-shared"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface SavedBadgeRow {
  id: number
  name: string
  alt: string
  config: unknown
  hasSvg: boolean
  updatedAt: string
}

/** Coerce stored JSON config into a full BuilderState (defaults fill gaps). */
function toState(config: unknown): BuilderState {
  return { ...BUILDER_DEFAULTS, ...(config as Partial<BuilderState> | null) }
}

export function BadgesLibrary({
  initialBadges,
  limit,
  plan,
}: {
  initialBadges: SavedBadgeRow[]
  limit: number
  plan: "free" | "plus"
}) {
  const [badges, setBadges] = useState<SavedBadgeRow[]>(initialBadges)
  const [pendingDelete, setPendingDelete] = useState<SavedBadgeRow | null>(null)
  const [busy, setBusy] = useState(false)
  const { adaptUrl } = useBadgeMode()
  const mounted = useHydrated()

  const atLimit = badges.length >= limit

  async function refresh() {
    try {
      const res = await fetch("/api/badges", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      setBadges(Array.isArray(json.badges) ? json.badges : [])
    } catch {
      /* best-effort */
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setBusy(true)
    try {
      const res = await fetch(`/api/badges/${pendingDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      toast.success(`Deleted “${pendingDelete.name}”`)
      setPendingDelete(null)
      await refresh()
    } catch {
      toast.error("Couldn't delete that badge")
    } finally {
      setBusy(false)
    }
  }

  function copyMarkdown(b: SavedBadgeRow) {
    const url = buildBadgeUrl(toState(b.config), window.location.origin)
    if (!url) { toast.error("This badge has no URL"); return }
    const md = `![${b.alt || b.name}](${url})`
    void navigator.clipboard.writeText(md)
    toast.success("Markdown copied")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <UsageMeter
          used={badges.length}
          limit={limit}
          label="saved"
          upsellHref={plan === "free" ? "/pricing" : undefined}
          upsellLabel="Upgrade for more"
        />
        <Button asChild size="sm" disabled={atLimit}>
          <Link href={atLimit ? "/pricing" : "/studio"}>Save from Studio</Link>
        </Button>
      </div>

      {badges.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <BadgeCheck className="size-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">No saved badges yet</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Configure a badge in the Studio or the builder, hit{" "}
              <strong>Save badge</strong>, and it lands here — ready to reuse
              anywhere with one click.
            </p>
          </div>
          <Button asChild>
            <Link href="/studio">Open the Studio</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {badges.map((b) => {
            const url = buildBadgeUrl(toState(b.config), "")
            return (
              <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 min-w-16 items-center">
                    {mounted && url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={adaptUrl(url)} alt={b.alt || b.name} className="h-6 w-auto" />
                    ) : (
                      <span className="h-6 w-16 animate-pulse rounded bg-muted" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Updated {new Date(b.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => copyMarkdown(b)}>
                    <Copy className="size-3.5" /> Copy
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(b)}
                    aria-label={`Delete ${b.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this badge?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be removed from your library. READMEs
              that already embed its URL keep working — this only removes it from
              your saved collection. This can&apos;t be undone.
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
