import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BadgeCheck, FileText, Palette, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { CheckoutSuccess } from "@/components/checkout-success"
import { UpgradeInline } from "@/components/upgrade-cta"
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

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)
  const [brands, docs, savedBadges] = await Promise.all([
    listBrandsByOwner(ownerId),
    listDocs(ownerId),
    listSavedBadges(ownerId),
  ])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-14 md:px-10">
      <CheckoutSuccess />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                {session.name ?? session.email ?? "Signed in"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={plan === "free" ? "outline" : "default"}>
                {plan.toUpperCase()}
              </Badge>
              {plan === "free" && (
                <Button asChild size="sm">
                  <Link href="/pricing">Upgrade</Link>
                </Button>
              )}
              {plan !== "free" && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/api/portal">
                    <CreditCard className="mr-1.5 size-4" /> Billing
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Getting started — tiered onboarding checklist (dismisses itself
              once every step for the current plan is done). */}
          <section className="rounded-xl border border-border p-5">
            <OnboardingFlow compact />
          </section>

          {/* Saved READMEs */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Saved READMEs</h2>
              <span className="text-sm text-muted-foreground">({docs.length})</span>
            </div>
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved READMEs yet.{" "}
                <Link href="/studio" className="underline underline-offset-4 hover:text-foreground">
                  Open the Studio
                </Link>{" "}
                and save your work — your plan syncs{" "}
                {plan === "free" ? "2" : "50"} to the cloud.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>{d.name}</span>
                    <Link
                      href={`/studio?doc=${d.id}`}
                      className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {plan === "free" && (
              <p className="text-xs text-muted-foreground">
                Free syncs 2 READMEs.{" "}
                <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">
                  Plus
                </Link>{" "}
                raises it to 50.
              </p>
            )}
          </section>

          {/* Saved badges */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Saved badges</h2>
              <span className="text-sm text-muted-foreground">({savedBadges.length})</span>
              <Button asChild size="sm" variant="outline" className="ml-auto">
                <Link href="/dashboard/badges">Manage</Link>
              </Button>
            </div>
            {savedBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved badges yet. Configure a badge in the{" "}
                <Link href="/studio" className="underline underline-offset-4 hover:text-foreground">
                  Studio
                </Link>{" "}
                and hit <strong>Save badge</strong> to reuse it anywhere.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {savedBadges.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="truncate">{b.name}</span>
                    <Link
                      href="/dashboard/badges"
                      className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Brands */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Brands</h2>
              <span className="text-sm text-muted-foreground">({brands.length})</span>
              {plan !== "plus" && <Badge variant="outline">Plus</Badge>}
              {plan === "plus" && (
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <Link href="/dashboard/brands/new">Add brand</Link>
                </Button>
              )}
            </div>
            {plan !== "plus" ? (
              <UpgradeInline tier="plus" feature="Managed brands" />
            ) : brands.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No brands yet. A brand restyles every badge and header that
                references it — edit once, update everywhere.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {brands.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <Link
                      href={`/dashboard/brands/${b.slug}`}
                      className="font-mono underline-offset-4 hover:underline"
                    >
                      ?brand={b.slug}
                    </Link>
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/dashboard/brands/${b.slug}`}
                        className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
    </div>
  )
}
