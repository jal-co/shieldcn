import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14 md:px-10">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Saved READMEs</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Your cloud-synced README documents. Open one to edit in the Studio —
        changes auto-save. Free syncs {docLimitForPlan("free")}; Plus{" "}
        {docLimitForPlan("plus")}.
      </p>

      <ReadmesList initialDocs={initialDocs} limit={limit} plan={plan} />
    </div>
  )
}
