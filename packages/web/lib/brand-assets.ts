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

/**
 * Recolor an SVG logo for the opposite badge mode. Brand logos are typically
 * a single ink color; a dark-ink logo (for light backgrounds) is invisible on a
 * dark badge and vice-versa. This flips near-black inks to white (and vice
 * versa) so a single scraped logo works on both modes.
 *
 * Heuristic + conservative: only rewrites `fill`/`stroke`/`stop-color` values
 * and `fill:`/`color:` in style attributes that are near-black or near-white.
 * Colored marks (e.g. a red logo) are left untouched. Returns null if the input
 * isn't SVG text or nothing changed.
 */
export function recolorSvgForOppositeMode(
  svg: string,
  target: "to-light" | "to-dark",
): string | null {
  if (!svg.includes("<svg")) return null
  const toColor = target === "to-light" ? "#ffffff" : "#000000"

  // Parse a color value to [r,g,b], or null when unparseable. Handles hex
  // (3/6-digit), black/white keywords, and rgb(r, g, b).
  const toRgb = (v: string): [number, number, number] | null => {
    const c = v.trim().toLowerCase()
    if (c === "black") return [0, 0, 0]
    if (c === "white") return [255, 255, 255]
    let m = c.match(/^#([0-9a-f]{3})$/)
    if (m) {
      const [r, g, b] = m[1].split("")
      return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)]
    }
    m = c.match(/^#([0-9a-f]{6})$/)
    if (m) {
      const n = parseInt(m[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    m = c.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/)
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
    return null
  }
  const luma = (rgb: [number, number, number]) =>
    0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
  const isDarkInk = (v: string): boolean => {
    const rgb = toRgb(v)
    return rgb !== null && luma(rgb) < 40
  }
  const isLightInk = (v: string): boolean => {
    const rgb = toRgb(v)
    return rgb !== null && luma(rgb) > 215
  }
  const shouldFlip = target === "to-light" ? isDarkInk : isLightInk

  let changed = false
  const out = svg.replace(
    /(fill|stroke|stop-color|color)\s*[:=]\s*(["']?)(#[0-9a-fA-F]{3,6}|black|white|rgb\([^)]*\))\2/g,
    (match, prop, quote, value) => {
      if (value.toLowerCase() === "none") return match
      if (shouldFlip(value)) {
        changed = true
        const sep = match.includes(":") ? ": " : "="
        return `${prop}${sep}${quote}${toColor}${quote}`
      }
      return match
    },
  )
  if (changed) return out

  // No color attributes matched. SVG's presentational default ink is BLACK, so
  // a fill-less icon (very common for single-path marks) renders near-invisible
  // on a dark badge and the regex above has nothing to rewrite — this was the
  // "sometimes the color doesn't strip" case. Inject an explicit ink on the
  // root <svg> so the alt mark actually flips. Only meaningful for to-light
  // (a fill-less SVG is already dark ink).
  if (target === "to-light") {
    const hasAnyInk = /(fill|stroke|stop-color)\s*[:=]\s*["']?(?!none)[#a-z0-9(]/i.test(svg)
    if (!hasAnyInk) {
      const injected = svg.replace(/<svg\b/, `<svg fill="${toColor}"`)
      if (injected !== svg) return injected
    }
  }
  return null
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
