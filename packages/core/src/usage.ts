/**
 * shieldcn
 * usage
 *
 * Per-owner monthly usage counters (e.g. brand scrapes). Counts live in
 * `usage_counters` keyed by (owner_id, metric, period) where `period` is the
 * UTC calendar month (YYYY-MM), so the count resets on the 1st automatically.
 */

import { query, initDB } from "./db"

/** Current UTC calendar-month bucket, e.g. "2026-07". */
export function currentMonthPeriod(now = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/** How many times `metric` has been used by `ownerId` this calendar month. */
export async function getMonthlyUsage(ownerId: string, metric: string): Promise<number> {
  try {
    await initDB()
    const { rows } = await query<{ count: number }>(
      `SELECT count FROM usage_counters WHERE owner_id = $1 AND metric = $2 AND period = $3`,
      [ownerId, metric, currentMonthPeriod()],
    )
    return rows[0]?.count ?? 0
  } catch {
    return 0
  }
}

/** Increment (atomically) and return the new monthly count for a metric. */
export async function incrementMonthlyUsage(ownerId: string, metric: string): Promise<number> {
  await initDB()
  const { rows } = await query<{ count: number }>(
    `INSERT INTO usage_counters (owner_id, metric, period, count, updated_at)
       VALUES ($1, $2, $3, 1, NOW())
     ON CONFLICT (owner_id, metric, period)
       DO UPDATE SET count = usage_counters.count + 1, updated_at = NOW()
     RETURNING count`,
    [ownerId, metric, currentMonthPeriod()],
  )
  return rows[0]?.count ?? 1
}

/** ISO date (UTC) when the current month's counters reset (1st of next month). */
export function nextMonthResetDate(now = new Date()): string {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const next = new Date(Date.UTC(m === 11 ? y + 1 : y, (m + 1) % 12, 1))
  return next.toISOString().slice(0, 10)
}

export const BRAND_SCRAPE_METRIC = "brand_scrape"
export const BRAND_SCRAPES_PER_MONTH = 5
