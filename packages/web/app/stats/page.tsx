/**
 * shieldcn
 * app/stats/page.tsx
 *
 * Public stats page — real site analytics from OpenPanel (traffic,
 * audience geography, sources) plus badge-serving volume, presented the
 * way a potential sponsor or advertiser would want to evaluate it.
 * Linked only from the site footer.
 */

import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { StatsSection } from "@/components/stats/stats-section"
import { TrafficChart, BadgesChart } from "@/components/stats/traffic-chart"
import { WorldMap } from "@/components/stats/world-map"
import { pageMetadata } from "@/lib/metadata"
import {
  getAnalyticsOverview,
  getTopPages,
  getLiveVisitors,
  getBadgesServed,
  getCountries,
} from "@/lib/openpanel-insights"
import { getGenCount } from "@shieldcn/core/gen-counter"

export const metadata: Metadata = pageMetadata({
  title: "Stats",
  description:
    "Public shieldcn stats — pageviews, visitors, audience geography, traffic sources, and badges served over the last 30 days. Live analytics for potential sponsors.",
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

function countryName(iso2: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso2) ?? iso2
  } catch {
    return iso2
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2 className="mt-10 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </>
  )
}

/** Horizontal share bar for referrer / country lists. */
function ShareRow({
  label,
  value,
  max,
}: {
  label: string
  value: number
  max: number
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <li className="relative overflow-hidden rounded-md">
      <span
        className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <span className="relative flex items-center justify-between gap-4 px-3 py-1.5 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatStat(value)}
        </span>
      </span>
    </li>
  )
}

export default async function StatsPage() {
  const [overview, topPages, live, badges, countries, stars, genCount] =
    await Promise.all([
      getAnalyticsOverview(),
      getTopPages(),
      getLiveVisitors(),
      getBadgesServed(),
      getCountries(),
      getGitHubStars(),
      getGenCount(),
    ])

  const summary = overview?.summary
  const series = overview?.series ?? []

  const trafficPoints = series.map((p) => ({
    date: p.date,
    pageviews: p.total_screen_views,
    visitors: p.unique_visitors,
  }))

  const countryRows = (countries ?? []).slice(0, 12)
  const maxCountry = Math.max(...countryRows.map((c) => c.sessions), 0)

  let sectionIndex = 0

  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="px-6 py-8 md:px-10 md:py-10">
          <StatsSection index={sectionIndex++}>
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
              Public analytics for the last 30 days, straight from{" "}
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
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Pageviews" value={formatStat(summary.total_screen_views)} />
                <StatCard label="Visitors" value={formatStat(summary.unique_visitors)} />
                <StatCard label="Sessions" value={formatStat(summary.total_sessions)} />
                <StatCard
                  label="Avg. session"
                  value={formatDuration(summary.avg_session_duration)}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                Analytics are temporarily unavailable. Check back soon.
              </div>
            )}
          </StatsSection>

          {trafficPoints.length > 1 && (
            <StatsSection index={sectionIndex++}>
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-4 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} aria-hidden />
                    Pageviews
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} aria-hidden />
                    Visitors
                  </span>
                </div>
                <TrafficChart points={trafficPoints} />
              </div>
            </StatsSection>
          )}

          {countryRows.length > 0 && (
            <StatsSection index={sectionIndex++}>
              <SectionHeading
                title="Audience"
                sub="Where visitors come from — sessions by country."
              />
              <div className="mt-3 grid gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-lg border border-border bg-card p-4">
                  <WorldMap countries={countries ?? []} />
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">Top countries</p>
                  <ul className="grid gap-1">
                    {countryRows.map((c) => (
                      <ShareRow
                        key={c.name}
                        label={countryName(c.name)}
                        value={c.sessions}
                        max={maxCountry}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </StatsSection>
          )}

          {badges && (
            <StatsSection index={sectionIndex++}>
              <SectionHeading
                title="Badge traffic"
                sub="Every badge served — README embeds, npm pages, docs sites — tracked server-side at render time."
              />
              <div className="mt-3 grid grid-cols-2 gap-4">
                <StatCard label="Badges served (30d)" value={formatStat(badges.total)} />
                <StatCard
                  label="Per day (avg)"
                  value={formatStat(
                    badges.series.length ? badges.total / badges.series.length : null,
                  )}
                />
              </div>
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <BadgesChart
                  points={badges.series.map((p) => ({ date: p.date, badges: p.count }))}
                />
              </div>
            </StatsSection>
          )}

          {topPages && topPages.length > 0 && (
            <StatsSection index={sectionIndex++}>
              <SectionHeading title="Top pages" sub="Most visited pages by sessions." />
              <div className="mt-3 rounded-lg border border-border bg-card p-4">
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
            </StatsSection>
          )}

          <StatsSection index={sectionIndex++}>
            <SectionHeading title="Project" sub="The open-source project behind the numbers." />
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
          </StatsSection>
        </div>
      </main>
    </SiteShell>
  )
}
