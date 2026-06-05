import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: "How shieldcn handles your data — anonymous analytics, no cookies, no tracking, no stored personal data.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-2xl px-6 py-16 md:px-10">
          <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: June 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Overview</h2>
              <p>
                shieldcn is a free, open-source badge service. We collect minimal,
                anonymous analytics to understand how the site is used and anonymous
                diagnostic data to keep the service reliable. We do not store personal
                information, set cookies, or sell your data. We rely on a small number
                of privacy-respecting subprocessors (listed below), and configure each
                so that no identifying data is retained.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Analytics</h2>
              <p>
                We use{" "}
                <a
                  href="https://openpanel.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  OpenPanel
                </a>
                , an open-source analytics tool, to collect anonymous usage data
                such as page views, referrer URLs, and browser type. Analytics
                requests are proxied through our own domain — no third-party
                scripts or cookies are involved. OpenPanel processes your IP
                address transiently to derive coarse, non-identifying information
                (such as country and device type) and does not store the raw IP.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Error monitoring</h2>
              <p>
                We use{" "}
                <a
                  href="https://sentry.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Sentry
                </a>{" "}
                to capture errors and performance diagnostics so we can fix issues
                quickly. Sentry only receives data when something goes wrong — there
                is no per-visit tracking. Error reports include technical details
                such as the request path, a stack trace, and browser or runtime
                version. We explicitly disable Sentry&apos;s collection of personal
                data, so error events do not store IP addresses, cookies, or request
                bodies. No cookies are set.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">No cookies</h2>
              <p>
                shieldcn does not set any cookies. We do not use fingerprinting
                or any other cross-session tracking mechanism.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Badge requests</h2>
              <p>
                When a badge is embedded in a README or docs page, your browser
                makes an image request to our server. We log standard HTTP request
                data (URL path, referrer, timestamp) for caching and rate limiting.
                Your IP address is processed transiently to serve the request and
                apply rate limits, but is not stored or used to identify you.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Token pool</h2>
              <p>
                Users who donate a GitHub token via the{" "}
                <Link
                  href="/token-pool"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  token pool
                </Link>{" "}
                authorize a read-only OAuth scope with zero permissions. Tokens
                are encrypted at rest and used solely to make GitHub API requests
                for badge data. You can revoke access at any time from your GitHub
                settings.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Subprocessors</h2>
              <p>
                We share data with the following third-party services, each chosen
                for its privacy-respecting design:
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <a
                    href="https://openpanel.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    OpenPanel
                  </a>{" "}
                  — anonymous, cookieless analytics.
                </li>
                <li>
                  <a
                    href="https://sentry.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Sentry
                  </a>{" "}
                  — error and performance monitoring, with personal data collection
                  disabled.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Opt out</h2>
              <p>
                To opt out of analytics, visit any page with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                  ?no-track
                </code>{" "}
                appended to the URL (e.g.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                  shieldcn.dev/?no-track
                </code>
                ). This sets a localStorage flag that permanently disables the
                analytics script in that browser.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Contact</h2>
              <p>
                Questions? Open an issue on{" "}
                <a
                  href="https://github.com/jal-co/shieldcn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  GitHub
                </a>{" "}
                or reach out at{" "}
                <a
                  href="mailto:github@fwdtojustin.com"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  github@fwdtojustin.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
