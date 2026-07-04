/**
 * shieldcn
 * app/api/studio/docs/[id]/route.ts
 *
 * Saved Studio document — fetch, update, delete. Org-scoped.
 *
 * Reads (GET) and deletes stay open to any org member so a lapsed subscriber
 * keeps read-only access to — and can clean up — work they already saved.
 * Editing (PUT) requires an active Plus plan: on lapse the doc goes read-only
 * but is never lost or held hostage (grace handling per the monetization plan).
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import { getDoc, updateDoc, deleteDoc } from "@shieldcn/core/studio-docs"

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

  const doc = await getDoc(auth.ownerId, id)
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    // Lapsed/free: read-only. The saved doc is still openable and exportable
    // via GET — editing is what requires an active subscription.
    return NextResponse.json(
      { error: "editing saved READMEs requires the Plus plan" },
      { status: 402 },
    )
  }
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  let body: { name?: string; doc?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (body.doc == null) return NextResponse.json({ error: "missing doc" }, { status: 400 })

  const doc = await updateDoc(auth.ownerId, id, body.name ?? "Untitled", body.doc)
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(doc)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const ok = await deleteDoc(auth.ownerId, id)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
