import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import ShowcaseClient from "./showcase-client"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Showcase",
  description:
    "Live badge examples for GitHub, npm, and Discord. Click any badge to customize variant, size, theme, and mode — then copy the markdown for your README.",
  path: "/showcase",
})

export default function ShowcasePage() {
  return (
    <SiteShell>
      <ShowcaseClient />
    </SiteShell>
  )
}
