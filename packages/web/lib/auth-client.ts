/**
 * shieldcn
 * lib/auth-client.ts
 *
 * Browser-side Neon Auth (Better Auth) client. Points at the hosted auth
 * endpoint provisioned via neonctl and enables the organization plugin so the
 * UI can create/switch companies (the tenant for every Pro/Plus resource).
 */

"use client"

import { createAuthClient } from "better-auth/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL,
  plugins: [organizationClient()],
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  organization,
} = authClient
