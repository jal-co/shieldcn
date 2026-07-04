import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UpgradeInline } from "@/components/upgrade-cta"
import { BrandsList } from "@/components/dashboard/brands-list"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { listBrandsByOwner, brandLimitForPlan } from "@shieldcn/core/brands"

export const metadata: Metadata = pageMetadata({
  title: "Brands",
  description: "Manage your brands — colors, logos, fonts — referenced from any badge or header by URL.",
  path: "/dashboard/brands",
})

export default async function BrandsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  // Brands belong to the personal account. Managed brands are a Plus capability.
  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)
  const brands = plan === "plus" ? await listBrandsByOwner(ownerId) : []
  const limit = brandLimitForPlan(plan)

  const initialBrands = brands.map((b) => ({ id: b.id, slug: b.slug, name: b.name }))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14 md:px-10">
      <div className="flex items-center gap-2">
        <Palette className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Brands</h1>
        {plan !== "plus" && <Badge variant="outline">Plus</Badge>}
      </div>

      <p className="text-sm text-muted-foreground">
        A brand is a reusable set of colors, logos, and fonts. Reference it from
        any badge or header with <code className="font-mono">?brand=slug</code>{" "}
        and edit it once to update every embed.{" "}
        <Link href="/docs/plus/brands" className="underline underline-offset-4 hover:text-foreground">
          Learn more
        </Link>
      </p>

      {plan !== "plus" ? (
        <UpgradeInline tier="plus" feature="Managed brands" />
      ) : (
        <BrandsList initialBrands={initialBrands} limit={limit} />
      )}
    </div>
  )
}
