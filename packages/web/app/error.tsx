/**
 * shieldcn
 * app/error
 *
 * Route-segment error boundary (everything below the root layout). Unlike
 * global-error.tsx — which only fires when the root layout itself throws and
 * has to render its own <html>/<body> — this one renders inside the normal
 * document, so the branded shell (nav/footer, theme) stays intact around the
 * error message.
 */

"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <SiteShell footer={false}>
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="max-w-md text-muted-foreground">
          An unexpected error occurred. The issue has been logged and we&apos;ll
          take a look.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to homepage</Link>
          </Button>
        </div>
      </main>
    </SiteShell>
  )
}
