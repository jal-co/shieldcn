/**
 * shieldcn
 * app/api/brands/[slug]/assets/route.ts
 *
 * Upload a brand asset (logo or font) via multipart form. Admin only. Body:
 * FormData with `kind` (logo-light | logo-dark | mark | wordmark | font-sans |
 * font-mono | font-heading) and `file`.
 */

import { NextResponse, type NextRequest } from "next/server"
import { getAdmin } from "@/lib/admin"
import { getAnyBrand, putBrandAsset, deleteBrandAsset, listBrandAssetKinds, type BrandAssetKind } from "@shieldcn/core/brands"
import {
  isValidAssetKind,
  assetTypeError,
  contentTypeFromExt,
  recolorSvgForOppositeMode,
  MAX_ASSET_BYTES,
} from "@/lib/brand-assets"

type Params = { params: Promise<{ slug: string }> }

/** List which asset kinds (fonts + logos) this brand has stored. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const brand = await getAnyBrand(slug)
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 })
  const assets = await listBrandAssetKinds(brand.id)
  return NextResponse.json({ assets })
}

/** Remove a stored asset (logo/mark or font) by kind (?kind=mark). */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const kind = new URL(req.url).searchParams.get("kind") ?? ""
  if (!isValidAssetKind(kind)) {
    return NextResponse.json({ error: "invalid asset kind" }, { status: 400 })
  }

  const brand = await getAnyBrand(slug)
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 })

  const removed = await deleteBrandAsset(brand.id, kind as BrandAssetKind)
  if (!removed) return NextResponse.json({ error: "asset not found" }, { status: 404 })
  return NextResponse.json({ ok: true, kind })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const brand = await getAnyBrand(slug)
  if (!brand) return NextResponse.json({ error: "not found" }, { status: 404 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: "expected multipart form data" }, { status: 400 })
  }

  const kind = String(form.get("kind") ?? "")
  const file = form.get("file")
  if (!isValidAssetKind(kind)) {
    return NextResponse.json({ error: "invalid asset kind" }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 })
  }
  if (file.size > MAX_ASSET_BYTES) {
    return NextResponse.json({ error: "file too large (max 2 MB)" }, { status: 413 })
  }

  const contentType = file.type || contentTypeFromExt(file.name) || "application/octet-stream"
  const typeErr = assetTypeError(kind, contentType)
  if (typeErr) return NextResponse.json({ error: typeErr }, { status: 415 })

  try {
    const data = Buffer.from(await file.arrayBuffer())
    await putBrandAsset(brand.id, kind, contentType, data, file.name)

    // Direct mark uploads get the same alt-mark synthesis as the import flow:
    // recolor the ink for the opposite badge mode so logo=brand-alt works
    // without a second manual upload. Only fills the slot when the brand has
    // no alt yet — an explicitly uploaded alt mark is never clobbered.
    let altGenerated = false
    if (kind === "mark" && contentType.includes("svg")) {
      const kinds = await listBrandAssetKinds(brand.id)
      const hasAlt = kinds.some((a) => a.kind === "mark-alt")
      if (!hasAlt) {
        const svg = data.toString("utf8")
        const recolored =
          recolorSvgForOppositeMode(svg, "to-light") ??
          recolorSvgForOppositeMode(svg, "to-dark")
        if (recolored) {
          await putBrandAsset(brand.id, "mark-alt", "image/svg+xml", Buffer.from(recolored, "utf8"))
          altGenerated = true
        }
      }
    }

    return NextResponse.json({ ok: true, kind, contentType, bytes: data.length, altGenerated })
  } catch (err) {
    // Surface the real failure instead of an opaque 500 — an asset store error
    // was previously an unhandled throw, which made upload failures undebuggable
    // from the client.
    console.error(`[brands] asset upload failed slug=${slug} kind=${kind}:`, err)
    const message = err instanceof Error ? err.message : "asset store failed"
    return NextResponse.json({ error: `upload failed: ${message}` }, { status: 500 })
  }
}
