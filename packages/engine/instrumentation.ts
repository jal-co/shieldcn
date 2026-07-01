/**
 * shieldcn
 * instrumentation
 *
 * Next.js instrumentation hook for the engine. Loads the Sentry server/edge
 * config for the matching runtime and forwards request errors to Sentry.
 */

import * as Sentry from "@sentry/nextjs"

/**
 * Warn (not throw) about missing/half-configured env vars at startup, so a
 * self-hoster sees an actionable message in their logs immediately instead
 * of debugging a silent DB/OAuth failure later. Warnings, not hard failures,
 * because the engine can still serve static/dynamic badges without a
 * database — only memo badges and the GitHub token pool need it.
 */
function validateEnv() {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[shieldcn] DATABASE_URL is not set. Memo badges, the GitHub token " +
      "pool, and gen-count/gen-users tracking will not work until it's " +
      "configured — see packages/engine/README.md.",
    )
  }

  const hasOAuthId = Boolean(process.env.GITHUB_OAUTH_CLIENT_ID)
  const hasOAuthSecret = Boolean(process.env.GITHUB_OAUTH_CLIENT_SECRET)
  if (hasOAuthId !== hasOAuthSecret) {
    console.warn(
      "[shieldcn] Only one of GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET " +
      "is set — the GitHub token pool OAuth flow needs both, or neither.",
    )
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateEnv()
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
