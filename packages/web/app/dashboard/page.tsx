import type { Metadata } from "next"
import Link from "next/link"
import { FileText, Palette, BarChart3, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { listBrandsByOrg } from "@shieldcn/core/brands"
import { listDocs } from "@shieldcn/core/studio-docs"

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Manage your brands, saved READMEs, analytics, and billing.",
  path: "/dashboard",
})

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    return (
      <SiteShell>
        <main className="min-w-0 flex-1">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your brands, saved READMEs, and billing.
            </p>
            <Button asChild>
              <Link href="/handler/sign-in">Sign in</Link>
            </Button>
          </div>
        </main>
      </SiteShell>
    )
  }

  const orgId = session.orgId
  const plan = orgId ? await getPlan(orgId) : "free"
  const [brands, docs] = orgId
    ? await Promise.all([listBrandsByOrg(orgId), listDocs(orgId)])
    : [[], []]

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-14 md:px-10">
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

          {!orgId && (
            <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              You don&apos;t have an active organization yet. Create one to save
              brands and READMEs to a company workspace.
            </div>
          )}

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
                and save your work (Plus).
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
          </section>

          {/* Brands */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Brands</h2>
              <span className="text-sm text-muted-foreground">({brands.length})</span>
              {plan !== "pro" && <Badge variant="outline">Pro</Badge>}
            </div>
            {brands.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No brands yet. A brand restyles every badge and header that
                references it — edit once, update everywhere.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {brands.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-mono">?brand={b.slug}</span>
                    <Link
                      href={`/dashboard/analytics/${b.slug}`}
                      className="inline-flex items-center gap-1 text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                      <BarChart3 className="size-3.5" /> Analytics
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
