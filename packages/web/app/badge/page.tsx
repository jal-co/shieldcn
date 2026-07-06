/**
 * shieldcn
 * app/badge/page
 *
 * The badge builder. Full prop surface: badge type, style, icon, colors,
 * dimensions, link and brand overlay — with live preview and copy output.
 */

import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import { BuilderV2 } from "./builder-v2"

export const metadata: Metadata = {
  title: "Badge builder",
  description:
    "Build a shadcn/ui-styled badge for your README. Pick a badge type, tune every prop, and copy Markdown, HTML, or the raw URL.",
}

export default function BadgePage() {
  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
        <div className="mb-8 max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Badge builder</h1>
          <p className="mt-3 text-pretty text-muted-foreground">
            Pick a type, customize the look, copy the output.
          </p>
        </div>
        <BuilderV2 />
      </main>
    </SiteShell>
  )
}
