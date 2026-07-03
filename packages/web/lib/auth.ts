/**
 * shieldcn
 * lib/auth.ts
 *
 * App-facing session helpers, backed by the Neon Auth server SDK. Every
 * Pro/Plus resource is scoped to the caller's active organization (a
 * company/team), so requireOrg() is the common gate.
 *
 * Kept as a thin wrapper so route handlers depend on a small, stable surface
 * (getSession / requireOrg) rather than the SDK's full shape.
 */

import { auth } from "@/lib/auth/server"

export interface Session {
  userId: string
  /** Active organization id (company/team). Null when the user has no org. */
  orgId: string | null
  email?: string
  name?: string
}

/**
 * Resolve the current session, or null when unauthenticated. Never throws —
 * an auth outage resolves to "logged out", not a 500.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data } = await auth.getSession()
    const user = data?.user
    if (!user?.id) return null
    return {
      userId: user.id,
      orgId: data?.session?.activeOrganizationId ?? null,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
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

export const authConfigured = Boolean(process.env.NEON_AUTH_BASE_URL)
