import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { ArrowRight, User } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import GeneratorClient from "./generator-client"
import { GeneratorTourProvider, TourReplayButton } from "./generator-tour"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Badge Generator",
  description:
    "Auto-generate README badges for any GitHub repo. Detects your stack, lets you customize variants and themes, and exports copy-paste markdown.",
  path: "/gen",
})

export default function GeneratorPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
          <GeneratorTourProvider>
            <header className="mb-10 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Generator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Auto-generate{" "}
                  <a
                    href="https://shieldcn.dev"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    shieldcn
                  </a>{" "}
                  badges from a GitHub URL.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TourReplayButton />
                <span className="text-xs text-muted-foreground">
                  By{" "}
                  <a
                    href="https://github.com/k33bs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    @k33bs
                  </a>
                  {" · "}
                  <a
                    href="https://github.com/k33bs/shieldcngen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Source
                  </a>
                </span>
              </div>
            </header>

            {/* Cross-link to profile generator */}
            <Link
              href="/gen/profile"
              className="mb-8 flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm transition-colors hover:border-border hover:bg-muted/50"
            >
              <User className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="font-medium">Looking for profile README badges?</span>
                <span className="ml-1.5 text-muted-foreground">
                  Generate badges from a GitHub username instead.
                </span>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>

            <Suspense>
              <GeneratorClient />
            </Suspense>
          </GeneratorTourProvider>
        </div>
      </main>
    </SiteShell>
  )
}
