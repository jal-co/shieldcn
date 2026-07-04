/**
 * shieldcn
 * lib/auth/server.ts
 *
 * The Neon Auth (Better Auth) server instance. Proxies auth requests to the
 * hosted Neon Auth service while managing session cookies on our own domain
 * (so there's no cross-domain cookie problem). Exposes .handler() for the API
 * route, .middleware() for route protection, and .getSession()/.signOut()/etc.
 */

import { createNeonAuth } from "@neondatabase/auth/next/server"

// Next evaluates route modules during the build's page-data collection, which
// constructs this client. createNeonAuth throws if the base URL / cookie
// secret are absent, so a build environment that lacks them (e.g. a Vercel
// preview where these are Production-only) would fail the whole build. Fall
// back to inert build-time placeholders so the build always succeeds; the real
// values are always present at runtime in production. The secret must be ≥ 32
// chars to satisfy the SDK's validation.
const baseUrl = process.env.NEON_AUTH_BASE_URL || "https://auth.invalid"
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ||
  "shieldcn-build-placeholder-secret-not-used-at-runtime-000"

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    // OAuth returns are a cross-site top-level navigation (github.com → neon
    // auth → our domain). A SameSite=Strict cookie is NOT sent on that, so the
    // PKCE challenge cookie would be missing and the verifier exchange would
    // fail — bouncing the user back to sign-in still signed out. Lax is sent on
    // top-level cross-site GET navigations, which is exactly the OAuth return.
    sameSite: "lax",
  },
})
