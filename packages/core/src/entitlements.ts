/**
 * @shieldcn/core
 * src/entitlements.ts
 *
 * Plan resolution for the single paid Plus tier. The Polar webhook writes the
 * `subscriptions` row; everything else reads the plan through getPlan(), which
 * is cached briefly so hot paths (brand resolution, dashboard, API gates) don't
 * hit Postgres on every request.
 *
 * Ownership is personal-first: an owner id is either a personal user id or an
 * active organization id. A subscription entitles whichever owner bought it.
 *
 * Plan hierarchy: free < plus.
 */

import { query } from "./db"

export type Plan = "free" | "plus"

const PLAN_RANK: Record<Plan, number> = { free: 0, plus: 1 }

/** A subscription is entitled only while active/trialing and unexpired. */
const ACTIVE_STATUSES = new Set(["active", "trialing"])

interface CacheEntry {
  plan: Plan
  expires: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60_000

/**
 * Dev-only plan override. Returns the forced plan ONLY when both hold:
 *   1. NODE_ENV is not "production" (never active in a prod build), and
 *   2. DEV_PLAN is set to a valid plan ("free" | "plus").
 * This lets local development exercise Plus-gated features (caps, gates)
 * without a real Polar subscription. Both guards must pass, so it is
 * impossible to trigger on a deployed production server.
 */
function devPlanOverride(): Plan | null {
  if (process.env.NODE_ENV === "production") return null
  const forced = process.env.DEV_PLAN
  if (forced === "plus" || forced === "free") return forced
  return null
}

/**
 * Resolve the effective plan for an organization. Returns "free" for unknown
 * orgs, lapsed subscriptions, or when billing is not configured. Fail-open to
 * "free" on any error — a billing lookup must never break a request path.
 */
export async function getPlan(ownerId: string | null | undefined): Promise<Plan> {
  if (!ownerId) return "free"

  // Local dev escape hatch (guarded to non-production + explicit opt-in).
  const forced = devPlanOverride()
  if (forced) return forced

  const cached = cache.get(ownerId)
  if (cached && cached.expires > Date.now()) return cached.plan

  let plan: Plan = "free"
  try {
    const { rows } = await query<{
      plan: string
      status: string
      current_period_end: Date | null
    }>(
      `SELECT plan, status, current_period_end
         FROM subscriptions
        WHERE owner_id = $1`,
      [ownerId],
    )
    const row = rows[0]
    if (row && ACTIVE_STATUSES.has(row.status)) {
      const unexpired =
        !row.current_period_end ||
        new Date(row.current_period_end).getTime() > Date.now()
      if (unexpired && row.plan === "plus") {
        plan = "plus"
      }
    }
  } catch {
    // Fail-open: treat billing outages as free rather than breaking the route.
    plan = "free"
  }

  cache.set(ownerId, { plan, expires: Date.now() + TTL_MS })
  return plan
}

/** True when the org's plan is at least `min` in the free<plus hierarchy. */
export async function hasPlan(
  ownerId: string | null | undefined,
  min: Plan,
): Promise<boolean> {
  const plan = await getPlan(ownerId)
  return PLAN_RANK[plan] >= PLAN_RANK[min]
}

/** Drop a cached plan immediately (call from the Polar webhook on change). */
export function invalidatePlan(ownerId: string): void {
  cache.delete(ownerId)
}

/**
 * Map a Polar product id to a plan. Configured via env so the same code runs
 * against sandbox and production products.
 */
export function planForProduct(productId: string | null | undefined): Plan {
  if (!productId) return "free"
  if (productId === process.env.POLAR_PRODUCT_PLUS) return "plus"
  return "free"
}
