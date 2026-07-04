import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getSession } from "@/lib/auth"
import { getOwnedBrand } from "@shieldcn/core/brands"
import { getBrandStats } from "@shieldcn/core/badge-stats"

/**
 * Zero-fill the sparse rollup trend into a dense day-by-day series so the chart
 * shows quiet days as gaps, not as a compressed timeline. `days` matches the
 * getBrandStats window.
 */
function denseTrend(
  trend: { day: string; count: number }[],
  days: number,
): { day: string; count: number }[] {
  const byDay = new Map(trend.map((t) => [t.day.slice(0, 10), t.count]))
  const out: { day: string; count: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ day: key, count: byDay.get(key) ?? 0 })
  }
  return out
}

export default async function BrandAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getSession()
  if (!session) notFound()

  const ownerId = session.orgId ?? session.userId
  const brand = await getOwnedBrand(ownerId, slug)
  if (!brand) notFound()

  const DAYS = 30
  const stats = await getBrandStats(brand.id, DAYS)
  const trend = denseTrend(stats.trend, DAYS)
  const peak = Math.max(1, ...trend.map((t) => t.count))

  return (
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
              Last {DAYS} days
            </h2>
            {stats.totalRenders === 0 ? (
              <p className="text-sm text-muted-foreground">No renders yet.</p>
            ) : (
              <div className="rounded-lg border border-border p-4">
                <div className="flex h-28 items-end gap-[3px]">
                  {trend.map((t) => (
                    <div
                      key={t.day}
                      className="group relative flex h-full flex-1 items-end"
                      title={`${t.day}: ${t.count.toLocaleString()} renders`}
                    >
                      <div
                        className="w-full rounded-sm bg-foreground/70 transition-colors group-hover:bg-foreground"
                        style={{ height: `${Math.max(2, (t.count / peak) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{trend[0]?.day}</span>
                  <span>peak {peak.toLocaleString()}/day</span>
                  <span>{trend[trend.length - 1]?.day}</span>
                </div>
              </div>
            )}
          </section>

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
  )
}
