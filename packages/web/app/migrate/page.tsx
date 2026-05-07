import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"
import MigrateClient from "./migrate-client"

export const metadata: Metadata = pageMetadata({
  title: "Migrate",
  description:
    "Automatically migrate your GitHub README badges from shields.io to shieldcn. Paste a repo URL, preview the changes, and open a PR in one click.",
  path: "/migrate",
})

export default function MigratePage() {
  const configured = !!process.env.GITHUB_APP_ID

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-6 py-14 md:px-10">
          {/* Hero */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ArrowRightLeft className="size-3.5" />
              Migrate
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Migrate from shields.io
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              Paste a GitHub repo URL and we&apos;ll scan the README for shields.io
              badges, show you a side-by-side preview, and open a PR with shieldcn
              replacements — all in one click.
            </p>
          </div>

          {/* How it works */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Paste your repo",
                description: "Enter a GitHub repository URL or owner/repo slug.",
              },
              {
                step: "2",
                title: "Preview changes",
                description:
                  "See each badge side-by-side. Toggle individual badges on or off.",
              },
              {
                step: "3",
                title: "Open the PR",
                description:
                  "One click creates a PR on your repo. Review and merge when ready.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Main tool */}
          <div className="mt-10">
            {configured ? (
              <MigrateClient />
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  The migration tool is not yet configured. Check back soon.
                </p>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="mt-14 flex flex-col gap-6">
            <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>

            <div className="flex flex-col gap-4">
              {[
                {
                  q: "What permissions does the GitHub App need?",
                  a: "Only contents (read/write) and pull requests (read/write) on the repo you select. We never access private repos unless you explicitly install the App on one.",
                },
                {
                  q: "What badges can be migrated?",
                  a: "Every badge provider shieldcn supports — npm, GitHub, GitLab, PyPI, crates.io, Docker, Discord, Codecov, Coveralls, Bundlephobia, VS Code Marketplace, Open VSX, YouTube, NuGet, Packagist, RubyGems, Homebrew, Maven, CocoaPods, pub.dev, Conda, Chrome Web Store, Firefox Add-ons, Chocolatey, Flathub, Snapcraft, F-Droid, jsDelivr, Modrinth, Open Collective, Liberapay, SonarQube, Stack Exchange, Discourse, Matrix, Mastodon, WakaTime, Weblate, and static badges.",
                },
                {
                  q: "What if a badge can't be mapped?",
                  a: "Unmappable badges are left as-is. The preview will show how many were skipped so you can decide whether to manually convert them.",
                },
                {
                  q: "Can I customize the migrated badges?",
                  a: "Yes! After merging the PR, you can add query params like ?variant=branded, ?theme=blue, or ?mode=light to any badge URL. See the docs for all options.",
                },
                {
                  q: "Can I uninstall the App after?",
                  a: "Absolutely. Once the PR is merged, you can remove the App from your repo at github.com/settings/installations anytime.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-lg border border-border p-4"
                >
                  <h3 className="text-sm font-semibold">{item.q}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
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
