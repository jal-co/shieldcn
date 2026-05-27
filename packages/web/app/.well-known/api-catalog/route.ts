/**
 * shieldcn
 * app/.well-known/api-catalog/route.ts
 *
 * API Catalog for automated API discovery (RFC 9727).
 * Returns application/linkset+json with links to the badge API,
 * its documentation, and health endpoint.
 */

const SITE = "https://shieldcn.dev"

export function GET() {
  const catalog = {
    linkset: [
      {
        anchor: `${SITE}/`,
        "service-desc": [
          {
            href: `${SITE}/.well-known/openapi.json`,
            type: "application/openapi+json",
          },
        ],
        "service-doc": [
          {
            href: `${SITE}/docs/api-reference`,
            type: "text/html",
          },
        ],
        describedby: [
          {
            href: `${SITE}/llms.txt`,
            type: "text/plain",
          },
        ],
      },
    ],
  }

  return Response.json(catalog, {
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
