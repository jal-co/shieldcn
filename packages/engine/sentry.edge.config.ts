/**
 * shieldcn
 * sentry.edge.config
 *
 * Sentry initialization for the engine's Edge runtime.
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * Note: Profiling is not available on the Edge runtime — Node.js only.
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

/** Read a 0–1 sample rate from an env var (default 0.1 — see server config). */
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
    enableLogs: true,
    debug: false,
    // Privacy: do not attach the visitor IP, cookies, or request body to
    // stored error events. IPs are processed transiently but never retained.
    sendDefaultPii: false,
  })
}
