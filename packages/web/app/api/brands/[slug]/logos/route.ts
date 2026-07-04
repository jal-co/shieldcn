/**
 * shieldcn
 * app/api/brands/[slug]/logos/route.ts
 *
 * Host a brand's logos by fetching the (Context.dev-provided) light/dark/mark
 * URLs server-side and storing the bytes as brand assets. This is what makes a
 * rebrand propagate: distributed embeds reference /b/{slug}/logo-light.svg,
 * and swapping the stored bytes re-serves everywhere.
 *
 * Plus-gated, org-owned. Body: { lightLogoUrl?, darkLogoUrl?, markUrl? }.
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireOwner } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import { getOwnedBrand, putBrandAsset, type BrandImageKind } from "@shieldcn/core/brands"
import {
  assetTypeError,
  contentTypeFromExt,
  MAX_ASSET_BYTES,
} from "@/lib/brand-assets"

type Params = { params: Promise<{ slug: string }> }

/** Fetch one remote logo and store it under `kind`. Returns an error string or null. */
async function hostLogo(
  brandId: number,
  kind: BrandImageKind,
  url: string,
): Promise<string | null> {
  let res: Response
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "image/*", "User-Agent": "shieldcn/1.0" },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return `fetch failed for ${kind}`
  }
  if (!res.ok) return `upstream ${res.status} for ${kind}`

  const contentType = res.headers.get("content-type")?.split(";")[0].trim()
    || contentTypeFromExt(url)
    || "application/octet-stream"
  const typeErr = assetTypeError(kind, contentType)
  if (typeErr) return `${kind}: ${typeErr}`

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) return `${kind}: empty response`
  if (buf.length > MAX_ASSET_BYTES) return `${kind}: too large`

  await putBrandAsset(brandId, kind, contentType, buf)
  return null
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    return NextResponse.json({ error: "brand assets require the Plus plan" }, { status: 402 })
  }

  const brand = await getOwnedBrand(auth.ownerId, slug)
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 })

  let body: { lightLogoUrl?: string; darkLogoUrl?: string; markUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const jobs: [BrandImageKind, string | undefined][] = [
    ["logo-light", body.lightLogoUrl],
    ["logo-dark", body.darkLogoUrl],
    ["mark", body.markUrl],
  ]

  const stored: string[] = []
  const errors: string[] = []
  for (const [kind, url] of jobs) {
    if (!url) continue
    const err = await hostLogo(brand.id, kind, url)
    if (err) errors.push(err)
    else stored.push(kind)
  }

  return NextResponse.json({ stored, errors })
}
