/**
 * shieldcn
 * app/api/studio/docs/route.ts
 *
 * Saved Studio documents (Plus+). List and create. Creating enforces the
 * plan's document cap (Plus = 2 at launch).
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOrg } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { listDocs, createDoc, PLUS_DOC_LIMIT } from "@shieldcn/core/studio-docs"

/** Per-plan saved-document caps. Free can't save to the cloud at all. */
const DOC_LIMIT: Record<string, number> = {
  free: 0,
  plus: PLUS_DOC_LIMIT,
  pro: 25,
}

export async function GET() {
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const docs = await listDocs(auth.orgId)
  return NextResponse.json({ docs })
}

export async function POST(req: NextRequest) {
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const plan = await getPlan(auth.orgId)
  const limit = DOC_LIMIT[plan] ?? 0
  if (limit === 0) {
    return NextResponse.json(
      { error: "saved READMEs require the Plus plan" },
      { status: 402 },
    )
  }

  let body: { name?: string; doc?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (body.doc == null) {
    return NextResponse.json({ error: "missing doc" }, { status: 400 })
  }

  try {
    const doc = await createDoc(
      auth.orgId,
      auth.session.userId,
      body.name ?? "Untitled",
      body.doc,
      limit,
    )
    return NextResponse.json(doc, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error"
    if (msg === "doc limit reached") {
      return NextResponse.json(
        { error: `document limit reached (${limit}). Upgrade for more.`, limit },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
