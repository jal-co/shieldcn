/**
 * @shieldcn/engine
 * app/[...slug]/route.ts
 *
 * Badge catch-all route. Delegates to @shieldcn/core — no analytics.
 * Reports unexpected badge errors to Sentry and emits custom metrics
 * (no-op without a DSN).
 */

import { createBadgeHandlers, type MetricEvent } from "@shieldcn/core/route-handler"
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

export const { GET, PUT } = createBadgeHandlers({
  onError: reportBadgeError,
  onMetric: emitMetric,
})
