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
import { pickToken } from "@/lib/token-pool"

export const metadata: Metadata = pageMetadata({
  title: "shieldcn — Beautiful README Badges",
  description:
    "A shields.io alternative with shadcn/ui design quality. GitHub, npm, and Discord badges with 6 variants, 16 themes, and 5,000+ icons. Free and open source.",
  path: "/",
  ogTitle: "shieldcn — Beautiful README Badges",
})

async function getAdoptionCount(): Promise<number | null> {
  try {
    const token = await pickToken()
    if (!token) return null
    const res = await fetch(
      "https://api.github.com/search/code?q=%22shieldcn.dev%22+language%3AMarkdown&per_page=1",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.total_count === "number" ? data.total_count : null
  } catch {
    return null
  }
}

export default async function Home() {
  const adoptionCount = await getAdoptionCount()
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

              {adoptionCount !== null && adoptionCount > 0 && (
                <p className="text-sm text-muted-foreground/70">
                  Used in{" "}
                  <a
                    href="https://github.com/search?q=%22shieldcn.dev%22+language%3AMarkdown&type=code&l=Markdown"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
                  >
                    {adoptionCount} {adoptionCount === 1 ? "repo" : "repos"}
                  </a>{" "}
                  and counting.
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
