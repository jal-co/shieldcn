import type { Metadata } from "next"
import Link from "next/link"
import { SiteAnnouncement } from "@/components/site-announcement"
import { HeroSubtext } from "@/components/hero-subtext"
import { Separator } from "@/components/ui/separator"
import { HomeCharts } from "@/components/home-charts"
import { GenHeroInput } from "@/components/gen-hero-input"
import { HeroShowcase } from "@/components/hero-showcase"
import { HeroGlow } from "@/components/hero-glow"
import { HeroEntrance } from "@/components/hero-entrance"
import { ScrollCta } from "@/components/scroll-cta"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"
import { websiteJsonLd, softwareAppJsonLd } from "@/lib/json-ld"

export const metadata: Metadata = pageMetadata({
  title: "shieldcn — Beautiful README Badges & Charts",
  description:
    "Beautiful GitHub README badges and charts styled as shadcn/ui, plus a free visual README builder. Generate SVG and PNG badges for npm, GitHub, GitLab, Discord, and 45+ providers, build charts and header banners, and compose a whole README in the Studio. Free and open source.",
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
        {/* Hero — split layout, staged page-transition-in (HeroEntrance) */}
        <section className="relative overflow-hidden px-6 py-10 md:px-10 md:py-16">
          <HeroGlow />
          <HeroEntrance
            variant="unfold"
            announcement={<SiteAnnouncement />}
            heading={
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                The badges your{" "}
                <span className="inline-flex items-baseline">
                  <code className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.85em]">readme</code>
                </span>{" "}
                and{" "}
                <span className="inline-flex items-baseline">
                  <code className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[0.85em]">SKILL.md</code>
                </span>{" "}
                crave.
              </h1>
            }
            subtext={<HeroSubtext />}
            input={<GenHeroInput />}
            cloud={<HeroShowcase />}
            scrollCta={<ScrollCta targetId="builder" />}
          />
        </section>

        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <Separator />

          {/* Badge Builder pointer */}
          <section id="builder" className="py-16 scroll-mt-16">
            <div className="max-w-lg">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Build your badge</h2>
              <p className="mt-3 text-pretty text-muted-foreground">
                Pick a type, customize every prop, copy the output in the{" "}
                <Link href="/badge" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
                  badge builder
                </Link>
                . Or build your whole README in the{" "}
                <Link href="/studio" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
                  README Studio
                </Link>{" "}
                — a visual GitHub README builder for headers, badges, and charts.
              </p>
            </div>
          </section>

          <Separator />

          <HomeCharts />
        </div>
      </main>
    </SiteShell>
  )
}
