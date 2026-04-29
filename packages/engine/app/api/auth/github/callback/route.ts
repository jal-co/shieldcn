/**
 * @shieldcn/engine
 * GET /api/auth/github/callback
 *
 * Handles OAuth callback. Validates CSRF state, exchanges code for token,
 * encrypts token, stores in pool.
 */

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { addToken } from "@shieldcn/core/token-pool"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code) {
    return Response.json({ error: "no_code" }, { status: 400 })
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value
  cookieStore.delete("oauth_state")

  if (!state || !savedState || state !== savedState) {
    return Response.json({ error: "invalid_state" }, { status: 400 })
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return Response.json({ error: "not_configured" }, { status: 503 })
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    }
  )

  if (!tokenResponse.ok) {
    return Response.json({ error: "token_exchange_failed" }, { status: 502 })
  }

  const tokenData = await tokenResponse.json()

  if (tokenData.error || !tokenData.access_token) {
    return Response.json({ error: tokenData.error || "no_token" }, { status: 400 })
  }

  const accessToken = tokenData.access_token

  // Fetch the user's GitHub login
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  })

  if (!userResponse.ok) {
    return Response.json({ error: "user_fetch_failed" }, { status: 502 })
  }

  const userData = await userResponse.json()
  const githubUser = userData.login

  if (!githubUser) {
    return Response.json({ error: "no_user" }, { status: 400 })
  }

  // Encrypt and store token
  try {
    await addToken(githubUser, accessToken)
  } catch {
    return Response.json({ error: "db_store_failed" }, { status: 500 })
  }

  redirect("/")
}
