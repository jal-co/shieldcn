/**
 * shieldcn
 * instrumentation
 *
 * Next.js instrumentation hook for the engine. Loads the Sentry server/edge
 * config for the matching runtime and forwards request errors to Sentry.
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
