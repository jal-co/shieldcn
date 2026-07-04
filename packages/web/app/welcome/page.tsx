import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SiteShell } from "@/components/site-shell"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"

// Reads the session cookie (getSession) — always render dynamically.
export const dynamic = "force-dynamic"

export const metadata: Metadata = pageMetadata({
  title: "Welcome",
  description: "Get started with shieldcn — save your first README, migrate badges, and set up your brand.",
  path: "/welcome",
})

export default async function WelcomePage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16 md:px-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome{session.name ? `, ${session.name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              A few quick steps to get the most out of shieldcn. You can always
              come back to this from your dashboard.
            </p>
          </div>

          <OnboardingFlow />

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
