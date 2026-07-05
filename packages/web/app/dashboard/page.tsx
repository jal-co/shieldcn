import type { Metadata } from "next"
import Link from "next/link"
import { Palette, Plus, Settings, WandSparkles } from "lucide-react"
import {
  DashboardPage,
  DashboardPageHeader,
  DashboardPanel,
  DashboardStat,
} from "@/components/dashboard/dashboard-page"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { listAllBrands } from "@shieldcn/core/brands"

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Admin brand management.",
  path: "/dashboard",
})

export default async function DashboardPageRoute() {
  const session = await getSession()
  const brands = await listAllBrands()

  const firstName = (session?.name ?? "").trim().split(/\s+/)[0]

  return (
    <DashboardPage>
      <DashboardPageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Manage the site's brands — create, edit, and restyle every embed from one place."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <DashboardStat
          label="Managed brands"
          value={brands.length}
          icon={<Palette className="size-4" />}
          href="/dashboard/brands"
        />
      </div>

      <DashboardPanel className="flex h-fit flex-col gap-4">
        <div className="flex items-center gap-2">
          <WandSparkles className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Quick actions</h2>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="justify-start">
            <Link href="/dashboard/brands/new"><Plus className="size-4" /> Create a brand</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/dashboard/brands"><Palette className="size-4" /> All brands</Link>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <Link href="/dashboard/admin"><Settings className="size-4" /> Site settings</Link>
          </Button>
        </div>
      </DashboardPanel>
    </DashboardPage>
  )
}
