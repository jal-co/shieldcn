"use client"

import { OpenPanelComponent } from "@openpanel/nextjs"

export function Analytics() {
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
