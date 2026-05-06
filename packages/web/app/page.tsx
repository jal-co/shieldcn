import type { Metadata } from "next"
import { SiteAnnouncement } from "@/components/site-announcement"
import { Separator } from "@/components/ui/separator"
import { BadgeBuilder } from "@/components/badge-builder"
import { GenHeroInput } from "@/components/gen-hero-input"
import { HeroIconCloud } from "@/components/hero-icon-cloud"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"
import { websiteJsonLd, softwareAppJsonLd } from "@/lib/json-ld"


export const metadata: Metadata = pageMetadata({
  title: "shieldcn — Beautiful README Badges",
  description:
    "Beautiful GitHub README badges styled as shadcn/ui buttons. Generate SVG and PNG badges for npm, GitHub, GitLab, Discord, and 45+ providers. 6 variants, 16 themes, 40,000+ icons. Free and open source.",
  path: "/",
  ogTitle: "shieldcn — Beautiful README Badges",
})

export default async function Home() {
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd()) }}
      />
      <main className="min-w-0 flex-1">
        {/* Hero — split layout */}
        <section className="relative overflow-hidden px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
            {/* Left — text content */}
            <div className="space-y-6 lg:w-1/2">
              <SiteAnnouncement />

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                The badges your{" "}
                <span className="inline-flex items-baseline">
                  <code className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.85em]">readme</code>
                </span>{" "}
                craves.
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                A shields.io alternative with the visual quality of shadcn/ui.
                Unlimited combinations.
              </p>

              <GenHeroInput />
            </div>

            {/* Right — 3D badge icon cloud */}
            <div className="flex items-center justify-center lg:w-1/2">
              <HeroIconCloud />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <Separator />

          {/* Badge Builder */}
          <section className="py-16">
            <BadgeBuilder />
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
