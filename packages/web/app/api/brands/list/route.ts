/**
 * shieldcn
 * app/api/brands/list/route.ts
 *
 * Public, non-sensitive brand directory (slug + display name only) for
 * builder pickers. Full brand configs stay behind the admin-only routes.
 */

import { NextResponse } from "next/server"
import { listAllBrands } from "@shieldcn/core/brands"

export const revalidate = 300

export async function GET() {
  const brands = await listAllBrands()
  return NextResponse.json({
    brands: brands
      .map(b => ({ slug: b.slug, name: b.name }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  })
}
