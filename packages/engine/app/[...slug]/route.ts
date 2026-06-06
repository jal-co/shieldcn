/**
 * @shieldcn/engine
 * app/[...slug]/route.ts
 *
 * Badge catch-all route. Delegates to @shieldcn/core — no analytics.
 * Reports unexpected badge errors to Sentry and emits custom metrics
 * (no-op without a DSN).
 */

import { handleBadgeGET, handleBadgePUT, type MetricEvent } from "@shieldcn/core/route-handler"
import * as Sentry from "@sentry/nextjs"

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
  return handleBadgeGET(request, slug, { onError: reportBadgeError, onMetric: emitMetric })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  return handleBadgePUT(request, slug)
}
