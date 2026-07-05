import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ShieldAlert } from "lucide-react"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { AdminSettings } from "@/components/dashboard/admin-settings"
import { AdminBrands } from "@/components/dashboard/admin-brands"
import { pageMetadata } from "@/lib/metadata"
import { getAdmin } from "@/lib/admin"
import { getBoolSetting } from "@shieldcn/core/settings"
import { listAllBrands } from "@shieldcn/core/brands"

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
        <AdminBrands initialBrands={initialBrands} />
      </DashboardPanel>
    </DashboardPage>
  )
}
