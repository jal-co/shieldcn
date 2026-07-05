import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRightLeft, BadgeCheck, CreditCard, FileText, Palette, Plus, WandSparkles } from "lucide-react"
import { PortalButton } from "@/components/billing-buttons"
import { CheckoutSuccess } from "@/components/checkout-success"
import {
  DashboardPage,
  DashboardPageHeader,
  DashboardPanel,
  DashboardStat,
} from "@/components/dashboard/dashboard-page"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { UpgradeInline } from "@/components/upgrade-cta"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { listBrandsByOwner } from "@shieldcn/core/brands"
import { listDocs } from "@shieldcn/core/studio-docs"
import { listSavedBadges } from "@shieldcn/core/saved-badges"

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Manage your brands, saved READMEs, and billing.",
  path: "/dashboard",
})

export default async function DashboardPageRoute() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)
  const [brands, docs, savedBadges] = await Promise.all([
    listBrandsByOwner(ownerId),
    listDocs(ownerId),
    listSavedBadges(ownerId),
  ])

  const firstName = (session.name ?? "").trim().split(/\s+/)[0]

  return (
    <DashboardPage>
      <CheckoutSuccess />
      <DashboardPageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Everything you've saved on shieldcn — READMEs, components, and brands — in one place."
        actions={(
          <>
            <Badge variant={plan === "free" ? "outline" : "default"}>{plan.toUpperCase()}</Badge>
            {plan === "free" ? (
              <Button asChild size="sm">
                <Link href="/pricing">Upgrade</Link>
              </Button>
            ) : (
              <PortalButton size="sm" variant="outline">
                <CreditCard className="size-4" /> Billing
              </PortalButton>
            )}
          </>
        )}
      />

      {/* Compact stat strip — secondary, quick jumps into each area */}
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardStat
          label="Saved READMEs"
          value={docs.length}
          icon={<FileText className="size-4" />}
          href="/dashboard/readmes"
        />
        <DashboardStat
          label="Saved components"
          value={savedBadges.length}
          icon={<BadgeCheck className="size-4" />}
          href="/dashboard/badges"
        />
        <DashboardStat
          label="Managed brands"
          value={plan === "plus" ? brands.length : 0}
          icon={<Palette className="size-4" />}
          href="/dashboard/brands"
        />
      </div>

      {/* Primary column leads; recent + actions are the quieter rail */}
      <div className="grid gap-6 @4xl/main:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
        <div className="flex flex-col gap-6">
          <DashboardPanel className="empty:hidden">
            <OnboardingFlow compact hideWhenDone />
          </DashboardPanel>

          <DashboardPanel className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Recent READMEs</h2>
              <Badge variant="secondary" className="h-5 rounded-full px-2 text-xs">
                {docs.length}
              </Badge>
              <Button asChild size="sm" variant="ghost" className="ml-auto text-muted-foreground">
                <Link href="/dashboard/readmes">View all</Link>
              </Button>
            </div>
            {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No saved READMEs yet.{" "}
                <Link href="/studio" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Open the Studio
                </Link>{" "}
                to save your first.
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {docs.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/studio?doc=${d.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{d.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">Open →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </div>

        <DashboardPanel className="flex h-fit flex-col gap-4">
          <div className="flex items-center gap-2">
            <WandSparkles className="size-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Quick actions</h2>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link href="/studio"><Plus className="size-4" /> New README</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/dashboard/badges"><BadgeCheck className="size-4" /> Save a component</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/migrate"><ArrowRightLeft className="size-4" /> Migrate from shields.io</Link>
            </Button>
            {plan === "plus" ? (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/dashboard/brands/new"><Palette className="size-4" /> Create a brand</Link>
              </Button>
            ) : (
              <UpgradeInline tier="plus" feature="Managed brands" />
            )}
          </div>
        </DashboardPanel>
      </div>
    </DashboardPage>
  )
}
