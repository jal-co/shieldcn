/**
 * shieldcn
 * lib/auth/client.ts
 *
 * Browser-side Neon Auth client. Talks to our own same-origin /api/auth proxy
 * (no cross-domain cookies). Exposes Better Auth methods plus the organization
 * plugin (companies/teams).
 */

"use client"

import { createAuthClient } from "@neondatabase/auth/next"

export const authClient = createAuthClient()
