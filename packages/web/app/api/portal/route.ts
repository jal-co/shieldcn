/**
 * shieldcn
 * app/api/portal/route.ts
 *
 * Polar customer portal. Sends the signed-in owner (personal account or active
 * team) to Polar's hosted portal to manage or cancel their subscription.
 *
 * Robust by construction: the portal must never 500. A missing session goes to
 * sign-in, and any Polar error (no customer for the active owner, server
 * mismatch, etc.) degrades to pricing instead of a raw 500.
 *
 * Deliberately does NOT gate on getPlan(): the portal depends on Polar, not on
 * our database. getPlan fails open to "free" during a DB outage, so gating on
 * it would misroute a real paying customer — whose Polar customer is perfectly
 * reachable — to a "no subscription" page. The catch below already handles the
 * genuinely-no-customer case, so the plan check would be both redundant and
 * harmful.
 */

import { CustomerPortal } from "@polar-sh/nextjs"
import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"

const accessToken = process.env.POLAR_ACCESS_TOKEN
const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

export async function GET(req: NextRequest) {
  if (!accessToken) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 })
  }

  const auth = await requireOwner()
  if (!auth) return NextResponse.redirect(new URL("/sign-in", req.url))

  try {
    const handler = CustomerPortal({
      accessToken,
      server,
      // Customers are keyed by the owner's external id (set at checkout).
      getExternalCustomerId: async () => auth.ownerId,
    })
    return await handler(req)
  } catch {
    // No Polar customer for this owner (never checked out, or checkout was on a
    // different workspace), or a Polar/server hiccup — never surface a 500.
    return NextResponse.redirect(new URL("/pricing?billing=unavailable", req.url))
  }
}
