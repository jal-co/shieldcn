import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Palette } from "lucide-react"

import { BrandEditor } from "@/components/brand-editor"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "New brand",
  description: "Create a managed brand — import from a domain, then edit and save.",
  path: "/dashboard/brands/new",
})

export default function NewBrandPage() {
  return (
    <DashboardPage>
      <DashboardPageHeader
        title="New brand"
        icon={<Palette className="size-4" />}
        description="Import a brand from its domain, review the palette and logos, then save."
        actions={(
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/brands"><ArrowLeft className="size-4" /> Brands</Link>
          </Button>
        )}
      />
      <DashboardPanel>
        <BrandEditor create />
      </DashboardPanel>
    </DashboardPage>
  )
}
