/**
 * shieldcn
 * app/stats/page.tsx
 *
 * Public stats page — real site analytics from OpenPanel (pageviews,
 * visitors, sessions, top pages) plus project stats from GitHub, so
 * potential sponsors and advertisers can see traffic before reaching out.
 * Linked only from the site footer.
 */

import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { StatsAreaChart } from "@/components/stats-area-chart"
import { pageMetadata } from "@/lib/metadata"
import {
  getAnalyticsOverview,
  getTopPages,
  getLiveVisitors,
  getBadgesServed,
} from "@/lib/openpanel-insights"
import { getGenCount } from "@shieldcn/core/gen-counter"

export const metadata: Metadata = pageMetadata({
  title: "Stats",
  description:
    "Public shieldcn stats — pageviews, visitors, top pages, and project activity over the last 30 days. Live site analytics for potential sponsors.",
  path: "/stats",
})

export const revalidate = 3600

const GH_HEADERS = {
  Accept: "application/vnd.github.v3+json",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {}),
}

async function getGitHubStars(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/jal-co/shieldcn", {
      headers: GH_HEADERS,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return (await res.json()).stargazers_count ?? null
  } catch {
    return null
  }
}

function formatStat(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—"
  return new Intl.NumberFormat("en-US").format(Math.round(n))
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—"
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

function ChartCard({
  title,
  points,
  color,
}: {
  title: string
  points: number[]
  color: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        {title}
      </p>
      <StatsAreaChart points={points} color={color} label={`${title}, last 30 days`} />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>30d ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}

export default async function StatsPage() {
  const [overview, topPages, live, badges, stars, genCount] = await Promise.all([
    getAnalyticsOverview(),
    getTopPages(),
    getLiveVisitors(),
    getBadgesServed(),
    getGitHubStars(),
    getGenCount(),
  ])

  const summary = overview?.summary
  const series = overview?.series ?? []

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stats</h1>
            {live !== null && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                {formatStat(live)} online now
              </p>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Public site analytics for the last 30 days, straight from{" "}
            <a
              href="https://openpanel.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground"
            >
              OpenPanel
            </a>
            . No fudging — the same numbers we see.
          </p>

          {summary ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Pageviews" value={formatStat(summary.total_screen_views)} />
                <StatCard label="Visitors" value={formatStat(summary.unique_visitors)} />
                <StatCard label="Sessions" value={formatStat(summary.total_sessions)} />
                <StatCard
                  label="Avg. session"
                  value={formatDuration(summary.avg_session_duration)}
                />
              </div>

              <div className="mt-4 grid gap-4">
                <ChartCard
                  title="Pageviews"
                  points={series.map((p) => p.total_screen_views)}
                  color="var(--chart-1)"
                />
                <ChartCard
                  title="Visitors"
                  points={series.map((p) => p.unique_visitors)}
                  color="var(--chart-2)"
                />
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Analytics are temporarily unavailable. Check back soon.
            </div>
          )}

          {badges && (
            <>
              <h2 className="mt-10 text-lg font-semibold tracking-tight">Badge traffic</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every badge served — README embeds, npm pages, docs sites —
                tracked server-side at render time.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <StatCard label="Badges served (30d)" value={formatStat(badges.total)} />
                <StatCard
                  label="Per day (avg)"
                  value={formatStat(badges.series.length ? badges.total / badges.series.length : null)}
                />
              </div>
              <div className="mt-4">
                <ChartCard
                  title="Badges served"
                  points={badges.series.map((p) => p.count)}
                  color="var(--chart-3)"
                />
              </div>
            </>
          )}

          {topPages && topPages.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">Top pages</p>
              <ul className="divide-y divide-border">
                {topPages.map((page) => (
                  <li
                    key={page.path}
                    className="flex items-center justify-between gap-4 py-2 text-sm"
                  >
                    <span className="truncate">{page.path}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatStat(page.sessions)} sessions
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="mt-10 text-lg font-semibold tracking-tight">Project</h2>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <StatCard label="GitHub stars" value={formatStat(stars)} />
            <StatCard label="Badges generated" value={formatStat(genCount)} />
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Website metrics and badge traffic are tracked separately — badge
            counts are server-side render events, not pageviews. Interested in
            sponsoring?{" "}
            <Link href="/sponsor" className="underline underline-offset-4 hover:text-foreground">
              See sponsor tiers
            </Link>
            .
          </p>
        </div>
      </main>
    </SiteShell>
  )
}
