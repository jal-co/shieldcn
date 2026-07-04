/**
 * shieldcn
 * app/api/portal/route.ts
 *
 * Polar customer portal. Sends the signed-in org's customer to Polar's hosted
 * portal to manage or cancel their subscription.
 */

import { CustomerPortal } from "@polar-sh/nextjs"
import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth"

const accessToken = process.env.POLAR_ACCESS_TOKEN
const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

export const GET = accessToken
  ? CustomerPortal({
      accessToken,
      server,
      // Customers are keyed by the org's external id (set at checkout).
      getExternalCustomerId: async () => {
        const auth = await requireOwner()
        return auth?.ownerId ?? ""
      },
    })
  : async () => NextResponse.json({ error: "billing not configured" }, { status: 503 })
