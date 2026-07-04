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

/**
 * A normalized Polar subscription, as much as we read from a webhook payload.
 * Customers are keyed by `externalId` = the Better Auth user id
 * (createCustomerOnSignUp sets this), so the owner is the customer's externalId.
 */
export interface PolarSubscriptionLike {
  id?: string | null
  status?: string | null
  productId?: string | null
  currentPeriodEnd?: string | Date | null
  customer?: { id?: string | null; externalId?: string | null } | null
  metadata?: Record<string, unknown> | null
}

/**
 * Resolve the owning account id from a Polar subscription. Customers are keyed
 * by `externalId` (the user id). Falls back to a metadata ownerId for any
 * legacy in-flight checkout created before the user-keyed model.
 */
export function ownerIdFromSubscription(sub: PolarSubscriptionLike): string | null {
  const ext = sub.customer?.externalId
  if (typeof ext === "string" && ext) return ext
  const meta = sub.metadata?.ownerId ?? sub.metadata?.orgId
  return typeof meta === "string" && meta ? meta : null
}

/**
 * Upsert the `subscriptions` row from a Polar subscription payload and drop the
 * plan cache so getPlan() reflects the change immediately. The `subscriptions`
 * table stays the single source of truth for entitlements (read by getPlan);
 * the Polar plugin's webhooks call this. No-op when the owner can't be
 * resolved. Uses the caller-provided `query` fn to avoid a hard db import cycle.
 */
export async function syncSubscriptionFromPolar(
  runQuery: (text: string, params: unknown[]) => Promise<unknown>,
  sub: PolarSubscriptionLike,
): Promise<void> {
  const ownerId = ownerIdFromSubscription(sub)
  if (!ownerId) return
  const plan = planForProduct(sub.productId)
  await runQuery(
    `INSERT INTO subscriptions
       (owner_id, polar_customer_id, polar_subscription_id, plan, status, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (owner_id) DO UPDATE SET
       polar_customer_id = EXCLUDED.polar_customer_id,
       polar_subscription_id = EXCLUDED.polar_subscription_id,
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = NOW()`,
    [
      ownerId,
      sub.customer?.id ?? null,
      sub.id ?? null,
      plan,
      sub.status ?? "inactive",
      sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
    ],
  )
  invalidatePlan(ownerId)
}

/**
 * A Polar customer-state payload (from onCustomerStateChanged): the customer
 * plus their currently-active subscriptions. This is the most robust single
 * source for "what should this customer have access to" — we reconcile the
 * subscriptions row from the active subscription (or reset to inactive/free
 * when there is none).
 */
export interface PolarCustomerStateLike {
  id?: string | null
  externalId?: string | null
  activeSubscriptions?: Array<{
    id?: string | null
    status?: string | null
    productId?: string | null
    currentPeriodEnd?: string | Date | null
  }> | null
}

/**
 * Reconcile the `subscriptions` row from a Polar customer-state payload. Picks
 * the active subscription (if any) and upserts; when the customer has no active
 * subscription, writes an inactive/free row so getPlan() drops them to free.
 * No-op when the owner (externalId) can't be resolved.
 */
export async function syncCustomerStateFromPolar(
  runQuery: (text: string, params: unknown[]) => Promise<unknown>,
  state: PolarCustomerStateLike,
): Promise<void> {
  const ownerId =
    typeof state.externalId === "string" && state.externalId ? state.externalId : null
  if (!ownerId) return
  const active = state.activeSubscriptions?.find((s) => s.status === "active")
  await syncSubscriptionFromPolar(runQuery, {
    id: active?.id ?? null,
    status: active?.status ?? "inactive",
    productId: active?.productId ?? null,
    currentPeriodEnd: active?.currentPeriodEnd ?? null,
    customer: { id: state.id ?? null, externalId: ownerId },
  })
}

/** A Polar customer payload (from onCustomerUpdated / onCustomerDeleted). */
export interface PolarCustomerLike {
  id?: string | null
  externalId?: string | null
}

/**
 * Handle a deleted Polar customer: drop the owner's subscriptions row so
 * getPlan() falls back to free. Keyed by externalId (the user id). No-op when
 * the owner can't be resolved.
 */
export async function deleteSubscriptionForCustomer(
  runQuery: (text: string, params: unknown[]) => Promise<unknown>,
  customer: PolarCustomerLike,
): Promise<void> {
  const ownerId =
    typeof customer.externalId === "string" && customer.externalId ? customer.externalId : null
  if (!ownerId) return
  await runQuery(`DELETE FROM subscriptions WHERE owner_id = $1`, [ownerId])
  invalidatePlan(ownerId)
}
