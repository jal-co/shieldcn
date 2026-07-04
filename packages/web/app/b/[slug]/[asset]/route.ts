/**
 * shieldcn
 * app/b/[slug]/[asset]/route.ts
 *
 * Serve a hosted brand asset at a stable URL, e.g. /b/acme/logo.svg. Swapping
 * the asset re-serves everywhere on next fetch (short TTL). Unknown assets 404
 * quietly — callers embedding <img> get a clean miss, never a broken pipeline.
 *
 * NOTE: badge URLs like /b/{slug}/{provider}/... are handled by the badge
 * catch-all; this route only matches the two-segment asset form where the
 * second segment is a known asset filename (logo.svg / logo.png / etc.).
 */

import { type NextRequest } from "next/server"
import { getBrandAsset, type BrandAssetKind } from "@shieldcn/core/brands"

type Params = { params: Promise<{ slug: string; asset: string }> }

/** Map a request filename to a stored asset kind + response content type. */
const ASSET_MAP: Record<string, { kind: BrandAssetKind }> = {
  "logo-light.svg": { kind: "logo-light" },
  "logo-light.png": { kind: "logo-light" },
  "logo-dark.svg": { kind: "logo-dark" },
  "logo-dark.png": { kind: "logo-dark" },
  "mark.svg": { kind: "mark" },
  "mark.png": { kind: "mark" },
  "wordmark.svg": { kind: "wordmark" },
  "wordmark.png": { kind: "wordmark" },
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, asset } = await params
  const spec = ASSET_MAP[asset]
  if (!spec) return new Response("not found", { status: 404 })

  const found = await getBrandAsset(slug, spec.kind)
  if (!found) return new Response("not found", { status: 404 })

  return new Response(found.data as unknown as BodyInit, {
    headers: {
      "Content-Type": found.contentType,
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  })
}
