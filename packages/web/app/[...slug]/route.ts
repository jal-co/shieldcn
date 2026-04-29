/**
 * shieldcn
 * packages/web/app/[...slug]/route.ts
 *
 * Catch-all route handler for badge endpoints.
 * Delegates to @shieldcn/core route handler with analytics tracking.
 */

import { handleBadgeGET, handleBadgePUT } from "@shieldcn/core/route-handler"
import { trackEvent } from "@/lib/openpanel"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgeGET(request, slug, { onTrack: trackEvent })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
