/**
 * GET /api/auth/github/callback
 *
 * Handles the OAuth callback from GitHub.
 * Exchanges the code for an access token, fetches the user's login,
 * and adds the token to the pool.
 */

import { redirect } from "next/navigation"
import { addToken } from "@/lib/token-pool"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")

  if (!code) {
    redirect("/token-pool?error=no_code")
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

    // Fetch the user's GitHub login
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

    // Add token to the pool
    await addToken(githubUser, accessToken)

    redirect("/token-pool?success=true")
  } catch {
    redirect("/token-pool?error=unknown")
  }
}
