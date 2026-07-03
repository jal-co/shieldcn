/**
 * shieldcn
 * app/api/portal/route.ts
 *
 * Polar customer portal. Sends the signed-in org's customer to Polar's hosted
 * portal to manage or cancel their subscription.
 */

import { CustomerPortal } from "@polar-sh/nextjs"
import { NextResponse } from "next/server"
import { requireOrg } from "@/lib/auth"

const accessToken = process.env.POLAR_ACCESS_TOKEN
const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

export const GET = accessToken
  ? CustomerPortal({
      accessToken,
      server,
      getCustomerId: async () => {
        const auth = await requireOrg()
        // Polar resolves the customer by the external id we set at checkout.
        return auth?.orgId ?? ""
      },
    })
  : async () => NextResponse.json({ error: "billing not configured" }, { status: 503 })
