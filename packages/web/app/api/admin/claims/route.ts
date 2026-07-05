/**
 * shieldcn
 * app/api/admin/claims/route
 *
 * Admin-only "claim your brand" invites.
 * GET    — list recent claims.
 * POST   — create a claim { brandSlug, brandName?, config?, expiresInDays? } → { claim, url }.
 * DELETE — revoke a claim (?token=...).
 */

import { NextResponse, type NextRequest } from "next/server"
import { getAdmin } from "@/lib/admin"
import { isValidBrandSlug, type BrandConfig } from "@shieldcn/core/brands"
import {
  createBrandClaim,
  listBrandClaims,
  deleteBrandClaim,
} from "@shieldcn/core/brand-claims"

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://shieldcn.dev"

function claimUrl(token: string): string {
  return `${SITE}/claim/${token}`
}

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const claims = await listBrandClaims()
  return NextResponse.json({
    claims: claims.map((c) => ({ ...c, url: claimUrl(c.token) })),
  })
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const brandSlug = String(body?.brandSlug ?? "").toLowerCase().trim()
  if (!isValidBrandSlug(brandSlug)) {
    return NextResponse.json({ error: "invalid or reserved brand slug" }, { status: 400 })
  }
  const brandName = typeof body?.brandName === "string" ? body.brandName.slice(0, 120) : null
  const config = (body?.config && typeof body.config === "object" ? body.config : {}) as BrandConfig
  const expiresInDays =
    typeof body?.expiresInDays === "number" && body.expiresInDays > 0 ? Math.min(body.expiresInDays, 365) : null

  const claim = await createBrandClaim({
    brandSlug,
    brandName,
    config,
    createdBy: admin.session.userId,
    expiresInDays,
  })
  return NextResponse.json({ claim: { ...claim, url: claimUrl(claim.token) }, url: claimUrl(claim.token) })
}

export async function DELETE(req: NextRequest) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const token = new URL(req.url).searchParams.get("token") ?? ""
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 })
  const ok = await deleteBrandClaim(token)
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
