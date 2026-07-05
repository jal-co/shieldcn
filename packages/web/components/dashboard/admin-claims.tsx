"use client"

/**
 * shieldcn
 * components/dashboard/admin-claims.tsx
 *
 * Admin-only "claim your brand" invite generator + list. Create a link tied to
 * a brand slug; sending it lets someone sign up, get Plus, and own that brand.
 */

import { useState } from "react"
import { Check, Copy, Link2, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface Claim {
  token: string
  brandSlug: string
  brandName: string | null
  claimedBy: string | null
  claimedAt: string | null
  expiresAt: string | null
  createdAt: string
  url: string
}

export function AdminClaims({ initialClaims }: { initialClaims: Claim[] }) {
  const [claims, setClaims] = useState<Claim[]>(initialClaims)
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  async function refresh() {
    try {
      const res = await fetch("/api/admin/claims", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      setClaims(Array.isArray(json.claims) ? json.claims : [])
    } catch {
      /* best-effort */
    }
  }

  async function create() {
    const s = slug.trim().toLowerCase()
    if (!s) { toast.error("Enter a brand slug"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ brandSlug: s, brandName: name.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "failed to create")
      setSlug(""); setName("")
      await copy(json.url)
      toast.success("Claim link created & copied")
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to create")
    } finally {
      setCreating(false)
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500)
    } catch {
      /* ignore */
    }
  }

  async function revoke(token: string) {
    try {
      const res = await fetch(`/api/admin/claims?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      toast.success("Claim revoked")
      await refresh()
    } catch {
      toast.error("Couldn't revoke that claim")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">Claim-your-brand invites</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Generate a link for someone (e.g. a company). When they open it and sign in,
        they get a Plus account and ownership of that brand.
      </p>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-slug">Brand slug</Label>
          <Input
            id="claim-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="vercel"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-name">Brand name (optional)</Label>
          <Input id="claim-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vercel" />
        </div>
        <Button onClick={create} disabled={creating} className="sm:h-9">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          Generate link
        </Button>
      </div>

      {claims.length > 0 && (
        <ul className="flex flex-col gap-1">
          {claims.map((c) => (
            <li
              key={c.token}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {c.brandName ?? c.brandSlug}
                  {c.claimedBy ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                      Claimed
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      Pending
                    </span>
                  )}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">{c.url}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => copy(c.url)}>
                  {copied === c.url ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copy
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => revoke(c.token)}
                  aria-label="Revoke claim"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
