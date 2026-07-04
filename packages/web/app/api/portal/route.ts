/**
 * shieldcn
 * app/api/portal/route.ts
 *
 * Polar customer portal. Sends the signed-in owner (personal account or active
 * team) to Polar's hosted portal to manage or cancel their subscription.
 *
 * Robust by construction: the portal must never 500. Callers with no session
 * go to sign-in, callers with no paid plan go to pricing (nothing to manage),
 * and any Polar error (customer not found for the active owner, server
 * mismatch, etc.) degrades to pricing instead of a raw 500.
 */

import { CustomerPortal } from "@polar-sh/nextjs"
import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"

const accessToken = process.env.POLAR_ACCESS_TOKEN
const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

export async function GET(req: NextRequest) {
  if (!accessToken) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 })
  }

  const auth = await requireOwner()
  if (!auth) return NextResponse.redirect(new URL("/sign-in", req.url))

  // A Polar customer only exists for an owner that has checked out. Without a
  // paid plan there's nothing to manage — send them to pricing rather than
  // asking Polar for a portal session that doesn't exist (which would 500).
  const plan = await getPlan(auth.ownerId)
  if (plan === "free") {
    return NextResponse.redirect(new URL("/pricing?billing=none", req.url))
  }

  try {
    const handler = CustomerPortal({
      accessToken,
      server,
      // Customers are keyed by the owner's external id (set at checkout).
      getExternalCustomerId: async () => auth.ownerId,
    })
    return await handler(req)
  } catch {
    // Customer not found for this owner (e.g. checkout was on a different
    // workspace), or a Polar/server hiccup — never surface a 500.
    return NextResponse.redirect(new URL("/pricing?billing=unavailable", req.url))
  }
}
