import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink, Shield, Users, Zap, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SiteShell } from "@/components/site-shell"
import { getPoolStats } from "@/lib/token-pool"

export const metadata: Metadata = {
  title: "Token Pool — shieldcn",
  description:
    "Help shieldcn serve more GitHub badges by sharing a read-only token. Inspired by shields.io's token pool.",
}

export default async function TokenPoolPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const stats = await getPoolStats()
  const oauthConfigured = !!process.env.GITHUB_OAUTH_CLIENT_ID

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14 md:px-10">
          {/* Status messages */}
          {params.success && (
            <div className="mb-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              ✓ Your token has been added to the pool. Thank you for helping shieldcn!
            </div>
          )}
          {params.error && (
            <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Something went wrong: {params.error.replace(/_/g, " ")}. Please try again.
            </div>
          )}

          {/* Hero */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <KeyRound className="size-3.5" />
              Token Pool
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Help shieldcn serve more GitHub badges
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              GitHub&apos;s API has a rate limit of 5,000 requests per hour per
              token. shieldcn serves badge data from the GitHub API — stars,
              releases, CI status, licenses — and we need your help to scale.
            </p>
          </div>

          {/* How it works */}
          <div className="mt-12 flex flex-col gap-8">
            <h2 className="text-xl font-semibold tracking-tight">How it works</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Shield,
                  title: "Authorize the OAuth app",
                  description:
                    "This shares a GitHub token with read-only access to public data. We request zero scopes — no access to your private repos, no ability to act on your behalf.",
                },
                {
                  icon: Users,
                  title: "Token joins the pool",
                  description:
                    "Your token is added to a pool shared by other users. When we need to call the GitHub API, we pick a random token from the pool.",
                },
                {
                  icon: Zap,
                  title: "Distributed rate limiting",
                  description:
                    "We only make a few requests with each token before rotating to another. Most users don't notice any impact on their own rate limit.",
                },
                {
                  icon: KeyRound,
                  title: "Revoke anytime",
                  description:
                    "You can revoke the OAuth app at github.com/settings/applications at any time. We'll remove your token from the pool automatically.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col gap-2 rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-8 text-center">
            {stats.valid > 0 && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {stats.valid} token{stats.valid !== 1 ? "s" : ""} in pool
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ≈ {(stats.valid * 5000).toLocaleString()} requests/hour capacity
                </span>
              </div>
            )}

            {oauthConfigured ? (
              <a href="/api/auth/github">
                <Button size="lg" className="gap-2">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Authorize with GitHub
                  <ExternalLink className="size-3.5 opacity-60" />
                </Button>
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                Token pool is not yet configured. Check back soon.
              </p>
            )}

            <p className="max-w-sm text-xs text-muted-foreground">
              Read-only access to public data only. Zero scopes requested.
              Revoke at{" "}
              <a
                href="https://github.com/settings/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                github.com/settings/applications
              </a>{" "}
              anytime.
            </p>
          </div>

          {/* Credit */}
          <div className="mt-12 rounded-lg border border-border bg-muted/30 px-6 py-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              This token pool system is inspired by{" "}
              <a
                href="https://shields.io/blog/2024-11-14-how-shields-io-uses-the-github-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                how shields.io uses the GitHub API
              </a>
              . We&apos;re grateful to the shields.io team for pioneering this approach
              and sharing it openly. If you use shields.io too, consider{" "}
              <a
                href="https://shields.io/community"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2"
              >
                contributing a token there as well
              </a>
              .
            </p>
          </div>

          {/* Back link */}
          <div className="mt-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs">← Back to docs</Link>
            </Button>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
