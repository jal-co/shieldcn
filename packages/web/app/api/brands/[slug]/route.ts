/**
 * shieldcn
 * app/api/brands/[slug]/route.ts
 *
 * Brand CRUD (admin only). Creating/editing/deleting a brand requires an admin
 * session. Reads happen through the badge handler (core getBrand), not here.
 */

import { NextResponse, type NextRequest } from "next/server"
import { getAdmin } from "@/lib/admin"
import {
  adminUpsertBrand,
  adminDeleteBrand,
  adminRenameBrand,
  getBrand,
  isValidBrandSlug,
  type BrandConfig,
  type BrandProfile,
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

  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { name?: string; config?: BrandConfig; profile?: BrandProfile; brandMd?: string | null; newSlug?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }

  // Optional rename: move the row (and its assets via FK) to the new slug
  // first, then upsert the content under the new slug.
  let targetSlug = slug
  if (body.newSlug && body.newSlug.toLowerCase() !== slug.toLowerCase()) {
    if (!isValidBrandSlug(body.newSlug)) {
      return NextResponse.json({ error: "invalid target slug" }, { status: 400 })
    }
    try {
      await adminRenameBrand(slug, body.newSlug)
      targetSlug = body.newSlug
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "rename failed" }, { status: 409 })
    }
  }

  const brand = await adminUpsertBrand(targetSlug, {
    name: body.name ?? null,
    config: body.config,
    profile: body.profile,
    brandMd: body.brandMd,
  }, admin.session.userId)
  return NextResponse.json(brand)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const ok = await adminDeleteBrand(slug)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
