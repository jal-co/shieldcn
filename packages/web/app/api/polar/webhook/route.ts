/**
 * shieldcn
 * app/api/polar/webhook/route.ts
 *
 * Polar webhook — the single source of truth for billing entitlements. On any
 * subscription change we upsert the `subscriptions` row for the owning org and
 * invalidate its cached plan so getPlan() reflects the change immediately.
 */

import { Webhooks } from "@polar-sh/nextjs"
import { query } from "@shieldcn/core/db"
import { planForProduct, invalidatePlan } from "@shieldcn/core/entitlements"

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

/** Extract the owning org id from a Polar subscription payload. */
function orgIdFromSubscription(sub: {
  customer?: { externalId?: string | null } | null
  metadata?: Record<string, unknown> | null
}): string | null {
  const metaOrg = sub.metadata?.orgId
  if (typeof metaOrg === "string" && metaOrg) return metaOrg
  return sub.customer?.externalId ?? null
}

async function upsertSubscription(sub: {
  id?: string
  status?: string
  productId?: string | null
  currentPeriodEnd?: string | Date | null
  customer?: { id?: string; externalId?: string | null } | null
  metadata?: Record<string, unknown> | null
}) {
  const orgId = orgIdFromSubscription(sub)
  if (!orgId) return

  const plan = planForProduct(sub.productId)
  await query(
    `INSERT INTO subscriptions
       (org_id, polar_customer_id, polar_subscription_id, plan, status, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (org_id) DO UPDATE SET
       polar_customer_id = EXCLUDED.polar_customer_id,
       polar_subscription_id = EXCLUDED.polar_subscription_id,
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = NOW()`,
    [
      orgId,
      sub.customer?.id ?? null,
      sub.id ?? null,
      plan,
      sub.status ?? "inactive",
      sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
    ],
  )
  invalidatePlan(orgId)
}

// When unconfigured, expose a 503 so misrouted webhooks fail loudly.
export const POST = webhookSecret
  ? Webhooks({
      webhookSecret,
      onSubscriptionCreated: (p) => upsertSubscription(p.data as never),
      onSubscriptionUpdated: (p) => upsertSubscription(p.data as never),
      onSubscriptionActive: (p) => upsertSubscription(p.data as never),
      onSubscriptionCanceled: (p) => upsertSubscription(p.data as never),
      onSubscriptionRevoked: (p) => upsertSubscription(p.data as never),
    })
  : async () => new Response("billing not configured", { status: 503 })
