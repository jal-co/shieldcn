"use client"

/**
 * shieldcn
 * components/load-saved-component.tsx
 *
 * "Load saved component" picker for the standalone badge builder. When signed
 * in, fetches the owner's saved-component library and loads the chosen one's
 * BuilderState into the builder (fully editable, not a frozen snapshot).
 * Signed-out users are pointed at sign-in.
 */

import { useCallback, useState } from "react"
import Link from "next/link"
import { FolderOpen, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
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

export function LoadSavedComponent({
  onLoad,
  className,
}: {
  onLoad: (state: BuilderState) => void
  className?: string
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <FolderOpen className="size-3.5" /> Load saved
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load a saved component</DialogTitle>
          <DialogDescription>
            Pick one from your library to load into the builder — fully editable.
          </DialogDescription>
        </DialogHeader>

        {!me.signedIn ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            <Link href="/sign-in?next=/" className="underline underline-offset-4 hover:text-foreground">
              Sign in
            </Link>{" "}
            to build and load a saved-component library.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : badges.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No saved components yet. Configure a badge and hit{" "}
            <strong>Save</strong> to build your library.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {badges.map((b) => {
              const url = buildBadgeUrl(toState(b.config), "")
              return (
                <li key={b.id}>
                  <button
                    onClick={() => { onLoad(toState(b.config)); setOpen(false) }}
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
  )
}
