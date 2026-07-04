/**
 * shieldcn
 * lib/auth/server.ts
 *
 * Self-hosted Better Auth server instance, backed directly by our Postgres
 * (shared pool from @shieldcn/core/db). Replaces the hosted Neon Auth wrapper —
 * users, sessions, accounts, and organizations live in our own tables.
 *
 * Auth methods: email/password + GitHub OAuth. The organization plugin powers
 * the opt-in teams/workspaces (activeOrganizationId on the session drives the
 * personal-first ownerId resolution used across the app).
 *
 * Billing: the Polar plugin (@polar-sh/better-auth) owns checkout, the customer
 * portal, and webhook ingestion. Customers are created on sign-up keyed by the
 * user id (externalId). The webhook keeps our own `subscriptions` table as the
 * source of truth for entitlements (read by getPlan()), so gating stays a fast
 * cached DB read rather than a Polar API call on every request.
 *
 * Exposes `auth` with `.handler` (for the /api/auth catch-all) and `.api`
 * (server-side session reads via auth.api.getSession).
 */

import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth"
import { Polar } from "@polar-sh/sdk"
import { getPool, query } from "@shieldcn/core/db"
import {
  syncSubscriptionFromPolar,
  syncCustomerStateFromPolar,
  deleteSubscriptionForCustomer,
} from "@shieldcn/core/entitlements"

// A ≥32-char secret is required by Better Auth. In a build environment that
// lacks the real secret (e.g. a Vercel preview where it's Production-only),
// fall back to an inert placeholder so the build's route-module evaluation
// doesn't throw. The real secret is always present at runtime.
const secret =
  process.env.BETTER_AUTH_SECRET ||
  "shieldcn-build-placeholder-secret-not-used-at-runtime-000"

// Base URL Better Auth uses to build callback/verification URLs. Prefer the
// explicit BETTER_AUTH_URL, then the site URL, then localhost for dev.
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_URL ||
  "http://localhost:3000"

// Polar billing client. Sandbox vs production is env-driven so the same code
// runs against both (tokens/products are fully separated per environment).
const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  server: (process.env.POLAR_SERVER as "sandbox" | "production") || "sandbox",
})

// The single paid product (Plus). Checkout is reachable at /checkout/plus.
const polarProductId = process.env.POLAR_PRODUCT_PLUS

// Public site URL, used for the checkout/portal back-button (returnUrl).
const siteUrl = process.env.NEXT_PUBLIC_URL || "https://shieldcn.dev"

export const auth = betterAuth({
  // Pass the shared pg Pool directly — Better Auth uses its built-in Kysely
  // adapter over Postgres. Its tables (user/session/account/verification +
  // organization/member/invitation/jwks) live alongside our app tables.
  database: getPool(),
  secret,
  baseURL,

  emailAndPassword: {
    enabled: true,
  },

  user: {
    // When a user deletes their account, delete their Polar customer too so we
    // don't leave an orphaned billing record. externalId is the user id.
    // Best-effort: a Polar hiccup must not block the account deletion itself.
    deleteUser: {
      enabled: true,
      afterDelete: async (u) => {
        try {
          await polarClient.customers.deleteExternal({ externalId: u.id })
        } catch {
          // ignore — the customer may already be gone or billing unconfigured
        }
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Create a Polar customer for EVERY new user (free included), keyed by
        // externalId = user.id, so the whole user base is visible in Polar.
        //
        // This is a create.after hook (runs after the user row is committed and
        // outside the signup transaction), and it's fully wrapped in try/catch,
        // so a Polar failure — downtime, a rejected email, a rate limit — can
        // NEVER block signup. (The plugin's own createCustomerOnSignUp uses a
        // throwing before-hook, which is why it's disabled below.) Checkout also
        // auto-creates the customer from externalCustomerId as a backstop.
        after: async (u) => {
          if (!process.env.POLAR_ACCESS_TOKEN) return
          try {
            const { result } = await polarClient.customers.list({ email: u.email })
            const existing = result.items[0]
            if (!existing) {
              await polarClient.customers.create({
                email: u.email,
                name: u.name || undefined,
                externalId: u.id,
              })
            } else if (existing.externalId !== u.id) {
              await polarClient.customers.update({
                id: existing.id,
                customerUpdate: { externalId: u.id },
              })
            }
          } catch {
            // best-effort — checkout will create the customer if this missed
          }
        },
      },
    },
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },

  plugins: [
    // Opt-in workspaces. The session's activeOrganizationId is what the app's
    // personal-first ownerId resolution keys off (org id when active, else the
    // personal user id).
    organization(),

    // Billing. Checkout + portal + webhooks via Polar. Customers are keyed by
    // the user id (externalId) — the same owner key our subscriptions table +
    // getPlan() use. The plugin's createCustomerOnSignUp is disabled because its
    // throwing before-hook would block signup on any Polar failure; we create
    // the customer via a non-blocking create.after hook instead (above).
    polar({
      client: polarClient,
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: polarProductId
            ? [{ productId: polarProductId, slug: "plus" }]
            : [],
          successUrl: "/dashboard?checkout=success",
          returnUrl: siteUrl,
          authenticatedUsersOnly: true,
        }),
        portal({ returnUrl: siteUrl }),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET || "",
          // Keep our subscriptions table authoritative for getPlan().
          onSubscriptionCreated: (p) => syncSubscriptionFromPolar(query, p.data as never),
          onSubscriptionUpdated: (p) => syncSubscriptionFromPolar(query, p.data as never),
          onSubscriptionActive: (p) => syncSubscriptionFromPolar(query, p.data as never),
          onSubscriptionCanceled: (p) => syncSubscriptionFromPolar(query, p.data as never),
          onSubscriptionRevoked: (p) => syncSubscriptionFromPolar(query, p.data as never),
          // Robust catch-all for access: whenever anything about a customer
          // changes (incl. their subscriptions), reconcile our subscriptions
          // row from their active subs. This is the event that carries
          // activeSubscriptions, so it's the authoritative access sync.
          onCustomerStateChanged: (p) => syncCustomerStateFromPolar(query, p.data as never),
          // Deleting a Polar customer drops their subscriptions row so getPlan()
          // falls back to free. (customer.updated carries only profile fields,
          // not subscriptions, so it doesn't touch entitlements.)
          onCustomerDeleted: (p) => deleteSubscriptionForCustomer(query, p.data as never),
        }),
      ],
    }),
  ],

  advanced: {
    // OAuth returns are a top-level cross-site GET navigation (github.com ->
    // our domain); SameSite=Lax is sent on those so the state/PKCE cookies
    // survive the round-trip. (Strict would drop them and bounce the user back
    // signed out.)
    defaultCookieAttributes: {
      sameSite: "lax",
    },
  },
})
