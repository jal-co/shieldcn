/**
 * shieldcn
 * app/api/studio/docs/[id]/route.ts
 *
 * Saved Studio document — fetch, update, delete. Org-scoped.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOrg } from "@/lib/auth"
import { getDoc, updateDoc, deleteDoc } from "@shieldcn/core/studio-docs"

type Params = { params: Promise<{ id: string }> }

function parseId(raw: string): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const doc = await getDoc(auth.orgId, id)
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  let body: { name?: string; doc?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (body.doc == null) return NextResponse.json({ error: "missing doc" }, { status: 400 })

  const doc = await updateDoc(auth.orgId, id, body.name ?? "Untitled", body.doc)
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(doc)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const id = parseId((await params).id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const ok = await deleteDoc(auth.orgId, id)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
