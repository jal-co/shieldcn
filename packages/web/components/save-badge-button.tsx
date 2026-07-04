"use client"

/**
 * shieldcn
 * components/save-badge-button.tsx
 *
 * "Save badge" action for the badge builder and Studio. Persists the current
 * BuilderState to the owner's saved-badges library (POST /api/badges) so it can
 * be reused anywhere. Also captures a rendered SVG snapshot (best-effort) for
 * offline thumbnails.
 *
 * Auth-aware: signed-out users are sent to sign-in; a 402/409 (free cap or over
 * limit) nudges to /pricing via a toast. Kept deliberately small so it can slot
 * into any preview column.
 */

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Bookmark, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMe } from "@/lib/use-me"
import { buildBadgeUrl, type BuilderState } from "@/lib/badge-builder-shared"

/** Best-effort fetch of the badge's rendered SVG for a cached thumbnail. */
async function fetchSvgSnapshot(url: string): Promise<string | undefined> {
  try {
    const svgUrl = url.replace(/\.png(\?|$)/, ".svg$1")
    const res = await fetch(svgUrl, { credentials: "omit" })
    if (!res.ok) return undefined
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("svg")) return undefined
    const text = await res.text()
    return text.slice(0, 256 * 1024)
  } catch {
    return undefined
  }
}

export function SaveBadgeButton({
  state,
  defaultName,
  size = "sm",
  variant = "outline",
  className,
}: {
  state: BuilderState
  /** Suggested library name (falls back to the badge label / path). */
  defaultName?: string
  size?: "sm" | "default" | "lg" | "icon"
  variant?: "outline" | "default" | "ghost" | "secondary"
  className?: string
}) {
  const router = useRouter()
  const { me } = useMe()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const onSave = useCallback(async () => {
    if (!me.signedIn) {
      router.push("/sign-in?next=/dashboard/badges")
      return
    }
    const path = state.path?.trim()
    if (!path) { toast.error("Configure a badge first"); return }

    const name =
      (defaultName?.trim() || state.label?.trim() || deriveName(path)).slice(0, 200)
    const alt = (state.label?.trim() || name).slice(0, 300)

    setBusy(true)
    try {
      const url = buildBadgeUrl(state, window.location.origin)
      const svg = url ? await fetchSvgSnapshot(url) : undefined
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, alt, config: state, svg }),
      })
      if (res.ok) {
        setSaved(true)
        toast.success("Saved to your badge library", {
          action: { label: "View", onClick: () => router.push("/dashboard/badges") },
        })
        setTimeout(() => setSaved(false), 2500)
        return
      }
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) { router.push("/sign-in?next=/dashboard/badges"); return }
      if (res.status === 402 || res.status === 409) {
        toast.error(json.error ?? "You've hit your saved-badge limit", {
          action: { label: "Upgrade", onClick: () => router.push("/pricing") },
        })
        return
      }
      toast.error(json.error ?? "Couldn't save that badge")
    } catch {
      toast.error("Network error while saving")
    } finally {
      setBusy(false)
    }
  }, [me.signedIn, state, defaultName, router])

  return (
    <Button size={size} variant={variant} className={className} onClick={onSave} disabled={busy}>
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : saved ? (
        <Check className="size-4 text-emerald-500" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {size !== "icon" && (saved ? "Saved" : "Save badge")}
    </Button>
  )
}

/** Turn a badge path into a readable default name. */
function deriveName(path: string): string {
  const clean = path.replace(/^\//, "").replace(/\.(svg|png)$/, "")
  const parts = clean.split("/").filter(Boolean)
  // /badge/label-value-color → "label value"
  if (parts[0] === "badge" && parts[1]) {
    return decodeURIComponent(parts[1]).replace(/-/g, " ").split(" ").slice(0, 3).join(" ") || "Badge"
  }
  // /github/vercel/next.js/stars → "github stars"
  return [parts[0], parts[parts.length - 1]].filter(Boolean).join(" ") || "Badge"
}
