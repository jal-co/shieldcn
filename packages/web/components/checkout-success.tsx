"use client"

/**
 * shieldcn
 * components/checkout-success.tsx
 *
 * Mounted on the dashboard. When Polar redirects back with ?checkout=success,
 * refresh the client plan cache so gated UI unlocks immediately — and poll a
 * couple of times to cover the brief window before the Polar webhook has
 * written the subscription row. Strips the param so a reload doesn't re-fire.
 */

import { useEffect } from "react"
import { toast } from "sonner"
import { refreshMe } from "@/lib/use-me"

export function CheckoutSuccess() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout") !== "success") return
    window.history.replaceState({}, "", "/dashboard")

    let cancelled = false
    const poll = async (attempt: number) => {
      const me = await refreshMe()
      if (cancelled) return
      if (me.plan !== "free") {
        toast.success(`Welcome to ${me.plan.toUpperCase()} — you're all set.`)
        return
      }
      // Webhook may still be in flight; retry a few times before giving up.
      if (attempt < 3) setTimeout(() => void poll(attempt + 1), 2000)
    }
    void poll(0)
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
