/**
 * shieldcn
 * lib/admin
 *
 * Admin gating via an env allowlist. ADMIN_USER_IDS / ADMIN_EMAILS are
 * comma-separated. An admin can unlock any brand, edit every brand, generate
 * claim links, and flip global site settings. No DB role column — the allowlist
 * is the source of truth, which keeps admin membership out of user-editable data.
 */

import { getSession, type Session } from "@/lib/auth"

function parseList(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

const ADMIN_USER_IDS = parseList(process.env.ADMIN_USER_IDS)
const ADMIN_EMAILS = parseList(process.env.ADMIN_EMAILS)

/** True when the given session belongs to an allowlisted admin. */
export function isAdminSession(session: Session | null | undefined): boolean {
  if (!session) return false
  if (session.userId && ADMIN_USER_IDS.includes(session.userId.toLowerCase())) return true
  if (session.email && ADMIN_EMAILS.includes(session.email.toLowerCase())) return true
  return false
}

/** Resolve the current session and whether it's an admin. */
export async function getAdmin(): Promise<{ session: Session; isAdmin: true } | null> {
  const session = await getSession()
  if (!session || !isAdminSession(session)) return null
  return { session, isAdmin: true }
}

/** Any admin configured at all? Used to show/hide admin UI affordances. */
export const adminConfigured = ADMIN_USER_IDS.length > 0 || ADMIN_EMAILS.length > 0
