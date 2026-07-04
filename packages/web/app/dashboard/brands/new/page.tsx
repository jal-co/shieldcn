import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { BrandEditor } from "@/components/brand-editor"
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14 md:px-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">New brand</h1>
            <p className="text-sm text-muted-foreground">
              Import a brand from its domain, review the palette and logos, then save.
            </p>
          </div>

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
    </div>
  )
}
