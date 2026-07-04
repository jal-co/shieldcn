import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"

import { BrandEditor } from "@/components/brand-editor"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { getOwnedBrand } from "@shieldcn/core/brands"

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

  // Personal-first: brands belong to the active team if one is selected, else
  // the personal account. Brands are a Pro capability for either owner type.
  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)
  if (plan !== "pro") redirect("/pricing")

  const brand = await getOwnedBrand(ownerId, slug)
  if (!brand) notFound()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14 md:px-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {brand.name ?? brand.slug}
              </h1>
              <p className="font-mono text-sm text-muted-foreground">?brand={brand.slug}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/analytics/${brand.slug}`}>
                <BarChart3 className="mr-1.5 size-4" /> Analytics
              </Link>
            </Button>
          </div>

          <BrandEditor brand={brand} />
    </div>
  )
}
