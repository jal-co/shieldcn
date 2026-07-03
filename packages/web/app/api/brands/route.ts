/**
 * shieldcn
 * app/api/brands/route.ts
 *
 * List the signed-in organization's brands (dashboard).
 */

import { NextResponse } from "next/server"
import { requireOrg } from "@/lib/auth"
import { listBrandsByOrg } from "@shieldcn/core/brands"

export async function GET() {
  const auth = await requireOrg()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const brands = await listBrandsByOrg(auth.orgId)
  return NextResponse.json({ brands })
}
