/**
 * shieldcn
 * app/global-error
 *
 * Root-level error boundary. Reports uncaught render errors to Sentry
 * (no-op when no DSN is configured) and shows a minimal fallback.
 */

"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#71717a", maxWidth: "28rem" }}>
          An unexpected error occurred. The issue has been logged and we&apos;ll
          take a look.
        </p>
        {/* Plain anchor on purpose: global-error renders its own document and
            runs when the app has crashed, so next/link's router context may be
            unavailable. A full navigation is the safe fallback here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" style={{ textDecoration: "underline" }}>
          Back to homepage
        </a>
      </body>
    </html>
  )
}
