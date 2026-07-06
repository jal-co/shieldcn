import type { Metadata } from "next"
import { Palette } from "lucide-react"
import { BrandsList } from "@/components/dashboard/brands-list"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { pageMetadata } from "@/lib/metadata"
import { listBrandSummaries } from "@shieldcn/core/brands"

export const metadata: Metadata = pageMetadata({
  title: "Brands",
  description: "Manage your brands — colors, logos, fonts — referenced from any badge or header by URL.",
  path: "/dashboard/brands",
})

export default async function BrandsPage() {
  const initialBrands = await listBrandSummaries()

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
