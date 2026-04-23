/**
 * GET /api/auth/github
 *
 * Redirects the user to GitHub's OAuth authorization page.
 */

import { redirect } from "next/navigation"

export async function GET() {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) {
    return new Response("OAuth not configured", { status: 503 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://shieldcn.dev"
  const callbackUrl = `${baseUrl}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    // No scopes — we only need read access to public data
    scope: "",
  })

  redirect(`https://github.com/login/oauth/authorize?${params}`)
}
