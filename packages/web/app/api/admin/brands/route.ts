/**
 * shieldcn
 * app/api/admin/brands/route
 *
 * GET — list every brand across all owners (admin only).
 */

import { NextResponse } from "next/server"
import { getAdmin } from "@/lib/admin"
import { listAllBrands } from "@shieldcn/core/brands"

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const brands = await listAllBrands()
  return NextResponse.json({
    brands: brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name, ownerId: b.ownerId })),
  })
}
