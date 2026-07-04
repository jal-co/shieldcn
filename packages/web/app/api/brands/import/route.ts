/**
 * shieldcn
 * app/api/brands/import/route.ts
 *
 * Import a brand from Context.dev. Given a domain / name / email / ticker, we
 * fetch the brand intelligence, normalize it, and return a draft profile plus a
 * brand.md document for the user to review and edit before saving. Plus-gated
 * (brands are a Plus feature); the actual persist happens via /api/brands/[slug].
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import {
  getBrandProfile,
  brandProfileToMarkdown,
  contextDevConfigured,
  type BrandLookup,
} from "@/lib/context-dev"

export async function POST(req: NextRequest) {
  if (!contextDevConfigured) {
    return NextResponse.json({ error: "brand import not configured" }, { status: 503 })
  }

  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    return NextResponse.json({ error: "brand import requires the Plus plan" }, { status: 402 })
  }

  let body: BrandLookup & { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  // Accept a full URL for convenience and reduce it to a bare domain.
  let domain = body.domain
  if (!domain && body.url) {
    try {
      domain = new URL(body.url.includes("://") ? body.url : `https://${body.url}`).hostname
    } catch {
      /* fall through to other identifiers */
    }
  }

  const lookup: BrandLookup = {
    domain: domain?.replace(/^www\./, ""),
    name: body.name,
    email: body.email,
    ticker: body.ticker,
    isin: body.isin,
  }
  if (!lookup.domain && !lookup.name && !lookup.email && !lookup.ticker && !lookup.isin) {
    return NextResponse.json(
      { error: "provide a domain, url, name, email, or ticker" },
      { status: 400 },
    )
  }

  const profile = await getBrandProfile(lookup)
  if (!profile) {
    return NextResponse.json({ error: "brand not found" }, { status: 404 })
  }

  return NextResponse.json({
    profile,
    markdown: brandProfileToMarkdown(profile),
  })
}
