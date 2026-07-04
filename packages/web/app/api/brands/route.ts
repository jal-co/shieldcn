/**
 * shieldcn
 * app/api/brands/route.ts
 *
 * List the signed-in organization's brands (dashboard).
 */

import { NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth"
import { listBrandsByOwner } from "@shieldcn/core/brands"

export async function GET() {
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const brands = await listBrandsByOwner(auth.ownerId)
  return NextResponse.json({ brands })
}
