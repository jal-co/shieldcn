/**
 * GET /api/auth/github
 *
 * Redirects to GitHub OAuth with CSRF state parameter.
 */

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { randomBytes } from "node:crypto"

export async function GET() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) {
    return new Response("OAuth not configured", { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://shieldcn.dev"
  const callbackUrl = `${baseUrl}/api/auth/github/callback`

  // Generate CSRF state token
  const state = randomBytes(32).toString("hex")
  const cookieStore = await cookies()
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "",
    state,
  })

  redirect(`https://github.com/login/oauth/authorize?${params}`)
}
