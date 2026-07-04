import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { BadgeCheck } from "lucide-react"
import { BadgesLibrary } from "@/components/dashboard/badges-library"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan, type Plan } from "@shieldcn/core/entitlements"
import { listSavedBadges, badgeLimitForPlan } from "@shieldcn/core/saved-badges"

export const metadata: Metadata = pageMetadata({
  title: "Saved badges",
  description: "Your reusable badge library — save a badge once and drop it into any README.",
  path: "/dashboard/badges",
})

export default async function SavedBadgesPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const ownerId = session.orgId ?? session.userId
  const plan: Plan = await getPlan(ownerId)
  const badges = await listSavedBadges(ownerId)
  const limit = badgeLimitForPlan(plan)

  const initialBadges = badges.map((b) => ({
    id: b.id,
    name: b.name,
    alt: b.alt,
    config: b.config,
    hasSvg: b.hasSvg,
    updatedAt: b.updatedAt,
  }))

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14 md:px-10">
      <div className="flex items-center gap-2">
        <BadgeCheck className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Saved badges</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        A reusable library of your favorite badges. Save one from the Studio or
        the builder, then drop it into any README — no re-configuring the same
        badge twice. Free saves {badgeLimitForPlan("free")}; Plus{" "}
        {badgeLimitForPlan("plus")}.
      </p>

      <BadgesLibrary initialBadges={initialBadges} limit={limit} plan={plan} />
    </div>
  )
}
