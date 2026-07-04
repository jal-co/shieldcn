/**
 * shieldcn
 * lib/auth.ts
 *
 * App-facing session helpers, backed by the Better Auth server API. Every
 * Plus resource is scoped to the caller's active organization (a
 * company/team), so requireOrg() is the common gate.
 *
 * Kept as a thin wrapper so route handlers depend on a small, stable surface
 * (getSession / requireOrg) rather than the SDK's full shape.
 */

import { headers } from "next/headers"
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
    const data = await auth.api.getSession({ headers: await headers() })
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
 * Use only for genuinely org-only surfaces (e.g. team management). Most
 * Plus resources are personal-first — use requireOwner instead.
 */
export async function requireOrg(): Promise<{ session: Session; orgId: string } | null> {
  const session = await getSession()
  if (!session?.orgId) return null
  return { session, orgId: session.orgId }
}

export interface Owner {
  session: Session
  /**
   * The tenant key for ownable resources: the active organization id when the
   * user has selected one, otherwise their personal user id. Personal-first —
   * Free and Plus never need an org; an org is opt-in (for companies/teams).
   */
  ownerId: string
  /** Always the signed-in user's id. */
  userId: string
  /** Active org id, or null for a personal account. */
  orgId: string | null
}

/**
 * Require a signed-in owner (personal-first). Returns the owner context or null
 * (callers return 401 on null). The `ownerId` is what every ownable resource
 * — saved READMEs, brands, subscriptions — is keyed by, so a solo user works
 * entirely off their personal account without ever creating an organization.
 */
export async function requireOwner(): Promise<Owner | null> {
  const session = await getSession()
  if (!session) return null
  return {
    session,
    ownerId: session.orgId ?? session.userId,
    userId: session.userId,
    orgId: session.orgId,
  }
}

export const authConfigured = Boolean(process.env.BETTER_AUTH_SECRET)
