/**
 * shieldcn
 * app/api/me/route.ts
 *
 * Lightweight "who am I" endpoint for client-side plan gating. Returns the
 * caller's session summary plus the plan of their active owner (personal
 * account or selected team) so the browser can show the right upgrade CTAs
 * (Plus) without duplicating server logic.
 *
 * Fail-open: an auth or DB hiccup resolves to a signed-out, free-plan shape
 * rather than a 500 — the UI just shows upgrade prompts.
 */

import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ signedIn: false, ownerId: null, orgId: null, plan: "free" })
  }

  // Personal-first: the owner is the active team if one is selected, else the
  // personal user account. Plan is read against that owner.
  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)
  return NextResponse.json({
    signedIn: true,
    userId: session.userId,
    ownerId,
    orgId: session.orgId,
    email: session.email ?? null,
    name: session.name ?? null,
    plan,
  })
}
