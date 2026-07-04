import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UpgradeInline } from "@/components/upgrade-cta"
import { pageMetadata } from "@/lib/metadata"
import { getSession } from "@/lib/auth"
import { getPlan } from "@shieldcn/core/entitlements"
import { listBrandsByOwner } from "@shieldcn/core/brands"
import { getRenderTotals } from "@shieldcn/core/badge-stats"

export const metadata: Metadata = pageMetadata({
  title: "Analytics",
  description: "Badge render analytics across your brands.",
  path: "/dashboard/analytics",
})

export default async function AnalyticsPage() {
  const session = await getSession()
  if (!session) redirect("/sign-in")

  const ownerId = session.orgId ?? session.userId
  const plan = await getPlan(ownerId)
  const brands = plan === "pro" ? await listBrandsByOwner(ownerId) : []
  const totals = await getRenderTotals(brands.map((b) => b.id), 30)
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-14 md:px-10">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        {plan !== "pro" && <Badge variant="outline">Pro</Badge>}
      </div>

      <p className="text-sm text-muted-foreground">
        Badge render counts across your brands over the last 30 days. GitHub
        proxies badges through Camo with caching, so counts are a floor — at
        least this many, usually more.
      </p>

      {plan !== "pro" ? (
        <UpgradeInline tier="pro" feature="Badge analytics" />
      ) : brands.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          No brands yet. Analytics track renders per brand — {" "}
          <Link href="/dashboard/brands/new" className="underline underline-offset-4 hover:text-foreground">
            create a brand
          </Link>{" "}
          and reference it from your badges to start collecting data.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total renders (30d)</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {grandTotal > 0 ? `≥ ${grandTotal.toLocaleString()}` : "0"}
            </p>
          </div>

          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {brands.map((b) => {
              const count = totals[b.id] ?? 0
              return (
                <li key={b.id}>
                  <Link
                    href={`/dashboard/analytics/${b.slug}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{b.name ?? b.slug}</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">?brand={b.slug}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted-foreground">
                        {count > 0 ? `≥ ${count.toLocaleString()}` : "—"}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
