/**
 * GET /api/auth/github/callback
 *
 * Handles OAuth callback. Validates CSRF state, exchanges code for token,
 * encrypts token, stores in pool.
 */

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { addToken } from "@/lib/token-pool"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code) {
    redirect("/token-pool?error=no_code")
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value
  cookieStore.delete("oauth_state")

  if (!state || !savedState || state !== savedState) {
    redirect("/token-pool?error=invalid_state")
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    redirect("/token-pool?error=not_configured")
  }

  try {
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

    const tokenData = await tokenResponse.json()

    if (tokenData.error || !tokenData.access_token) {
      redirect("/token-pool?error=token_exchange_failed")
    }

    const accessToken = tokenData.access_token

    // Fetch the user's GitHub login (verify token works)
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!userResponse.ok) {
      redirect("/token-pool?error=user_fetch_failed")
    }

    const userData = await userResponse.json()
    const githubUser = userData.login

    if (!githubUser) {
      redirect("/token-pool?error=no_user")
    }

    // Encrypt and store token
    await addToken(githubUser, accessToken)

    redirect("/token-pool?success=true")
  } catch {
    redirect("/token-pool?error=unknown")
  }
}
