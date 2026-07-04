/**
 * shieldcn
 * lib/auth/client.ts
 *
 * Browser-side Better Auth client. Talks to our same-origin /api/auth handler.
 * Exposes email/social sign-in, sessions, the organization plugin (opt-in
 * teams/workspaces), and the Polar plugin (checkout + customer portal via
 * authClient.checkout() / authClient.customer.portal()).
 */

"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient, lastLoginMethodClient } from "better-auth/client/plugins"
import { polarClient } from "@polar-sh/better-auth/client"

export const authClient = createAuthClient({
  plugins: [organizationClient(), lastLoginMethodClient(), polarClient()],
})
