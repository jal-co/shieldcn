/**
 * shieldcn
 * lib/providers/views
 *
 * GitHub profile / repo view counters — badges with a live, incrementing count.
 * Each GET increments the stored count by one and renders the new total.
 *
 * Unlike every other provider, a view counter is STATEFUL: the value changes on
 * every read. The route handler serves these badges with no-store cache headers
 * (see route-handler.ts) so GitHub's camo proxy re-fetches and the count keeps
 * moving instead of being pinned at the CDN.
 *
 * Migration: the `?base=N` query param is added to the live count at render
 * time (it is never stored). This mirrors GitViews' approach so an existing
 * total from another counter can be carried over — the `base` value must remain
 * in the URL permanently to keep the adjusted total correct.
 *
 * Inspired by remvze/gitviews and badgen.net/memo.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { getPool, query } from "../db"

let tableCreated = false

async function ensureTable() {
  if (tableCreated) return
  const db = getPool()
  await db.query(`
    CREATE TABLE IF NOT EXISTS view_counts (
      key TEXT PRIMARY KEY,
      count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  tableCreated = true
}

/**
 * Atomically increment a counter and return the new value.
 *
 * A single INSERT … ON CONFLICT … RETURNING is race-safe: concurrent hits each
 * get their own incremented row value without a read-modify-write window.
 */
async function bump(key: string): Promise<number> {
  await ensureTable()
  const result = await query<{ count: string }>(
    `INSERT INTO view_counts (key, count, updated_at)
       VALUES ($1, 1, NOW())
     ON CONFLICT (key) DO UPDATE SET
       count = view_counts.count + 1,
       updated_at = NOW()
     RETURNING count`,
    [key],
  )
  return Number(result.rows[0]?.count ?? 0)
}

/** Parse and clamp the `?base=N` migration offset. Non-numeric/negative → 0. */
function parseBase(base: string | null | undefined): number {
  if (!base) return 0
  const n = Number.parseInt(base, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Increment and render a view-count badge.
 *
 * `kind` selects the counter namespace and default label:
 *   - "repo"    → /views/repo/{owner}/{repo}     "views"
 *   - "user"    → /views/user/{username}          "profile views"
 *   - "repos"   → /views/user/{username}/repos    "repo views"
 *
 * On any DB failure the badge still renders (count "—") rather than breaking
 * the image — a view counter must never produce a broken `<img>`.
 */
export async function getViewCount(
  kind: "repo" | "user" | "repos",
  id: string,
  base: string | null | undefined,
): Promise<BadgeData> {
  const label = kind === "repo" ? "views" : kind === "repos" ? "repo views" : "profile views"
  const key = kind === "repo" ? `repo:${id}` : kind === "repos" ? `user:${id}/repos` : `user:${id}`

  try {
    const live = await bump(key)
    const total = live + parseBase(base)
    return {
      label,
      value: formatCount(total),
      // Signal to the route handler that this response must not be cached, so
      // the count keeps incrementing on every real view.
      noStore: true,
    }
  } catch {
    return { label, value: "—", noStore: true }
  }
}
