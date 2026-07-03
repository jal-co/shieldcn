/**
 * shieldcn
 * lib/auth.ts
 *
 * Server-side session resolution for Neon Auth (hosted Better Auth). Neon Auth
 * issues a session JWT signed by the project's JWKS; we verify it here and
 * expose the caller's user id and active organization (a company/team) id.
 *
 * The active organization is the tenant key for brands, saved READMEs, billing,
 * and analytics — every Pro/Plus resource is owned by an org, never a bare user.
 */

import { cookies, headers } from "next/headers"
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

const JWKS_URL = process.env.NEON_AUTH_JWKS_URL
const BASE_URL = process.env.NEON_AUTH_BASE_URL

/** Lazily-constructed, cached remote JWKS. */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!JWKS_URL) return null
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))
  return jwks
}

export interface Session {
  userId: string
  /** Active organization id (company/team). Null when the user has no org. */
  orgId: string | null
  email?: string
  name?: string
}

interface NeonAuthClaims extends JWTPayload {
  sub?: string
  email?: string
  name?: string
  activeOrganizationId?: string
  active_organization_id?: string
  org_id?: string
}

/** Names the Neon Auth session cookie may use, most specific first. */
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "neon_auth.session_token",
]

async function readToken(): Promise<string | null> {
  // Prefer an explicit Authorization header (API clients), then cookies (browser).
  const h = await headers()
  const auth = h.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth.slice(7)

  const store = await cookies()
  for (const name of SESSION_COOKIE_NAMES) {
    const v = store.get(name)?.value
    if (v) return v
  }
  return null
}

/**
 * Resolve the current session, or null when unauthenticated / misconfigured.
 * Never throws — an auth outage resolves to "logged out", not a 500.
 */
export async function getSession(): Promise<Session | null> {
  const keys = getJwks()
  if (!keys) return null

  const token = await readToken()
  if (!token) return null

  try {
    const { payload } = await jwtVerify<NeonAuthClaims>(token, keys)
    if (!payload.sub) return null
    return {
      userId: payload.sub,
      orgId:
        payload.activeOrganizationId ??
        payload.active_organization_id ??
        payload.org_id ??
        null,
      email: payload.email,
      name: payload.name,
    }
  } catch {
    return null
  }
}

/** Require a session; returns it or null (callers return 401 on null). */
export async function requireSession(): Promise<Session | null> {
  return getSession()
}

/**
 * Require a session with an active organization. Returns the org id or null.
 * Every Pro/Plus resource is org-scoped, so this is the common gate.
 */
export async function requireOrg(): Promise<{ session: Session; orgId: string } | null> {
  const session = await getSession()
  if (!session?.orgId) return null
  return { session, orgId: session.orgId }
}

export const authConfigured = Boolean(JWKS_URL && BASE_URL)
