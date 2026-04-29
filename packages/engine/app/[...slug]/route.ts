/**
 * @shieldcn/engine
 * app/[...slug]/route.ts
 *
 * Badge catch-all route. Delegates to @shieldcn/core — no analytics.
 */

import { handleBadgeGET, handleBadgePUT } from "@shieldcn/core/route-handler"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgeGET(request, slug)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
