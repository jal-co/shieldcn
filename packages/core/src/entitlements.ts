/**
 * @shieldcn/core
 * src/entitlements.ts
 *
 * Plan resolution for the Plus/Pro tiers. The Polar webhook writes the
 * `subscriptions` row; everything else reads the plan through getPlan(), which
 * is cached briefly so hot paths (brand resolution, dashboard, API gates) don't
 * hit Postgres on every request.
 *
 * Plan hierarchy: free < plus < pro. `pro` implies every `plus` capability.
 */

import { query } from "./db"

export type Plan = "free" | "plus" | "pro"

const PLAN_RANK: Record<Plan, number> = { free: 0, plus: 1, pro: 2 }

/** A subscription is entitled only while active/trialing and unexpired. */
const ACTIVE_STATUSES = new Set(["active", "trialing"])

interface CacheEntry {
  plan: Plan
  expires: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 60_000

/**
 * Resolve the effective plan for an organization. Returns "free" for unknown
 * orgs, lapsed subscriptions, or when billing is not configured. Fail-open to
 * "free" on any error — a billing lookup must never break a request path.
 */
export async function getPlan(orgId: string | null | undefined): Promise<Plan> {
  if (!orgId) return "free"

  const cached = cache.get(orgId)
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
        WHERE org_id = $1`,
      [orgId],
    )
    const row = rows[0]
    if (row && ACTIVE_STATUSES.has(row.status)) {
      const unexpired =
        !row.current_period_end ||
        new Date(row.current_period_end).getTime() > Date.now()
      if (unexpired && (row.plan === "plus" || row.plan === "pro")) {
        plan = row.plan
      }
    }
  } catch {
    // Fail-open: treat billing outages as free rather than breaking the route.
    plan = "free"
  }

  cache.set(orgId, { plan, expires: Date.now() + TTL_MS })
  return plan
}

/** True when the org's plan is at least `min` in the free<plus<pro hierarchy. */
export async function hasPlan(
  orgId: string | null | undefined,
  min: Plan,
): Promise<boolean> {
  const plan = await getPlan(orgId)
  return PLAN_RANK[plan] >= PLAN_RANK[min]
}

/** Drop a cached plan immediately (call from the Polar webhook on change). */
export function invalidatePlan(orgId: string): void {
  cache.delete(orgId)
}

/**
 * Map a Polar product id to a plan. Configured via env so the same code runs
 * against sandbox and production products.
 */
export function planForProduct(productId: string | null | undefined): Plan {
  if (!productId) return "free"
  if (productId === process.env.POLAR_PRODUCT_PRO) return "pro"
  if (productId === process.env.POLAR_PRODUCT_PLUS) return "plus"
  return "free"
}
