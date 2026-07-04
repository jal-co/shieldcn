/**
 * shieldcn
 * app/api/badges/[id]/route.ts
 *
 * Saved badge — fetch, update, delete. Owner-scoped.
 *
 * Reads (GET) and deletes stay open to any owner so a lapsed subscriber keeps
 * read-only access to — and can clean up — badges they already saved. Editing
 * (PUT) requires an active Plus plan: on lapse the badge goes read-only but is
 * never lost or held hostage (grace handling per the monetization plan).
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import {
  getSavedBadge,
  updateSavedBadge,
  deleteSavedBadge,
} from "@shieldcn/core/saved-badges"

type Params = { params: Promise<{ id: string }> }

/** Max stored snapshot size (SVG badges are tiny; this is a sanity ceiling). */
const MAX_SVG_BYTES = 256 * 1024

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** undefined = leave snapshot untouched; Buffer/null = replace/clear. */
function svgToBuffer(svg: unknown): Buffer | null | undefined {
  if (svg === undefined) return undefined
  if (svg === null) return null
  if (typeof svg !== "string" || !svg.trim()) return null
  const buf = Buffer.from(svg, "utf8")
  return buf.byteLength <= MAX_SVG_BYTES ? buf : null
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const badge = await getSavedBadge(auth.ownerId, id)
  if (!badge) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(badge)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    // Lapsed/free: read-only. The saved badge is still openable via GET —
    // editing is what requires an active subscription.
    return NextResponse.json(
      { error: "editing saved badges requires the Plus plan" },
      { status: 402 },
    )
  }
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  let body: { name?: string; alt?: string; config?: unknown; svg?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (body.config == null) return NextResponse.json({ error: "missing config" }, { status: 400 })

  const badge = await updateSavedBadge(auth.ownerId, id, {
    name: body.name ?? "Badge",
    alt: body.alt ?? "",
    config: body.config,
    svg: svgToBuffer(body.svg),
  })
  if (!badge) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(badge)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const ok = await deleteSavedBadge(auth.ownerId, id)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
