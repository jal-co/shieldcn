"use client"

/**
 * shieldcn
 * components/billing-buttons.tsx
 *
 * Client billing actions backed by the Polar Better Auth plugin:
 *   - <CheckoutButton>  → authClient.checkout({ slug }) (redirects to Polar)
 *   - <PortalButton>    → authClient.customer.portal() (manage/cancel)
 *
 * Checkout requires a session (the plugin's authenticatedUsersOnly), so a
 * signed-out viewer is routed to sign-in with a return to the checkout intent.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { useMe } from "@/lib/use-me"
import { Button } from "@/components/ui/button"
import type { ComponentProps } from "react"

type ButtonProps = ComponentProps<typeof Button>

export function CheckoutButton({
  slug = "plus",
  children = "Get Plus",
  ...props
}: { slug?: string } & ButtonProps) {
  const router = useRouter()
  const { me } = useMe()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (!me.signedIn) {
      router.push("/sign-in?next=/pricing")
      return
    }
    setBusy(true)
    try {
      // On success this redirects to the Polar-hosted checkout (navigates away,
      // so `busy` is moot). On failure the client resolves with an error rather
      // than throwing, so re-enable the button in both the error and catch paths.
      const res = await authClient.checkout({ slug })
      if (res?.error) setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  return (
    <Button onClick={onClick} disabled={busy} {...props}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}

export function PortalButton({
  children = "Billing",
  ...props
}: ButtonProps) {
  const [busy, setBusy] = useState(false)

  async function onClick() {
    setBusy(true)
    try {
      // Success redirects to the Polar portal (navigates away); failure resolves
      // with an error instead of throwing, so re-enable in both paths.
      const res = await authClient.customer.portal()
      if (res?.error) setBusy(false)
    } catch {
      setBusy(false)
    }
  }

  return (
    <Button onClick={onClick} disabled={busy} {...props}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}
