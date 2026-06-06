/**
 * shieldcn
 * sentry.edge.config
 *
 * Sentry initialization for the Edge runtime (middleware, edge routes).
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * Note: Profiling is not available on the Edge runtime — Node.js only.
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 1,
    enableLogs: true,
    debug: false,
    // Privacy: do not attach the visitor IP, cookies, or request body to
    // stored error events. IPs are processed transiently but never retained.
    sendDefaultPii: false,
  })
}
