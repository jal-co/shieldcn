import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { Studio } from "@/components/studio/studio"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "README Studio — Build your README visually",
  description:
    "A Figma-style studio for building your entire GitHub README. Compose Markdown text, header banners, badge rows, and charts with a live preview and a property inspector, then export clean Markdown.",
  path: "/studio",
  ogTitle: "shieldcn README Studio",
})

export default function StudioPage() {
  return (
    <div className="flex h-screen flex-col bg-background">
      <SiteHeader />
      <div className="min-h-0 flex-1">
        <Studio />
      </div>
    </div>
  )
}
