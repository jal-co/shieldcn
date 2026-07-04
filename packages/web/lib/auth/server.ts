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
 * Exposes `auth` with `.handler` (for the /api/auth catch-all) and `.api`
 * (server-side session reads via auth.api.getSession).
 */

import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"
import { getPool } from "@shieldcn/core/db"

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
