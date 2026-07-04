/**
 * shieldcn
 * app/api/badges/route.ts
 *
 * Saved badges library. List and create, keyed by the personal-first owner
 * (a user or a team). Creating enforces the plan's badge cap. Free gets a small
 * cloud allowance so creating an account is worthwhile — it's the growth hook —
 * while Plus raises the cap.
 *
 * The optional `svg` field is the rendered badge snapshot (a plain SVG string);
 * it's stored as bytes so the library can thumbnail without hitting the badge
 * engine. Snapshots are capped to keep rows small.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import {
  listSavedBadges,
  createSavedBadge,
  badgeLimitForPlan,
} from "@shieldcn/core/saved-badges"

/** Max stored snapshot size (SVG badges are tiny; this is a sanity ceiling). */
const MAX_SVG_BYTES = 256 * 1024

function svgToBuffer(svg: unknown): Buffer | null {
  if (typeof svg !== "string" || !svg.trim()) return null
  const buf = Buffer.from(svg, "utf8")
  return buf.byteLength <= MAX_SVG_BYTES ? buf : null
}

export async function GET() {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const badges = await listSavedBadges(auth.ownerId)
  return NextResponse.json({ badges })
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const plan = await getPlan(auth.ownerId)
  const limit = badgeLimitForPlan(plan)
  if (limit === 0) {
    return NextResponse.json(
      { error: "sign in to save badges to the cloud" },
      { status: 402 },
    )
  }

  let body: { name?: string; alt?: string; config?: unknown; svg?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (body.config == null) {
    return NextResponse.json({ error: "missing config" }, { status: 400 })
  }

  try {
    const badge = await createSavedBadge(
      auth.ownerId,
      auth.session.userId,
      {
        name: body.name ?? "Badge",
        alt: body.alt ?? "",
        config: body.config,
        svg: svgToBuffer(body.svg),
      },
      limit,
    )
    return NextResponse.json(badge, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error"
    if (msg === "badge limit reached") {
      return NextResponse.json(
        { error: `badge limit reached (${limit}). Upgrade for more.`, limit },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
