/**
 * shieldcn
 * lib/auth/server.ts
 *
 * The Neon Auth (Better Auth) server instance. Proxies auth requests to the
 * hosted Neon Auth service while managing session cookies on our own domain
 * (so there's no cross-domain cookie problem). Exposes .handler() for the API
 * route, .middleware() for route protection, and .getSession()/.signOut()/etc.
 */

import { createNeonAuth } from "@neondatabase/auth/next/server"

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
})
