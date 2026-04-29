import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BadgeBuilder } from "@/components/badge-builder"
import { BadgeMarquee } from "@/components/badge-marquee"
import { GenHeroInput } from "@/components/gen-hero-input"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"
import { websiteJsonLd, softwareAppJsonLd } from "@/lib/json-ld"
import { getGenCount } from "@shieldcn/core/gen-counter"

export const metadata: Metadata = pageMetadata({
  title: "shieldcn — Beautiful README Badges",
  description:
    "Beautiful GitHub README badges styled as shadcn/ui buttons. Generate SVG and PNG badges for npm, GitHub, Discord, and 25+ providers. 6 variants, 16 themes, 40,000+ icons. Free and open source.",
  path: "/",
  ogTitle: "shieldcn — Beautiful README Badges",
})

export default async function Home() {
  const genCount = await getGenCount()
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
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          {/* Hero */}
          <section className="relative min-h-[34rem] py-20 text-center space-y-6 flex flex-col justify-center">
            <BadgeMarquee />
            <div className="relative z-10 space-y-6">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Beautiful README badges
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                A shields.io alternative with the visual quality of shadcn/ui.
                6 variants, 16 themes, 30,000+ built-in icons, and custom SVG upload — unlimited combinations.
              </p>

              {genCount !== null && genCount > 0 && (
                <p className="text-sm text-muted-foreground/70">
                  Over{" "}
                  <span className="font-medium text-foreground">
                    {genCount.toLocaleString()}
                  </span>{" "}
                  badges generated and counting.
                </p>
              )}

              <GenHeroInput />

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button asChild className="w-36">
                  <Link href="/docs">
                    Get Started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-36">
                  <Link href="/showcase">
                    Showcase
                  </Link>
                </Button>
              </div>
            </div>
          </section>

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
