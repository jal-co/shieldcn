import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { AdminSettings } from "@/components/dashboard/admin-settings"
import { AdminBrands } from "@/components/dashboard/admin-brands"
import { AdminClaims } from "@/components/dashboard/admin-claims"
import { pageMetadata } from "@/lib/metadata"
import { getAdmin } from "@/lib/admin"
import { getBoolSetting } from "@shieldcn/core/settings"
import { listAllBrands } from "@shieldcn/core/brands"
import { listBrandClaims } from "@shieldcn/core/brand-claims"

export const metadata: Metadata = pageMetadata({
  title: "Admin",
  description: "Site administration.",
  path: "/dashboard/admin",
})

export default async function AdminPage() {
  const admin = await getAdmin()
  // Non-admins (and misconfigured deployments) get a 404 — no hint the page exists.
  if (!admin) notFound()

  const showcaseBrandBadges = await getBoolSetting("showcaseBrandBadges")
  const allBrands = await listAllBrands()
  const initialBrands = allBrands.map((b) => ({ id: b.id, slug: b.slug, name: b.name, ownerId: b.ownerId }))

  const SITE = process.env.NEXT_PUBLIC_URL ?? "https://shieldcn.dev"
  const claims = await listBrandClaims()
  const initialClaims = claims.map((c) => ({
    token: c.token,
    brandSlug: c.brandSlug,
    brandName: c.brandName,
    claimedBy: c.claimedBy,
    claimedAt: c.claimedAt,
    expiresAt: c.expiresAt,
    createdAt: c.createdAt,
    url: `${SITE}/claim/${c.token}`,
  }))

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Admin"
        icon={<ShieldAlert className="size-4" />}
        description="Global site controls. Changes here affect every visitor."
      />
      <DashboardPanel>
        <AdminSettings initial={{ showcaseBrandBadges }} />
      </DashboardPanel>
      <DashboardPanel>
        <AdminClaims initialClaims={initialClaims} />
      </DashboardPanel>
      <DashboardPanel>
        <AdminBrands initialBrands={initialBrands} />
      </DashboardPanel>
    </DashboardPage>
  )
}
