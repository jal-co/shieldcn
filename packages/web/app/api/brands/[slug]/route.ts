/**
 * shieldcn
 * app/api/brands/[slug]/route.ts
 *
 * Brand CRUD. Creating/editing a brand requires an active organization on the
 * Pro plan; the brand is owned by that org. Reads happen through the badge
 * handler (core getBrand), not here.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOrg } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import {
  upsertBrand,
  deleteBrand,
  getBrand,
  isValidBrandSlug,
  type BrandConfig,
} from "@shieldcn/core/brands"

type Params = { params: Promise<{ slug: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const brand = await getBrand(slug)
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(brand)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { slug } = await params
  if (!isValidBrandSlug(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 })
  }

  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.orgId, "pro"))) {
    return NextResponse.json({ error: "brands require the Pro plan" }, { status: 402 })
  }

  let body: { name?: string; config?: BrandConfig }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  try {
    const brand = await upsertBrand(auth.orgId, slug, body.name ?? null, body.config ?? {})
    return NextResponse.json(brand)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error"
    // Slug owned by another org.
    return NextResponse.json({ error: msg }, { status: 409 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const ok = await deleteBrand(auth.orgId, slug)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
