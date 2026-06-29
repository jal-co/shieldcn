/**
 * shieldcn
 * src/providers/commit-history
 *
 * GitHub lifetime commit-history data provider. Builds a cumulative time series
 * of a user's public commit contributions across their whole account lifetime —
 * one satisfying, rising curve, the same data as the green contribution graph.
 *
 * A homage to (and directly inspired by) Peet von Zweigbergk's
 * **commit-history** — "a star-history, but for commits":
 *   https://github.com/peetzweg/commit-history
 *
 * Like that project, the numbers come from GitHub's GraphQL
 * `user.contributionsCollection.totalCommitContributions`. A single collection
 * spans at most a year, so a lifetime is sliced into monthly windows and the
 * counts are accumulated. Windows are batched (a year of months per GraphQL
 * query, aliased) to keep the request count low, distributed across the shared
 * token pool, and cached with a last-known-good fallback — exactly like the
 * star-history provider.
 */

import { githubGraphQL } from "./github"
import { cachedFetchStale } from "../cache"

/** A single point on a cumulative commit curve. */
export interface CommitPoint {
  /** ISO-8601 timestamp (window end). */
  date: string
  /** Cumulative public commits up to that moment. */
  value: number
}

/** Resolved cumulative commit series for a user. */
export interface CommitHistory {
  login: string
  /** Total public commits over the account's lifetime. */
  total: number
  /** ISO-8601 account creation timestamp. */
  createdAt: string
  /** Time-ordered cumulative points (first → last). */
  points: CommitPoint[]
}

/** Hard cap on monthly windows (~25 years) — GitHub predates 2008 by nobody. */
const MAX_WINDOWS = 300
/** Monthly windows aliased into a single GraphQL query. */
const WINDOW_BATCH = 12

/** UTC month-start for a date. */
function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

/** Add `n` months to a UTC month-start date. */
function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
}

/** Build the inclusive list of [from, to) monthly windows from birth → now. */
function monthlyWindows(createdAt: Date, now: Date): Array<{ from: string; to: string }> {
  const windows: Array<{ from: string; to: string }> = []
  let cursor = monthStart(createdAt)
  while (cursor.getTime() < now.getTime() && windows.length < MAX_WINDOWS) {
    const next = addMonths(cursor, 1)
    const to = next.getTime() < now.getTime() ? next : now
    windows.push({ from: cursor.toISOString(), to: to.toISOString() })
    cursor = next
  }
  return windows
}

/** Fetch the account creation timestamp, or null if the user doesn't exist. */
async function fetchCreatedAt(login: string): Promise<string | null> {
  const data = await githubGraphQL(
    "query($login:String!){ user(login:$login){ createdAt } }",
    { login },
    60 * 60 * 24, // creation date is immutable — cache a day
  )
  const user = data?.user as { createdAt?: string } | null | undefined
  return typeof user?.createdAt === "string" ? user.createdAt : null
}

/**
 * Fetch totalCommitContributions for a batch of monthly windows in one query.
 * Returns the per-window counts in order (0 for any window GitHub omits).
 */
async function fetchWindowBatch(
  login: string,
  windows: Array<{ from: string; to: string }>,
): Promise<number[] | null> {
  const fields = windows
    .map(
      (w, i) =>
        `w${i}: contributionsCollection(from:"${w.from}",to:"${w.to}"){ totalCommitContributions }`,
    )
    .join("\n")
  const query = `query($login:String!){ user(login:$login){ ${fields} } }`
  const data = await githubGraphQL(query, { login }, 60 * 60 * 6)
  const user = data?.user as Record<string, unknown> | null | undefined
  if (!user) return null
  return windows.map((_, i) => {
    const node = user[`w${i}`] as { totalCommitContributions?: number } | undefined
    return typeof node?.totalCommitContributions === "number" ? node.totalCommitContributions : 0
  })
}

/** Uncached builder — see {@link getCommitHistory} for the cached entrypoint. */
async function buildCommitHistory(login: string): Promise<CommitHistory | null> {
  const createdAt = await fetchCreatedAt(login)
  if (!createdAt) return null

  const now = new Date()
  const windows = monthlyWindows(new Date(createdAt), now)

  // Brand-new account with no full month yet — flat baseline at zero.
  if (windows.length === 0) {
    return { login, total: 0, createdAt, points: [{ date: createdAt, value: 0 }] }
  }

  // Batch the monthly windows (a year per query) and fetch in parallel.
  const batches: Array<Array<{ from: string; to: string }>> = []
  for (let i = 0; i < windows.length; i += WINDOW_BATCH) {
    batches.push(windows.slice(i, i + WINDOW_BATCH))
  }
  const results = await Promise.all(batches.map((b) => fetchWindowBatch(login, b)))
  if (results.some((r) => r === null)) return null

  const counts = results.flat() as number[]

  // Accumulate. Start the curve at account birth (value 0), then a cumulative
  // point at each window end.
  const points: CommitPoint[] = [{ date: createdAt, value: 0 }]
  let cumulative = 0
  windows.forEach((w, i) => {
    cumulative += counts[i] ?? 0
    points.push({ date: w.to, value: cumulative })
  })

  return { login, total: cumulative, createdAt, points }
}

/**
 * Cached lifetime commit-history series with last-known-good fallback. Returns
 * null when the user can't be resolved and there's no prior good value.
 */
export async function getCommitHistory(login: string): Promise<CommitHistory | null> {
  return cachedFetchStale(
    "github",
    `commithistory/${login}`,
    () => buildCommitHistory(login),
    60 * 60 * 6, // fresh 6h — past months are immutable, only the trailing month moves
    60 * 60 * 24 * 30, // 30-day last-known-good
  )
}
