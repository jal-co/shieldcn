/**
 * @shieldcn/engine
 * app/[...slug]/route.ts
 *
 * Badge catch-all route. Delegates to @shieldcn/core — no analytics.
 * Reports unexpected badge errors to Sentry (no-op without a DSN).
 */

import { handleBadgeGET, handleBadgePUT } from "@shieldcn/core/route-handler"
import * as Sentry from "@sentry/nextjs"

function reportBadgeError(error: unknown, context: Record<string, string>) {
  Sentry.captureException(error, { tags: { area: "badge" }, extra: context })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgeGET(request, slug, { onError: reportBadgeError })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
