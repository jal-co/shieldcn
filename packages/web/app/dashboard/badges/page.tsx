import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { BadgeCheck } from "lucide-react"
import { BadgesLibrary } from "@/components/dashboard/badges-library"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan, type Plan } from "@shieldcn/core/entitlements"
import { listSavedBadges, badgeLimitForPlan } from "@shieldcn/core/saved-badges"

export const metadata: Metadata = pageMetadata({
  title: "Components",
  description: "Your reusable badge component library — save a badge once and drop it into any README.",
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
    <DashboardPage>
      <DashboardPageHeader
        title="Components"
        icon={<BadgeCheck className="size-4" />}
        description={(
          <>
            A reusable library of your favorite badges. Save one from the Studio or builder, then drop it into any README.
            Free saves {badgeLimitForPlan("free")}; Plus saves {badgeLimitForPlan("plus")}.
          </>
        )}
      />
      <DashboardPanel>
        <BadgesLibrary initialBadges={initialBadges} limit={limit} plan={plan} />
      </DashboardPanel>
    </DashboardPage>
  )
}
