/**
 * shieldcn
 * lib/auth/client.ts
 *
 * Browser-side Better Auth client. Talks to our same-origin /api/auth handler.
 * Email/password only — used exclusively by the admin sign-in at /brandmgmt.
 */

"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient()
