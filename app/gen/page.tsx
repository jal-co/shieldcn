import type { Metadata } from "next"
import { Suspense } from "react"
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
                    href="https://github.com/jal-co/shieldcn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Source
                  </a>
                </span>
              </div>
            </header>

            <Suspense>
              <GeneratorClient />
            </Suspense>
          </GeneratorTourProvider>
        </div>
      </main>
    </SiteShell>
  )
}
