"use client"

/**
 * shieldcn
 * components/auth/create-org-dialog.tsx
 *
 * Create a new team — an opt-in shared workspace for collaborating on brands
 * and READMEs. On success we set it active so the dashboard immediately scopes
 * to it. Built from shadcn Dialog + form primitives against the Neon Auth org
 * API ("organization" is the API term; the UI calls it a Team).
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** Turn a display name into a URL-safe org slug. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function CreateOrgDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveSlug = slugEdited ? slug : slugify(name)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !effectiveSlug) {
      setError("A name is required")
      return
    }
    setPending(true)
    try {
      const created = await authClient.organization.create({
        name: name.trim(),
        slug: effectiveSlug,
      })
      if (created.error) {
        setError(created.error.message ?? "Could not create team")
        return
      }
      if (created.data?.id) {
        await authClient.organization.setActive({ organizationId: created.data.id })
      }
      onOpenChange(false)
      setName("")
      setSlug("")
      setSlugEdited(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create team")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            A team is a shared workspace — invite people to collaborate on brands
            and saved READMEs together. You can keep working solo on your
            personal account and skip this entirely.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugEdited(true)
                setSlug(slugify(e.target.value))
              }}
              placeholder="acme"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
