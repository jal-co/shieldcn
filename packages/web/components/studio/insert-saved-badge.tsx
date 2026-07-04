"use client"

/**
 * shieldcn
 * components/studio/insert-saved-badge.tsx
 *
 * "Insert saved badge" picker for the Studio badges inspector. Fetches the
 * owner's saved-badge library on open and lets the user drop one into the
 * current badges block. Signed-out users are pointed at the dashboard.
 *
 * The picker hands back the badge's BuilderState + alt; the inspector wraps it
 * in a BadgeItem and appends it — so an inserted badge is fully editable like
 * any other, not a frozen snapshot.
 */

import { useCallback, useState } from "react"
import Link from "next/link"
import { Bookmark, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useMe } from "@/lib/use-me"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { useHydrated } from "@/lib/use-hydrated"
import { buildBadgeUrl, BUILDER_DEFAULTS, type BuilderState } from "@/lib/badge-builder-shared"

interface SavedBadgeRow {
  id: number
  name: string
  alt: string
  config: unknown
}

function toState(config: unknown): BuilderState {
  return { ...BUILDER_DEFAULTS, ...(config as Partial<BuilderState> | null) }
}

export function InsertSavedBadge({
  onInsert,
}: {
  onInsert: (state: BuilderState, alt: string) => void
}) {
  const { me } = useMe()
  const { adaptUrl } = useBadgeMode()
  const mounted = useHydrated()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [badges, setBadges] = useState<SavedBadgeRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/badges", { credentials: "include" })
      if (!res.ok) { setBadges([]); return }
      const json = await res.json()
      setBadges(Array.isArray(json.badges) ? json.badges : [])
    } catch {
      setBadges([])
    } finally {
      setLoading(false)
    }
  }, [])

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (next) void load()
  }, [load])

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenChange(true)}>
        <Bookmark className="size-3.5" /> Insert saved badge
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert a saved badge</DialogTitle>
            <DialogDescription>
              Pick one from your library to add to this badge row.
            </DialogDescription>
          </DialogHeader>

          {!me.signedIn ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
                Sign in
              </Link>{" "}
              to build a saved-badge library.
            </p>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : badges.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No saved badges yet. Use the bookmark on any badge to save it here.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {badges.map((b) => {
                const url = buildBadgeUrl(toState(b.config), "")
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => { onInsert(toState(b.config), b.alt || b.name); setOpen(false) }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent/50"
                    >
                      <span className="flex h-6 min-w-16 items-center">
                        {mounted && url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={adaptUrl(url)} alt={b.alt || b.name} className="h-6 w-auto" />
                        ) : (
                          <span className="h-6 w-16 animate-pulse rounded bg-muted" />
                        )}
                      </span>
                      <span className="truncate">{b.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
