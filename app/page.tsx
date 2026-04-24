import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { BadgeBuilder } from "@/components/badge-builder"
import { BadgeMarquee } from "@/components/badge-marquee"
import { SiteShell } from "@/components/site-shell"

export default function Home() {
  return (
    <SiteShell>
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
                6 variants, 16 themes, and 5,000+ icons — over 8 million combinations.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button asChild>
                  <Link href="/docs">
                    Get Started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
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
