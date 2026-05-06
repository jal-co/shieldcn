import type { Metadata } from "next"
import { SiteAnnouncement } from "@/components/site-announcement"
import { HeroSubtext } from "@/components/hero-subtext"
import { Separator } from "@/components/ui/separator"
import { BadgeBuilder } from "@/components/badge-builder"
import { GenHeroInput } from "@/components/gen-hero-input"
import { HeroIconCloud } from "@/components/hero-icon-cloud"
import { ScrollCta } from "@/components/scroll-cta"
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
        <section className="relative overflow-hidden px-6 py-10 md:px-10 md:py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
            {/* Left — text content */}
            <div className="relative z-10 space-y-6 lg:w-1/2">
              <SiteAnnouncement />

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                The badges your{" "}
                <span className="inline-flex items-baseline">
                  <code className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.85em]">readme</code>
                </span>{" "}
                craves.
              </h1>

              <HeroSubtext />

              <GenHeroInput />
            </div>

            {/* Right — 3D badge icon cloud (oversized, bleeds behind text) */}
            <div className="relative z-0 flex items-center justify-center lg:w-1/2 lg:-ml-20 lg:-mt-16">
              <HeroIconCloud />
            </div>
          </div>
          <ScrollCta targetId="builder" />
        </section>

        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <Separator />

          {/* Badge Builder */}
          <section id="builder" className="py-16 scroll-mt-16">
            <BadgeBuilder />
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
