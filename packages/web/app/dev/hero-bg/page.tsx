import { notFound } from "next/navigation"
import { BadgeMarquee } from "@/components/badge-marquee"

export const dynamic = "force-static"

export default function HeroBackgroundDevPage() {
  if (process.env.NODE_ENV !== "development") notFound()

  return (
    <main className="min-h-screen bg-background">
      <section className="relative min-h-screen overflow-hidden">
        <BadgeMarquee />
      </section>
    </main>
  )
}
