/**
 * shieldcn
 * app/api/studio/docs/route.ts
 *
 * Saved Studio documents. List and create, keyed by the personal-first owner
 * (a user or a team). Creating enforces the plan's document cap. Free gets a
 * small cloud allowance so creating an account is worthwhile — it's the growth
 * hook — while Plus raises the cap.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { listDocs, createDoc, docLimitForPlan } from "@shieldcn/core/studio-docs"

export async function GET() {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const docs = await listDocs(auth.ownerId)
  return NextResponse.json({ docs })
}

export async function POST(req: NextRequest) {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const plan = await getPlan(auth.ownerId)
  const limit = docLimitForPlan(plan)
  if (limit === 0) {
    return NextResponse.json(
      { error: "sign in to save READMEs to the cloud" },
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
      auth.ownerId,
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
