import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import ShowcaseClient from "./showcase-client"
import { pageMetadata } from "@/lib/metadata"
import { getBoolSetting } from "@shieldcn/core/settings"
import { listAllBrands } from "@shieldcn/core/brands"

// The showcase reflects an admin-controlled setting; revalidate periodically so
// a toggle propagates without a deploy (and never serves a permanently-cached
// snapshot from build time).
export const revalidate = 60

export const metadata: Metadata = pageMetadata({
  title: "Showcase",
  description:
    "Live badge examples for GitHub, npm, Discord, and NBA teams. Click any badge to customize variant, size, theme, and mode — then copy the markdown for your README.",
  path: "/showcase",
})

export default async function ShowcasePage() {
  const showBrandBadges = await getBoolSetting("showcaseBrandBadges")

  // Build a category per brand that has curated showcase badges. Each badge is
  // styled by its brand via ?brand=slug. These are `brand: true` so the same
  // admin toggle that hides brand badges hides these too. Skipped entirely when
  // the toggle is off, so we don't query brands needlessly.
  let brandCategories: { name: string; description: string; icons: { title: string; subtitle: string; badgePath: string }[]; brand: true }[] = []
  if (showBrandBadges) {
    const brands = await listAllBrands()
    brandCategories = brands
      .filter((b) => (b.profile.showcaseBadges?.length ?? 0) > 0)
      .map((b) => ({
        name: b.name ?? b.slug,
        description: `Showcase badges for the ${b.name ?? b.slug} brand.`,
        brand: true as const,
        icons: (b.profile.showcaseBadges ?? []).map((sb) => ({
          title: sb.alt || `${b.name ?? b.slug} badge`,
          subtitle: "brand badge",
          badgePath: `${sb.path}${sb.path.includes("?") ? "&" : "?"}brand=${b.slug}`,
        })),
      }))
  }

  return (
    <SiteShell>
      <ShowcaseClient showBrandBadges={showBrandBadges} brandCategories={brandCategories} />
    </SiteShell>
  )
}
