import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { HeaderBuilder } from "@/components/header-builder"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Repository Header Generator",
  description:
    "Generate beautiful repository header banners for your GitHub README — your logo, premade shadcn-styled backgrounds, a title and tagline, all served from a single image URL. SVG and PNG, dark and light.",
  path: "/header",
})

export default function HeaderPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Repository headers</h1>
            <Link
              href="/docs/headers"
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Docs &amp; parameters
            </Link>
          </div>

          <HeaderBuilder />
        </div>
      </main>
    </SiteShell>
  )
}
