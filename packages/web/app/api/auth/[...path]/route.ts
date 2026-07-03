/**
 * shieldcn
 * app/api/auth/[...path]/route.ts
 *
 * Neon Auth API proxy. All client auth calls (sign-in, sign-up, social,
 * session, organization) route through here and are proxied to the hosted
 * Neon Auth service, with session cookies signed for our own domain.
 */

import { auth } from "@/lib/auth/server"

export const { GET, POST } = auth.handler()
