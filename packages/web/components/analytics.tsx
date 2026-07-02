"use client"

import { Suspense, useEffect, useSyncExternalStore } from "react"
import { useSearchParams } from "next/navigation"
import { OpenPanelComponent } from "@openpanel/nextjs"

const STORAGE_KEY = "shieldcn-no-track"
const noop = () => () => {}

function AnalyticsInner() {
  const searchParams = useSearchParams()
  const noTrackParam = searchParams.has("no-track")

  // Persist the opt-out when the ?no-track param is present. A write-only
  // effect (syncing React state OUT to an external store) — not a
  // setState-in-effect, so it doesn't trigger a cascading render.
  useEffect(() => {
    if (noTrackParam) localStorage.setItem(STORAGE_KEY, "true")
  }, [noTrackParam])

  // Read the persisted opt-out hydration-safely: false on the server / first
  // paint, the real localStorage value on the client — no setState-in-effect,
  // and no flash of the analytics script loading before the opt-out is honored.
  const persistedOptOut = useSyncExternalStore(
    noop,
    () => localStorage.getItem(STORAGE_KEY) === "true",
    () => false,
  )

  if (noTrackParam || persistedOptOut) return null

  return (
    <OpenPanelComponent
      clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ?? ""}
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
    />
  )
}

export function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  )
}
