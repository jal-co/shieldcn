/**
 * shieldcn
 * sentry.server.config
 *
 * Sentry initialization for the engine's Node.js server runtime.
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is set — self-hosted engines run
 * without monitoring by default.
 */

import * as Sentry from "@sentry/nextjs"
import { nodeProfilingIntegration } from "@sentry/profiling-node"
import { setCacheMetricsCallback, setProviderAlertCallback } from "@shieldcn/core/cache"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

/**
 * Read a 0–1 sample rate from an env var, falling back to `fallback`.
 * Defaults are conservative (0.1) — sampling every trace/profile is
 * expensive at badge-service request volumes. Set to `1` to capture
 * everything in a low-traffic self-hosted deployment.
 */
function sampleRate(envVar: string, fallback: number): number {
  const raw = process.env[envVar]
  if (raw === undefined || raw === "") return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback
}

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: sampleRate("SENTRY_TRACES_SAMPLE_RATE", 0.1),
    profilesSampleRate: sampleRate("SENTRY_PROFILES_SAMPLE_RATE", 0.1),
    enableLogs: true,
    debug: false,
    integrations: [nodeProfilingIntegration()],
    // Privacy: do not attach the visitor IP, cookies, or request body to
    // stored error events. IPs are processed transiently but never retained.
    sendDefaultPii: false,
  })

  // Wire cache metrics to Sentry.metrics
  setCacheMetricsCallback((metric) => {
    Sentry.metrics.count(metric.name, metric.value, {
      attributes: metric.tags,
      unit: "none",
    })
  })

  // Wire provider alerts to Sentry issues so a rate limit (429) or a badge
  // that can't be served at all surfaces as an alertable error, not just a
  // metric counter. Stable `message` per reason keeps recurring alerts in a
  // single issue.
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
