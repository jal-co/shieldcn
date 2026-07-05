import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Palette } from "lucide-react"

import { BrandEditor } from "@/components/brand-editor"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { isAdminSession } from "@/lib/admin"
import { getPlan } from "@shieldcn/core/entitlements"
import { getOwnedBrand, getAnyBrand } from "@shieldcn/core/brands"

type Params = { params: Promise<{ slug: string }> }

export const metadata: Metadata = pageMetadata({
  title: "Edit brand",
  description: "Edit a managed brand's identity, palette, logos, and fonts.",
  path: "/dashboard/brands",
})

export default async function EditBrandPage({ params }: Params) {
  const { slug } = await params
  const session = await getSession()
  if (!session) redirect("/dashboard")

  const ownerId = session.orgId ?? session.userId
  const admin = isAdminSession(session)

  // Admins edit any brand; everyone else needs Plus + ownership.
  if (!admin) {
    const plan = await getPlan(ownerId)
    if (plan !== "plus") redirect("/pricing")
  }

  const brand = admin ? await getAnyBrand(slug) : await getOwnedBrand(ownerId, slug)
  if (!brand) notFound()

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={brand.name ?? brand.slug}
        icon={<Palette className="size-4" />}
        description={<code className="font-mono text-sm">?brand={brand.slug}</code>}
        actions={(
          <Button asChild size="sm" variant="outline">
            <Link href={admin ? "/dashboard/admin" : "/dashboard/brands"}><ArrowLeft className="size-4" /> {admin ? "Admin" : "Brands"}</Link>
          </Button>
        )}
      />
      <DashboardPanel>
        <BrandEditor brand={brand} admin={admin} />
      </DashboardPanel>
    </DashboardPage>
  )
}
