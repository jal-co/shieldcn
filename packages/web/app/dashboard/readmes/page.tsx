import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { DashboardPage, DashboardPageHeader, DashboardPanel } from "@/components/dashboard/dashboard-page"
import { ReadmesList } from "@/components/dashboard/readmes-list"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan, type Plan } from "@shieldcn/core/entitlements"
import { listDocs, docLimitForPlan } from "@shieldcn/core/studio-docs"

export const metadata: Metadata = pageMetadata({
  title: "Saved READMEs",
  description: "Manage your cloud-synced README documents.",
  path: "/dashboard/readmes",
})

export default async function ReadmesPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const ownerId = session.orgId ?? session.userId
  const plan: Plan = await getPlan(ownerId)
  const docs = await listDocs(ownerId)
  const limit = docLimitForPlan(plan)

  const initialDocs = docs.map((d) => ({
    id: d.id,
    name: d.name,
    updatedAt: d.updatedAt,
  }))

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="READMEs"
        icon={<FileText className="size-4" />}
        description={(
          <>
            Cloud-synced README documents. Open one to edit in the Studio; changes auto-save.
            Free syncs {docLimitForPlan("free")}; Plus syncs {docLimitForPlan("plus")}.
          </>
        )}
      />
      <DashboardPanel>
        <ReadmesList initialDocs={initialDocs} limit={limit} plan={plan} />
      </DashboardPanel>
    </DashboardPage>
  )
}
