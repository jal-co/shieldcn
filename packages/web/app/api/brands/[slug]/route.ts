/**
 * shieldcn
 * app/api/brands/[slug]/route.ts
 *
 * Brand CRUD. Creating/editing a brand requires the Plus plan; the brand is
 * owned by that account. Reads happen through the badge handler (core
 * getBrand), not here.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { isAdminSession } from "@/lib/admin"
import {
  upsertBrand,
  deleteBrand,
  adminUpsertBrand,
  adminDeleteBrand,
  adminRenameBrand,
  getBrand,
  getOwnedBrand,
  countBrandsByOwner,
  brandLimitForPlan,
  isValidBrandSlug,
  type BrandConfig,
  type BrandProfile,
} from "@shieldcn/core/brands"
import { getPlan } from "@shieldcn/core/entitlements"


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

  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const admin = isAdminSession(auth.session)

  // Admins bypass plan + ownership + cap: they can create/edit/rename any brand.
  if (admin) {
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
    }, auth.ownerId)
    return NextResponse.json(brand)
  }

  const plan = await getPlan(auth.ownerId)
  if (plan !== "plus") {
    return NextResponse.json({ error: "brands require the Plus plan" }, { status: 402 })
  }

  // Enforce the brand cap, but only for a genuinely new brand (editing an
  // existing one must always succeed, even at the cap).
  const existing = await getOwnedBrand(auth.ownerId, slug)
  if (!existing) {
    const [count, limit] = [await countBrandsByOwner(auth.ownerId), brandLimitForPlan(plan)]
    if (count >= limit) {
      return NextResponse.json(
        { error: `brand limit reached (${limit}). Delete one or contact us for more.`, limit },
        { status: 409 },
      )
    }
  }

  let body: {
    name?: string
    config?: BrandConfig
    profile?: BrandProfile
    brandMd?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  try {
    const brand = await upsertBrand(auth.ownerId, slug, {
      name: body.name ?? null,
      config: body.config,
      profile: body.profile,
      brandMd: body.brandMd,
    })
    return NextResponse.json(brand)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error"
    // Slug owned by another org.
    return NextResponse.json({ error: msg }, { status: 409 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const ok = isAdminSession(auth.session)
    ? await adminDeleteBrand(slug)
    : await deleteBrand(auth.ownerId, slug)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
