/**
 * shieldcn
 * middleware.ts
 *
 * Adds agent discovery headers and handles markdown content negotiation.
 *
 * 1. Link headers (RFC 8288 / RFC 9727 §3) — on every response
 * 2. Markdown negotiation — when Accept: text/markdown, redirects to /llms.txt
 *
 * OAuth is handled entirely inside Better Auth's /api/auth/* handler (the
 * provider redirects to /api/auth/callback/github), so the middleware no longer
 * touches auth — keeping the Edge runtime free of the DB-backed auth server.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SITE = "https://shieldcn.dev"

/** Link headers for agent discovery (RFC 8288). */
const LINK_HEADER = [
  `<${SITE}/.well-known/api-catalog>; rel="api-catalog"`,
  `<${SITE}/.well-known/openapi.json>; rel="service-desc"; type="application/openapi+json"`,
  `<${SITE}/docs/api-reference>; rel="service-doc"`,
  `<${SITE}/llms.txt>; rel="describedby"; type="text/plain"`,
].join(", ")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accept = request.headers.get("accept") || ""

  // Markdown content negotiation:
  // When an agent requests text/markdown on HTML pages, serve the LLM-friendly version
  // via a local API route that returns proper Content-Type: text/markdown.
  // Only apply to page routes, not API/asset/badge routes.
  if (
    accept.includes("text/markdown") &&
    !accept.includes("text/html") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/.well-known/") &&
    !pathname.endsWith(".svg") &&
    !pathname.endsWith(".png") &&
    !pathname.endsWith(".json") &&
    !pathname.endsWith(".txt") &&
    !pathname.endsWith(".xml")
  ) {
    // Rewrite to local API route that serves markdown with correct Content-Type
    const full = pathname !== "/" && pathname !== "" ? "1" : "0"
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = "/api/markdown"
    rewriteUrl.searchParams.set("full", full)

    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set("Link", LINK_HEADER)
    return response
  }

  // For all other responses, add Link headers
  const response = NextResponse.next()
  response.headers.set("Link", LINK_HEADER)
  return response
}

export const config = {
  // Run on page routes and well-known, skip static assets and badge images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|og.png).*)",
  ],
}
