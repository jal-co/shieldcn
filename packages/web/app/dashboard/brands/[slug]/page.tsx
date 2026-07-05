import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Palette } from "lucide-react"

import { BrandEditor } from "@/components/brand-editor"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/metadata"
import { getAnyBrand } from "@shieldcn/core/brands"

type Params = { params: Promise<{ slug: string }> }

export const metadata: Metadata = pageMetadata({
  title: "Edit brand",
  description: "Edit a managed brand's identity, palette, logos, and fonts.",
  path: "/dashboard/brands",
})

export default async function EditBrandPage({ params }: Params) {
  const { slug } = await params

  // The dashboard layout already gates on admin — every brand is editable here.
  const brand = await getAnyBrand(slug)
  if (!brand) notFound()

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={brand.name ?? brand.slug}
        icon={<Palette className="size-4" />}
        description={<code className="font-mono text-sm">?brand={brand.slug}</code>}
        actions={(
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/brands"><ArrowLeft className="size-4" /> Brands</Link>
          </Button>
        )}
      />
      <DashboardPanel>
        <BrandEditor brand={brand} admin />
      </DashboardPanel>
    </DashboardPage>
  )
}
