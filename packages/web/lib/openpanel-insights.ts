/**
 * shieldcn
 * lib/openpanel-insights
 *
 * Server-side OpenPanel Insights API client for the public /stats page.
 * Requires a `read` (or `root`) API client — the default write client used
 * for tracking does NOT have Insights access.
 *
 * Env vars:
 *   OPENPANEL_PROJECT_ID          — the OpenPanel project id
 *   OPENPANEL_READ_CLIENT_ID      — a read-mode API client id
 *   OPENPANEL_READ_CLIENT_SECRET  — its secret
 *
 * Every fetcher fails open (returns null) so the stats page renders even
 * when OpenPanel is unreachable or the env vars aren't configured.
 */

const API_BASE = "https://api.openpanel.dev/insights"
const EXPORT_BASE = "https://api.openpanel.dev/export"

const projectId = process.env.OPENPANEL_PROJECT_ID
const clientId = process.env.OPENPANEL_READ_CLIENT_ID
const clientSecret = process.env.OPENPANEL_READ_CLIENT_SECRET

const configured = !!(projectId && clientId && clientSecret)

async function opGet<T>(path: string, revalidate = 3600): Promise<T | null> {
  if (!configured) return null
  try {
    const res = await fetch(`${API_BASE}/${projectId}${path}`, {
      headers: {
        "openpanel-client-id": clientId!,
        "openpanel-client-secret": clientSecret!,
      },
      next: { revalidate },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** Shape of /overview — verified against OpenPanel's overview.service.ts. */
export interface OverviewSummary {
  bounce_rate: number
  unique_visitors: number
  total_sessions: number
  avg_session_duration: number
  total_screen_views: number
  views_per_session: number
}

export interface OverviewSeriesPoint extends OverviewSummary {
  date: string
}

export interface AnalyticsOverview {
  summary: OverviewSummary
  series: OverviewSeriesPoint[]
  interval: string
  startDate: string
  endDate: string
}

/** Last 30 days of site metrics with a daily series. */
export function getAnalyticsOverview(): Promise<AnalyticsOverview | null> {
  return opGet<AnalyticsOverview>("/overview?range=30d&interval=day")
}

export interface TopPage {
  origin: string
  path: string
  sessions: number
}

/** Top pages by sessions over the last 30 days. */
export async function getTopPages(): Promise<TopPage[] | null> {
  const data = await opGet<TopPage[] | { items: TopPage[] }>("/pages/top?range=30d")
  if (!data) return null
  const items = Array.isArray(data) ? data : data.items
  return Array.isArray(items) ? items.slice(0, 8) : null
}

/** Current active visitors. Short cache — it's a "live" number. */
export async function getLiveVisitors(): Promise<number | null> {
  const data = await opGet<{ visitors: number }>("/live", 60)
  return typeof data?.visitors === "number" ? data.visitors : null
}

export interface CountryStat {
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  name: string
  sessions: number
  pageviews: number
}

/** Sessions/pageviews by country over the last 30 days. */
export async function getCountries(): Promise<CountryStat[] | null> {
  const data = await opGet<CountryStat[]>("/country?range=30d&limit=250")
  return Array.isArray(data) ? data.filter((c) => !!c.name) : null
}

export interface ReferrerStat {
  name: string | null
  sessions: number
  pageviews: number
}

/** Top traffic sources over the last 30 days. Null name = direct. */
export async function getTopReferrers(): Promise<ReferrerStat[] | null> {
  const data = await opGet<ReferrerStat[]>("/referrer_name?range=30d&limit=10")
  return Array.isArray(data) ? data : null
}

export interface BadgesServed {
  /** Total badge_rendered events in the window. */
  total: number
  /** Daily counts, oldest first. */
  series: { date: string; count: number }[]
}

/**
 * Badges served over the last 30 days — the count of server-tracked
 * badge_rendered events (every SVG/PNG/GIF badge response), via the
 * aggregated /export/charts endpoint.
 */
export async function getBadgesServed(): Promise<BadgesServed | null> {
  if (!configured) return null
  try {
    const params = new URLSearchParams({
      events: JSON.stringify([{ name: "badge_rendered", segment: "event" }]),
      range: "30d",
      interval: "day",
      chartType: "linear",
    })
    const res = await fetch(`${EXPORT_BASE}/charts?${params}`, {
      headers: {
        "openpanel-client-id": clientId!,
        "openpanel-client-secret": clientSecret!,
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const serie = data?.series?.[0]
    if (!serie) return null
    const series = (serie.data ?? []).map((p: { date: string; count: number }) => ({
      date: p.date,
      count: Number(p.count ?? 0),
    }))
    const total = Number(serie.metrics?.sum ?? 0)
    return { total, series }
  } catch {
    return null
  }
}

export function isAnalyticsConfigured(): boolean {
  return configured
}
