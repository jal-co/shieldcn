/**
 * @shieldcn/engine
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

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000"
  const callbackUrl = `${baseUrl}/api/auth/github/callback`

  const state = randomBytes(32).toString("hex")
  const cookieStore = await cookies()
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
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
