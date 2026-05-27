/**
 * shieldcn
 * app/.well-known/oauth-authorization-server/route.ts
 *
 * OAuth 2.0 Authorization Server Metadata (RFC 8414).
 * shieldcn uses GitHub OAuth for token pool donations —
 * this metadata tells agents how the auth flow works.
 */

const SITE = "https://shieldcn.dev"

export function GET() {
  const metadata = {
    issuer: SITE,
    authorization_endpoint: `${SITE}/api/auth/github`,
    token_endpoint: "https://github.com/login/oauth/access_token",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    scopes_supported: [""],
    service_documentation: `${SITE}/docs/token-pool`,
    ui_locales_supported: ["en"],
  }

  return Response.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
