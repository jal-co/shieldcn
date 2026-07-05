/**
 * shieldcn
 * app/api/brands/[slug]/logos/route.ts
 *
 * Host a brand's logos by fetching the (Context.dev-provided) light/dark/mark
 * URLs server-side and storing the bytes as brand assets. This is what makes a
 * rebrand propagate: distributed embeds reference /b/{slug}/logo-light.svg,
 * and swapping the stored bytes re-serves everywhere.
 *
 * Admin only. Body: { lightLogoUrl?, darkLogoUrl?, markUrl? }.
 */

import { NextResponse, type NextRequest } from "next/server"
import { getAdmin } from "@/lib/admin"
import { getAnyBrand, putBrandAsset, type BrandImageKind } from "@shieldcn/core/brands"
import {
  assetTypeError,
  contentTypeFromExt,
  recolorSvgForOppositeMode,
  MAX_ASSET_BYTES,
} from "@/lib/brand-assets"

type Params = { params: Promise<{ slug: string }> }

interface HostResult {
  error?: string
  /** Present on success: what was stored, for downstream recolor synthesis. */
  stored?: { contentType: string; buf: Buffer }
}

/** Fetch one remote logo and store it under `kind`. */
async function hostLogo(
  brandId: number,
  kind: BrandImageKind,
  url: string,
): Promise<HostResult> {
  let res: Response
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { Accept: "image/*", "User-Agent": "shieldcn/1.0" },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { error: `fetch failed for ${kind}` }
  }
  if (!res.ok) return { error: `upstream ${res.status} for ${kind}` }

  const contentType = res.headers.get("content-type")?.split(";")[0].trim()
    || contentTypeFromExt(url)
    || "application/octet-stream"
  const typeErr = assetTypeError(kind, contentType)
  if (typeErr) return { error: `${kind}: ${typeErr}` }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0) return { error: `${kind}: empty response` }
  if (buf.length > MAX_ASSET_BYTES) return { error: `${kind}: too large` }

  await putBrandAsset(brandId, kind, contentType, buf)
  return { stored: { contentType, buf } }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const brand = await getAnyBrand(slug)
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 })

  // Back-compat: still accept legacy light/dark URLs, but we only keep a single
  // square mark (+ an auto-generated alt). Prefer an explicit markUrl.
  let body: { markUrl?: string; markAltUrl?: string; lightLogoUrl?: string; darkLogoUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const markUrl = body.markUrl ?? body.darkLogoUrl ?? body.lightLogoUrl
  const stored: string[] = []
  const errors: string[] = []

  let markSvg: Buffer | null = null
  if (markUrl) {
    const r = await hostLogo(brand.id, "mark", markUrl)
    if (r.error) errors.push(r.error)
    else if (r.stored) {
      stored.push("mark")
      if (r.stored.contentType.includes("svg")) markSvg = r.stored.buf
    }
  }

  // Alt mark: use an explicit one if provided, else auto-generate from the mark
  // by flipping near-black/near-white inks (so there's a light + dark variant).
  if (body.markAltUrl) {
    const r = await hostLogo(brand.id, "mark-alt", body.markAltUrl)
    if (r.error) errors.push(r.error)
    else if (r.stored) stored.push("mark-alt")
  } else if (markSvg) {
    const svg = markSvg.toString("utf8")
    // Try to make a contrasting variant: flip to light, else to dark.
    const recolored =
      recolorSvgForOppositeMode(svg, "to-light") ??
      recolorSvgForOppositeMode(svg, "to-dark")
    if (recolored) {
      await putBrandAsset(brand.id, "mark-alt", "image/svg+xml", Buffer.from(recolored, "utf8"))
      stored.push("mark-alt (auto)")
    }
  }

  return NextResponse.json({ stored, errors })
}
