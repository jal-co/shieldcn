"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useBadgeMode } from "@/lib/use-badge-mode"

/** Hydration flag without a setState-in-effect (lint-clean). */
function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false)
}

const CHARTS: { src: string; alt: string }[] = [
  { src: "/chart/github/stars/vercel/next.js.svg?theme=blue", alt: "GitHub star history" },
  { src: "/chart/npm/zod.svg?theme=emerald", alt: "npm weekly downloads" },
]

export function HomeCharts() {
  const hydrated = useHydrated()
  const { adaptUrl } = useBadgeMode()

  return (
    <section id="charts" className="py-16 scroll-mt-16">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Charts, too</h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Shadcn-styled star history, issues over time, npm downloads, and your own JSON
            data — portable SVGs, no JavaScript.
          </p>
        </div>
        <Link
          href="/docs/charts"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          Explore charts <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CHARTS.map((c) => (
          <Link
            key={c.src}
            href="/docs/charts"
            className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/20"
          >
            {hydrated ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={adaptUrl(c.src)} alt={c.alt} className="w-full" />
            ) : (
              <div className="aspect-[2/1] w-full" />
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
