import type { Metadata } from "next"
import { SiteShell } from "@/components/site-shell"
import ShowcaseClient from "./showcase-client"
import { pageMetadata } from "@/lib/metadata"
import { getBoolSetting } from "@shieldcn/core/settings"
import { listAllBrands, stripBrandParam } from "@shieldcn/core/brands"

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
    // Group brands by their chosen showcase category (default: the brand name),
    // so several brands can share one category heading. Preserves first-seen
    // order of categories.
    const byCategory = new Map<string, (typeof brandCategories)[number]>()
    for (const b of brands) {
      if ((b.profile.showcaseBadges?.length ?? 0) === 0) continue
      const label = b.name ?? b.slug
      const category = b.profile.showcaseCategory?.trim() || label
      let entry = byCategory.get(category)
      if (!entry) {
        entry = {
          name: category,
          description: `Showcase badges for ${category}.`,
          brand: true as const,
          icons: [],
        }
        byCategory.set(category, entry)
      }
      for (const sb of b.profile.showcaseBadges ?? []) {
        entry.icons.push({
          title: sb.alt || `${label} badge`,
          subtitle: "brand badge",
          badgePath: (() => {
            // Strip any baked-in brand= (older saved paths) so we never emit
            // ?brand=x&brand=x, then apply this brand.
            const p = stripBrandParam(sb.path)
            return `${p}${p.includes("?") ? "&" : "?"}brand=${b.slug}`
          })(),
        })
      }
    }
    brandCategories = Array.from(byCategory.values())
  }

  return (
    <SiteShell>
      <ShowcaseClient showBrandBadges={showBrandBadges} brandCategories={brandCategories} />
    </SiteShell>
  )
}
