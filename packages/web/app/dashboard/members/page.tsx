import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MembersManager } from "@/components/auth/members-manager"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"

export const metadata: Metadata = pageMetadata({
  title: "Members",
  description: "Invite teammates and manage roles for your team workspace.",
  path: "/dashboard/members",
})

export default async function MembersPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-14 md:px-10">
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Members</h1>
            <p className="text-sm text-muted-foreground">
              Invite people to your team and manage their roles. Everyone in a
              team shares its brands and saved READMEs.
            </p>
          </div>

      <MembersManager />
    </div>
  )
}
