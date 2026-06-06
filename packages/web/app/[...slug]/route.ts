/**
 * shieldcn
 * packages/web/app/[...slug]/route.ts
 *
 * Catch-all route handler for badge endpoints.
 * Delegates to @shieldcn/core route handler with analytics tracking
 * and Sentry metrics instrumentation.
 */

import { handleBadgeGET, handleBadgePUT, type MetricEvent } from "@shieldcn/core/route-handler"
import * as Sentry from "@sentry/nextjs"
import { trackEvent } from "@/lib/openpanel"

function reportBadgeError(error: unknown, context: Record<string, string>) {
  Sentry.captureException(error, { tags: { area: "badge" }, extra: context })
}

function emitMetric(metric: MetricEvent) {
  const attributes = metric.tags ?? {}
  switch (metric.type) {
    case "counter":
      Sentry.metrics.count(metric.name, metric.value as number, { attributes, unit: metric.unit ?? "none" })
      break
    case "distribution":
      Sentry.metrics.distribution(metric.name, metric.value as number, { attributes, unit: metric.unit ?? "none" })
      break
    case "gauge":
      Sentry.metrics.gauge(metric.name, metric.value as number, { attributes, unit: metric.unit ?? "none" })
      break
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgeGET(request, slug, {
    onTrack: trackEvent,
    onError: reportBadgeError,
    onMetric: emitMetric,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
