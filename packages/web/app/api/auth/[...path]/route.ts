/**
 * shieldcn
 * app/api/auth/[...path]/route.ts
 *
 * Better Auth API handler. All client auth calls (sign-in, sign-up, social,
 * session, organization) route through this same-origin catch-all.
 */

import { auth } from "@/lib/auth/server"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
