"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { OpenPanelComponent } from "@openpanel/nextjs"

const STORAGE_KEY = "shieldcn-no-track"

function AnalyticsInner() {
  const [enabled, setEnabled] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.has("no-track")) {
      localStorage.setItem(STORAGE_KEY, "true")
      setEnabled(false)
      return
    }

    if (localStorage.getItem(STORAGE_KEY) === "true") {
      setEnabled(false)
    }
  }, [searchParams])

  if (!enabled) return null

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
