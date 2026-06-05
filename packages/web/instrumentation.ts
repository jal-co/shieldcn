/**
 * shieldcn
 * instrumentation
 *
 * Next.js instrumentation hook. Loads the Sentry server/edge config for the
 * matching runtime and forwards nested React Server Component errors to Sentry.
 */

import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
