/**
 * @shieldcn/core
 * src/badge-stats.ts
 *
 * Per-day badge render rollup that feeds the Pro analytics dashboard. Written
 * fire-and-forget from the badge track path (never in the request's critical
 * path) and queried per brand by the dashboard.
 */

import { query, initDB } from "./db"

export interface BadgeStatEvent {
  brandId?: number | null
  provider: string
  subject?: string
  source?: string
}

/**
 * Increment today's rollup bucket for a rendered badge. Best-effort: any error
 * is swallowed so analytics can never affect badge delivery. Call without
 * awaiting from the onTrack path.
 */
export async function recordBadgeStat(event: BadgeStatEvent): Promise<void> {
  try {
    await initDB()
    await query(
      `INSERT INTO badge_stats_daily (day, brand_id, provider, subject, source, count)
         VALUES (CURRENT_DATE, $1, $2, $3, $4, 1)
       ON CONFLICT (day, brand_id, provider, subject, source)
         DO UPDATE SET count = badge_stats_daily.count + 1`,
      [
        event.brandId ?? 0,
        event.provider.slice(0, 64),
        (event.subject ?? "").slice(0, 200),
        (event.source ?? "direct").slice(0, 32),
      ],
    )
  } catch {
    /* analytics is best-effort — never surface to the request */
  }
}

export interface BrandStatsSummary {
  totalRenders: number
  bySubject: { subject: string; count: number }[]
  bySource: { source: string; count: number }[]
  trend: { day: string; count: number }[]
}

/**
 * Aggregate a brand's badge stats over the last `days` days for the dashboard.
 */
export async function getBrandStats(
  brandId: number,
  days = 30,
): Promise<BrandStatsSummary> {
  await initDB()
  const since = `${days} days`

  const [total, subjects, sources, trend] = await Promise.all([
    query<{ sum: string | null }>(
      `SELECT SUM(count)::text AS sum FROM badge_stats_daily
        WHERE brand_id = $1 AND day >= CURRENT_DATE - $2::interval`,
      [brandId, since],
    ),
    query<{ subject: string; count: string }>(
      `SELECT subject, SUM(count)::text AS count FROM badge_stats_daily
        WHERE brand_id = $1 AND day >= CURRENT_DATE - $2::interval
        GROUP BY subject ORDER BY SUM(count) DESC LIMIT 50`,
      [brandId, since],
    ),
    query<{ source: string; count: string }>(
      `SELECT source, SUM(count)::text AS count FROM badge_stats_daily
        WHERE brand_id = $1 AND day >= CURRENT_DATE - $2::interval
        GROUP BY source ORDER BY SUM(count) DESC`,
      [brandId, since],
    ),
    query<{ day: string; count: string }>(
      `SELECT day::text AS day, SUM(count)::text AS count FROM badge_stats_daily
        WHERE brand_id = $1 AND day >= CURRENT_DATE - $2::interval
        GROUP BY day ORDER BY day ASC`,
      [brandId, since],
    ),
  ])

  return {
    totalRenders: Number(total.rows[0]?.sum ?? 0),
    bySubject: subjects.rows.map((r) => ({ subject: r.subject, count: Number(r.count) })),
    bySource: sources.rows.map((r) => ({ source: r.source, count: Number(r.count) })),
    trend: trend.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
  }
}
