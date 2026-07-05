"use client"

/**
 * shieldcn
 * components/onboarding/welcome-gate.tsx
 *
 * Client guard for /welcome. Onboarding completion is tracked in localStorage
 * (client-only), so the server can't decide the redirect. This reads that state
 * after hydration and sends already-onboarded users straight to /dashboard, so
 * /welcome only ever shows to people who actually have steps left.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMe } from "@/lib/use-me"
import { isOnboardingComplete } from "@/lib/onboarding"

export function WelcomeGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { me } = useMe()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isOnboardingComplete(me.userId ?? null, me.plan)) {
      router.replace("/dashboard")
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true)
  }, [me.userId, me.plan, router])

  if (!checked) return null
  return <>{children}</>
}
