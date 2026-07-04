/**
 * shieldcn
 * app/api/badges/[id]/svg/route.ts
 *
 * Serve a saved badge's cached SVG snapshot for library thumbnails. Owner-
 * scoped: only the badge's owner can read it. Returns 404 when the badge (or
 * its snapshot) is missing so the client falls back to rendering the live URL.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { getSavedBadgeSvg } from "@shieldcn/core/saved-badges"

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const svg = await getSavedBadgeSvg(auth.ownerId, id)
  if (!svg) return NextResponse.json({ error: "not found" }, { status: 404 })

  return new NextResponse(new Uint8Array(svg), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  })
}
