import { BadgeMarquee } from "@/components/badge-marquee"

export const dynamic = "force-static"

export default function HeroBackgroundDevPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative min-h-screen overflow-hidden">
        <BadgeMarquee />
      </section>
    </main>
  )
}
