/**
 * shieldcn
 * middleware.ts
 *
 * Adds agent discovery headers, handles markdown content negotiation, and
 * completes the OAuth login round-trip.
 *
 * 1. OAuth verifier exchange — when a provider redirects back with the Neon
 *    Auth session verifier, hand off to the Neon Auth middleware so it can
 *    swap the verifier for a session cookie and strip the param. Gated to only
 *    those requests so the rest of the public site keeps zero blanket auth
 *    protection and no per-request upstream call.
 * 2. Link headers (RFC 8288 / RFC 9727 §3) — on every response
 * 3. Markdown negotiation — when Accept: text/markdown, redirects to /llms.txt
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth/server"

const SITE = "https://shieldcn.dev"

/** Query param a provider redirect carries on the OAuth return leg. */
const OAUTH_VERIFIER_PARAM = "neon_auth_session_verifier"

/**
 * The Neon Auth middleware. We only invoke it for the OAuth return (to exchange
 * the verifier for a session cookie); `loginUrl` is where a failed exchange
 * falls back to. It is never run for ordinary requests, so it adds no latency
 * and imposes no route protection on the public site.
 */
const neonAuthMiddleware = auth.middleware({ loginUrl: "/sign-in" })

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

  // OAuth return: exchange the verifier for a session cookie and redirect to
  // the clean URL. Without this, social sign-in lands the user back on the app
  // still signed out (the cookie is never set).
  if (request.nextUrl.searchParams.has(OAUTH_VERIFIER_PARAM)) {
    return neonAuthMiddleware(request)
  }

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
