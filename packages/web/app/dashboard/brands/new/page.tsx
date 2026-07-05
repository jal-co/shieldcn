import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Palette } from "lucide-react"

import { BrandEditor } from "@/components/brand-editor"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"

export const metadata: Metadata = pageMetadata({
  title: "New brand",
  description: "Create a managed brand — import from a domain, then edit and save.",
  path: "/dashboard/brands/new",
})

export default async function NewBrandPage() {
  const session = await getSession()
  if (!session) redirect("/dashboard")

  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)

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
        {plan !== "plus" ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            Brands are a Plus feature.{" "}
            <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">
              Upgrade to Plus
            </Link>{" "}
            to create a managed brand.
          </div>
        ) : (
          <BrandEditor create />
        )}
      </DashboardPanel>
    </DashboardPage>
  )
}
