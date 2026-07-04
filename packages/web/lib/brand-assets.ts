/**
 * shieldcn
 * lib/brand-assets.ts
 *
 * Validation helpers for brand asset uploads (logos + fonts). Shared by the
 * upload route and the remote-logo import route.
 */

import type { BrandAssetKind, BrandImageKind, BrandFontKind } from "@shieldcn/core/brands"
import { BRAND_IMAGE_KINDS, BRAND_FONT_KINDS } from "@shieldcn/core/brands"

/** Max stored asset size. Logos/fonts are small; cap to keep Postgres lean. */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024 // 2 MB

const IMAGE_TYPES = new Set(["image/svg+xml", "image/png", "image/jpeg", "image/webp"])
const FONT_TYPES = new Set([
  "font/ttf", "font/otf", "font/woff", "font/woff2",
  "application/font-sfnt", "application/x-font-ttf", "application/octet-stream",
])

export function isImageKind(kind: string): kind is BrandImageKind {
  return (BRAND_IMAGE_KINDS as string[]).includes(kind)
}
export function isFontKind(kind: string): kind is BrandFontKind {
  return (BRAND_FONT_KINDS as string[]).includes(kind)
}
export function isValidAssetKind(kind: string): kind is BrandAssetKind {
  return isImageKind(kind) || isFontKind(kind)
}

/** Validate a content type against the kind. Returns null when acceptable. */
export function assetTypeError(kind: BrandAssetKind, contentType: string): string | null {
  const ct = contentType.split(";")[0].trim().toLowerCase()
  if (isImageKind(kind)) {
    return IMAGE_TYPES.has(ct) ? null : "logo must be SVG, PNG, JPEG, or WebP"
  }
  return FONT_TYPES.has(ct) ? null : "font must be TTF, OTF, WOFF, or WOFF2"
}

/** Guess a content type from a URL/file extension when the server omits one. */
export function contentTypeFromExt(nameOrUrl: string): string | undefined {
  const ext = nameOrUrl.split("?")[0].split(".").pop()?.toLowerCase()
  switch (ext) {
    case "svg": return "image/svg+xml"
    case "png": return "image/png"
    case "jpg":
    case "jpeg": return "image/jpeg"
    case "webp": return "image/webp"
    case "ttf": return "font/ttf"
    case "otf": return "font/otf"
    case "woff": return "font/woff"
    case "woff2": return "font/woff2"
    default: return undefined
  }
}
