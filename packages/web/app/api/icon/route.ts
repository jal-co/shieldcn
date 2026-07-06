/**
 * shieldcn
 * app/api/icon/route
 *
 * Renders any icon slug (SimpleIcons, lu:, ri:, custom) as a standalone SVG.
 * Used by the builder's visual icon picker to preview icons from all sources.
 *
 *   GET /api/icon?slug=lu:Check&color=a1a1aa
 */

import { getSimpleIcon } from "@shieldcn/core/badges/simple-icons"

export const revalidate = 86400

const EMPTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"/>`

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug")?.trim() || ""
  const color = (url.searchParams.get("color")?.trim() || "a1a1aa").replace(/[^0-9a-fA-F]/g, "")

  const headers = {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
  }

  if (!slug || slug.length > 100) {
    return new Response(EMPTY_SVG, { status: 400, headers })
  }

  const resolved = await getSimpleIcon(slug)
  if (!resolved) {
    return new Response(EMPTY_SVG, { status: 404, headers })
  }

  const { icon } = resolved
  const fill = `#${color || "a1a1aa"}`
  const paths = icon.paths?.length ? icon.paths : [icon.path]

  // Rotation pivot must be the viewBox center, not a hardcoded 24x24 assumption
  // — custom icons can have any viewBox (e.g. openpanel is 61×35). Mirrors the
  // core renderer's rotTransform calc in badges/render.tsx.
  const [, , vbW, vbH] = icon.viewBox.split(" ").map(Number)
  const rotation = icon.rotation
    ? ` transform="rotate(${icon.rotation} ${vbW / 2} ${vbH / 2})"`
    : ""

  const pathAttrs = icon.isStroke
    ? `fill="none" stroke="${fill}" stroke-width="${icon.strokeWidth ?? 2}" stroke-linecap="${esc(icon.strokeLinecap ?? "round")}" stroke-linejoin="${esc(icon.strokeLinejoin ?? "round")}"`
    : `fill="${fill}"${icon.fillRule ? ` fill-rule="${esc(icon.fillRule)}"` : ""}`

  const body = paths
    .map(d => `<path d="${esc(d)}" ${pathAttrs}${rotation}/>`)
    .join("")

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(icon.viewBox)}">${body}</svg>`
  return new Response(svg, { headers })
}
