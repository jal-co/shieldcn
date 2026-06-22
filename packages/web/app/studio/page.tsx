import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Studio } from "@/components/studio/studio"
import { pageMetadata } from "@/lib/metadata"
import { studioJsonLd } from "@/lib/json-ld"

export const metadata: Metadata = pageMetadata({
  title: "README Studio — Visual GitHub README Builder",
  description:
    "Free visual tool to build a GitHub README. Drag headers, badges, charts, tables, and Markdown with a live preview, then export clean Markdown. No signup.",
  path: "/studio",
  ogTitle: "shieldcn README Studio — Visual README Builder",
})

export default function StudioPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(studioJsonLd()) }}
      />
      <h1 className="sr-only">README Studio — a free visual GitHub README builder, generator, and editor</h1>
      <SiteHeader />
      <div className="min-h-0 flex-1">
        <Studio />
      </div>
    </div>
  )
}
