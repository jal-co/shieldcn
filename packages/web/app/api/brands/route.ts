/**
 * shieldcn
 * app/api/brands/route.ts
 *
 * List every brand (admin dashboard).
 */

import { NextResponse } from "next/server"
import { getAdmin } from "@/lib/admin"
import { listAllBrands } from "@shieldcn/core/brands"

export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const brands = await listAllBrands()
  return NextResponse.json({ brands })
}
