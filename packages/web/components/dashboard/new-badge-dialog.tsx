"use client"

/**
 * shieldcn
 * components/dashboard/new-badge-dialog.tsx
 *
 * Build + save a badge without leaving the dashboard. Wraps BadgeBuilderCore in
 * a dialog with the standard SaveBadgeButton; on a successful save it closes and
 * calls onSaved so the library refreshes. This is the dashboard-native path to
 * grow the saved-badges library (the Studio inspector remains the other path).
 */

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { BadgeBuilderCore } from "@/components/badge-builder-core"
import { SaveBadgeButton } from "@/components/save-badge-button"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  BUILDER_DEFAULTS, buildBadgeUrl, type BuilderState,
} from "@/lib/badge-builder-shared"

export function NewBadgeDialog({
  onSaved,
  disabled,
}: {
  /** Called after a badge is saved (refresh the library list). */
  onSaved: () => void
  /** True when the user is at their plan cap (button is disabled). */
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [s, setS] = useState<BuilderState>(BUILDER_DEFAULTS)

  // Build with a real origin on the client so the preview + saved URL match.
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://shieldcn.dev"
  const url = useMemo(() => buildBadgeUrl(s, baseUrl), [s, baseUrl])

  function handleSaved() {
    onSaved()
    setOpen(false)
    setS(BUILDER_DEFAULTS) // reset for the next badge
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="size-4" /> New badge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New badge</DialogTitle>
          <DialogDescription>
            Configure a badge and save it to your library — reuse it in any README.
          </DialogDescription>
        </DialogHeader>

        <BadgeBuilderCore state={s} onChange={setS} badgeUrl={url} showHeader={false}>
          {url && (
            <div className="flex justify-end border-t border-border pt-4">
              <SaveBadgeButton state={s} size="default" variant="default" onSaved={handleSaved} />
            </div>
          )}
        </BadgeBuilderCore>
      </DialogContent>
    </Dialog>
  )
}
