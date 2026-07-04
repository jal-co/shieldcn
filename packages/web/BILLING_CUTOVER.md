# Billing cutover: custom Polar routes → @polar-sh/better-auth plugin

Billing now runs through the **Polar Better Auth plugin** instead of the custom
`/api/checkout`, `/api/portal`, `/api/polar/webhook` routes. The plugin mounts
everything under Better Auth's `/api/auth/*`:

| Old (removed) | New (plugin) | Client call |
|---|---|---|
| `/api/checkout?plan=plus` | `/api/auth/checkout` | `authClient.checkout({ slug: "plus" })` |
| `/api/portal` | `/api/auth/customer/portal` | `authClient.customer.portal()` |
| `/api/polar/webhook` | `/api/auth/polar/webhooks` | (webhook) |

## Model

- **Customers are keyed by the Better Auth user id** (`externalId`), created on
  sign-up via `createCustomerOnSignUp: true`. The org-or-user `ownerId`
  indirection is gone from the billing path (teams are dormant; `ownerId` was
  already always `user.id`).
- **Account deletion** removes the Polar customer (`deleteUser.afterDelete` →
  `customers.deleteExternal`), so no orphaned billing records.
- **`customer.state_changed`** reconciles the subscriptions row from the
  customer's active subscriptions — a belt-and-suspenders access sync on top of
  the per-subscription events.
- Checkout + portal render a back-button to the site (`returnUrl`).
- **The `subscriptions` table stays the source of truth** for entitlements. The
  plugin's webhooks call `syncSubscriptionFromPolar()` (core/entitlements) to
  upsert it, so `getPlan()` remains a fast cached DB read — no Polar API call on
  the hot gating path.

## Prod cutover checklist

1. **Polar dashboard → Webhooks:** change the endpoint URL from
   `https://shieldcn.dev/api/polar/webhook`
   to **`https://shieldcn.dev/api/auth/polar/webhooks`**.
   Keep the same `POLAR_WEBHOOK_SECRET` (already in Vercel).
   Ensure the endpoint is subscribed to the subscription events
   (`subscription.created/updated/active/canceled/revoked`) **and**
   `customer.state_changed` (the robust access-reconciliation event).

2. **Env vars** (already in prod from the auth cutover — verify present):
   - `POLAR_ACCESS_TOKEN`, `POLAR_SERVER` (`production`),
     `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_PLUS`.
   - `POLAR_PRODUCT_PRO` is unused now (Pro removed) — safe to delete.

3. **Deploy** this branch.

4. **Smoke test (prod):**
   - Signed-in user → click Get Plus → lands on Polar checkout for the Plus
     product with email locked in.
   - Complete a sandbox/live purchase → webhook fires → `subscriptions` row
     upserts to `plan=plus, status=active` → gated features unlock.
   - Billing menu → opens the Polar customer portal.

## Rollback

Revert the deploy. The old custom routes return with the previous commit; the
Polar webhook URL must be pointed back to `/api/polar/webhook` in the Polar
dashboard for the old handler to receive events.
