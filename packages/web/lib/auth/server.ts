/**
 * shieldcn
 * lib/auth/server.ts
 *
 * Minimal self-hosted Better Auth server instance, backed directly by our
 * Postgres (shared pool from @shieldcn/core/db). Email/password only — it
 * exists solely so the site admin can sign in at /brandmgmt and manage brands.
 * No OAuth, no organizations, no billing, no email sends. Public sign-ups are
 * disabled; the single admin user is created out-of-band (see DEV.md).
 *
 * Exposes `auth` with `.handler` (for the /api/auth catch-all) and `.api`
 * (server-side session reads via auth.api.getSession).
 */

import { betterAuth } from "better-auth"
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
  // adapter over Postgres. Its tables (user/session/account/verification)
  // live alongside our app tables.
  database: getPool(),
  secret,
  baseURL,

  emailAndPassword: {
    enabled: true,
    // Admin-only auth: no public registration. The admin account is created
    // via a one-off script/SQL, never through the sign-up endpoint.
    disableSignUp: true,
  },
})
