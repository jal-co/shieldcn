import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { SponsorsBuilder } from "@/components/sponsors-builder"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "GitHub Sponsors Image Generator",
  description:
    "Free tool to generate a GitHub Sponsors grid image for your README: every active public sponsor's avatar, with pinned tiers, shadcn-styled or photo backgrounds, all from one image URL. SVG and PNG, dark and light.",
  path: "/sponsors",
})

export default function SponsorsPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sponsors image</h1>
            <Link
              href="/docs/sponsors"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Docs &amp; parameters
            </Link>
          </div>

          <SponsorsBuilder />
        </div>
      </main>
    </SiteShell>
  )
}
