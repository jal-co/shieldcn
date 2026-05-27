/**
 * shieldcn
 * app/.well-known/oauth-protected-resource/route.ts
 *
 * OAuth Protected Resource Metadata (RFC 9728).
 * Tells agents that the memo badge PUT endpoint requires
 * a Bearer token and where to find the authorization server.
 */

const SITE = "https://shieldcn.dev"

export function GET() {
  const metadata = {
    resource: SITE,
    authorization_servers: [SITE],
    scopes_supported: [],
    bearer_methods_supported: ["header"],
    resource_documentation: `${SITE}/docs/badges/memo`,
  }

  return Response.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
