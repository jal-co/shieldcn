import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import ShowcaseClient from "./showcase-client"

export const metadata: Metadata = {
  title: "Showcase — shieldcn",
  description:
    "Click any badge to customize it — variant, size, theme, mode — then copy the markdown for your README.",
}

export default function ShowcasePage() {
  return (
    <SiteShell>
      <ShowcaseClient />
    </SiteShell>
  )
}
