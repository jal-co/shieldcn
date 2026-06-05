/**
 * shieldcn
 * sentry.server.config
 *
 * Sentry initialization for the engine's Node.js server runtime.
 * Inert unless NEXT_PUBLIC_SENTRY_DSN is set — self-hosted engines run
 * without monitoring by default.
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
