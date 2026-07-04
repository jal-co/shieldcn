/**
 * shieldcn
 * lib/auth/client.ts
 *
 * Browser-side Better Auth client. Talks to our same-origin /api/auth handler.
 * Exposes email/social sign-in, sessions, and the organization plugin
 * (opt-in teams/workspaces).
 */

"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient()],
})
