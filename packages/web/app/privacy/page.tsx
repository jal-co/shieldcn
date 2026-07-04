import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description: "How shieldcn handles your data — anonymous analytics, strictly-necessary cookies only, no tracking, minimal account data.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-2xl px-6 py-16 md:px-10">
          <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: July 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Overview</h2>
              <p>
                shieldcn is a free, open-source badge service. We collect minimal,
                anonymous analytics to understand how the site is used and anonymous
                diagnostic data to keep the service reliable. We never sell your data
                or use tracking cookies. Anonymous browsing stores nothing about you;
                the only personal data we hold is the account details of signed-in
                users (name and email), and the only cookies we set are strictly
                necessary ones (see “Cookies”). We rely on a small number of
                privacy-respecting subprocessors (listed below), and configure each so
                that no identifying data is retained.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Accounts</h2>
              <p>
                If you create an account, we store the information needed to run it:
                your name and email address, a securely hashed password (for
                email/password sign-up) or your GitHub account identifier (for
                GitHub sign-in), and the resources you save — such as saved badges,
                READMEs, and brand assets. We use this data solely to provide the
                Service to you (authentication, syncing your saved work, and support).
                Authentication is handled by our own self-hosted{" "}
                <a
                  href="https://better-auth.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Better Auth
                </a>{" "}
                setup; account data lives in our database (see Subprocessors). You can
                delete your account at any time, which removes your account and the
                resources tied to it (see Data retention).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Billing &amp; payments</h2>
              <p>
                Paid subscriptions (Plus) are processed by{" "}
                <a
                  href="https://polar.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Polar
                </a>
                , our payment processor and merchant of record. Polar handles your
                payment details — we never see or store your full card number. We
                keep a record of your subscription status and a customer reference so
                we can unlock Plus features and manage renewals. Your use of Plus is
                also subject to Polar&apos;s own privacy practices.
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
              <h2 className="text-base font-semibold text-foreground">Cookies</h2>
              <p>
                We use cookies only where they&apos;re strictly necessary for the
                site to work — never for advertising, tracking, or profiling. If
                you sign in, we set a secure, httpOnly session cookie to keep you
                logged in, a small cookie recording which method you last signed
                in with (to show a “last used” hint), and, when bot protection is
                enabled, a short-lived Cloudflare Turnstile cookie on the auth
                pages. Browsing the site signed-out sets no cookies. We do not
                use fingerprinting or any cross-session tracking mechanism.
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
                <li>
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Vercel
                  </a>{" "}
                  — application hosting and delivery.
                </li>
                <li>
                  <a
                    href="https://neon.tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Neon
                  </a>{" "}
                  — managed PostgreSQL database for account data and saved resources.
                </li>
                <li>
                  <a
                    href="https://polar.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Polar
                  </a>{" "}
                  — subscription billing and payment processing (merchant of record).
                </li>
                <li>
                  <a
                    href="https://www.cloudflare.com/products/turnstile/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Cloudflare Turnstile
                  </a>{" "}
                  — privacy-preserving bot protection on auth pages (when enabled).
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Data retention</h2>
              <p>
                We keep account data and saved resources for as long as your account
                is active. When you delete your account, we remove your account
                record and the resources tied to it; residual copies may persist in
                encrypted backups for a limited period before being overwritten.
                Billing records may be retained by our payment processor as required
                for tax and accounting purposes. Anonymous analytics and transient
                request logs are not tied to your identity and are retained only
                briefly for reliability and abuse prevention.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Your rights</h2>
              <p>
                You can access and update your account details, export or delete your
                saved resources, and delete your account at any time. Depending on
                where you live, you may have additional rights over your personal data
                (such as access, correction, deletion, or portability). To exercise
                any of these, or if you have questions about your data, contact us at{" "}
                <a
                  href="mailto:shieldcn@fwdtojustin.com"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  shieldcn@fwdtojustin.com
                </a>
                .
              </p>
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
                  href="mailto:shieldcn@fwdtojustin.com"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  shieldcn@fwdtojustin.com
                </a>
                . See also our{" "}
                <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                  Terms of Service
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
