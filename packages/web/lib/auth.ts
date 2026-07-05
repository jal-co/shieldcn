/**
 * shieldcn
 * lib/auth.ts
 *
 * App-facing session helpers, backed by the Better Auth server API. Auth
 * exists solely for the admin brand-management surface (/brandmgmt +
 * /dashboard) — there are no user accounts or paid tiers.
 *
 * Kept as a thin wrapper so route handlers depend on a small, stable surface
 * (getSession) rather than the SDK's full shape.
 */

import { headers } from "next/headers"
import { auth } from "@/lib/auth/server"

export interface Session {
  userId: string
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

export const authConfigured = Boolean(process.env.BETTER_AUTH_SECRET)
