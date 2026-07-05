import type { Metadata } from "next"
import { Palette } from "lucide-react"
import { BrandsList } from "@/components/dashboard/brands-list"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { pageMetadata } from "@/lib/metadata"
import { listAllBrands } from "@shieldcn/core/brands"

export const metadata: Metadata = pageMetadata({
  title: "Brands",
  description: "Manage your brands — colors, logos, fonts — referenced from any badge or header by URL.",
  path: "/dashboard/brands",
})

export default async function BrandsPage() {
  const brands = await listAllBrands()

  const initialBrands = brands.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    color: b.config?.color ?? null,
    color2: b.config?.color2 ?? null,
  }))

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Brands"
        icon={<Palette className="size-4" />}
        description={(
          <>
            A brand is a reusable set of colors, logos, and fonts. Reference it from any badge or header with{" "}
            <code className="font-mono">?brand=slug</code> and edit it once to update every embed.{" "}
            Edit it once to update every embed.
          </>
        )}
      />

      <DashboardPanel>
        <BrandsList initialBrands={initialBrands} />
      </DashboardPanel>
    </DashboardPage>
  )
}
