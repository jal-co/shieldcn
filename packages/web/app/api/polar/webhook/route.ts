/**
 * shieldcn
 * app/api/polar/webhook/route.ts
 *
 * Polar webhook — the single source of truth for billing entitlements. On any
 * subscription change we upsert the `subscriptions` row for the owning account
 * (a personal user or a team) and invalidate its cached plan so getPlan()
 * reflects the change immediately.
 */

import { Webhooks } from "@polar-sh/nextjs"
import { query } from "@shieldcn/core/db"
import { planForProduct, invalidatePlan } from "@shieldcn/core/entitlements"

const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

/**
 * Extract the owning account id from a Polar subscription payload. This is the
 * personal-first `ownerId` (a user id or a team id) we set as the checkout's
 * customerExternalId / metadata.ownerId. Falls back to the legacy `orgId`
 * metadata key for any in-flight checkout created before the rename.
 */
function ownerIdFromSubscription(sub: {
  customer?: { externalId?: string | null } | null
  metadata?: Record<string, unknown> | null
}): string | null {
  const metaOwner = sub.metadata?.ownerId ?? sub.metadata?.orgId
  if (typeof metaOwner === "string" && metaOwner) return metaOwner
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
  const ownerId = ownerIdFromSubscription(sub)
  if (!ownerId) return

  const plan = planForProduct(sub.productId)
  await query(
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
