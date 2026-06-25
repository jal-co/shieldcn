import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { ContributorsBuilder } from "@/components/contributors-builder"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "GitHub Contributors Image Generator",
  description:
    "Free tool to generate a contributors grid image for your README: every contributor's avatar from one image URL, like contrib.rocks but shadcn-styled. Pick a repo, background, theme, and size. SVG and PNG, dark and light.",
  path: "/contributors",
})

export default function ContributorsPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contributors image</h1>
            <Link
              href="/docs/contributors"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Docs &amp; parameters
            </Link>
          </div>

          <ContributorsBuilder />
        </div>
      </main>
    </SiteShell>
  )
}
