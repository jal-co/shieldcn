/**
 * shieldcn
 * sentry.server.config
 *
 * Sentry initialization for the Node.js server runtime.
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is set — self-hosters and forks
 * run without monitoring by default.
 */

import * as Sentry from "@sentry/nextjs"
import { nodeProfilingIntegration } from "@sentry/profiling-node"
import { setCacheMetricsCallback, setProviderAlertCallback } from "@shieldcn/core/cache"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1,
    profilesSampleRate: 1,
    enableLogs: true,
    debug: false,
    integrations: [nodeProfilingIntegration()],
    // Privacy: do not attach the visitor IP, cookies, or request body to
    // stored error events. IPs are processed transiently but never retained.
    sendDefaultPii: false,
  })

  // Wire cache metrics to Sentry.metrics so cache hit/miss/backoff/budget
  // counters flow to Application Metrics without @shieldcn/core depending
  // on Sentry directly.
  setCacheMetricsCallback((metric) => {
    Sentry.metrics.count(metric.name, metric.value, {
      attributes: metric.tags,
      unit: "none",
    })
  })

  // Wire provider alerts to Sentry issues so a rate limit (429) or a badge
  // that can't be served at all surfaces as an alertable error — not just a
  // metric. `message` is stable per reason so recurring alerts group into a
  // single issue; the variable detail rides along in tags/extra.
  setProviderAlertCallback((alert) => {
    Sentry.captureMessage(alert.message, {
      level: alert.reason === "rate_limit" ? "warning" : "error",
      tags: {
        area: "badge",
        provider: alert.provider,
        reason: alert.reason,
        ...(alert.status ? { status: String(alert.status) } : {}),
      },
      extra: alert.context ?? {},
    })
  })
}
