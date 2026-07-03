import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SiteShell } from "@/components/site-shell"
import { getSession } from "@/lib/auth"
import { getOwnedBrand } from "@shieldcn/core/brands"
import { getBrandStats } from "@shieldcn/core/badge-stats"

export default async function BrandAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getSession()
  if (!session?.orgId) notFound()

  const brand = await getOwnedBrand(session.orgId, slug)
  if (!brand) notFound()

  const stats = await getBrandStats(brand.id, 30)

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-14 md:px-10">
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              Analytics — <span className="font-mono">{brand.slug}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              At least {stats.totalRenders.toLocaleString()} badge renders in the
              last 30 days. GitHub proxies badges through Camo with caching, so
              counts are a floor, not a total.
            </p>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              By source
            </h2>
            {stats.bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {stats.bySource.map((s) => (
                  <li key={s.source} className="flex justify-between px-4 py-2 text-sm">
                    <span>{s.source}</span>
                    <span className="font-mono text-muted-foreground">
                      {s.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Top subjects
            </h2>
            {stats.bySubject.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {stats.bySubject.slice(0, 25).map((s) => (
                  <li key={s.subject} className="flex justify-between gap-4 px-4 py-2 text-sm">
                    <span className="truncate font-mono">{s.subject || "—"}</span>
                    <span className="font-mono text-muted-foreground">
                      {s.count.toLocaleString()}
                    </span>
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
