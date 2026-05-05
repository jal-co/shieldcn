/**
 * shieldcn CLI
 * src/migrate.ts
 *
 * Parse shields.io URLs and convert them to shieldcn equivalents.
 */

import { SHIELDCN_BASE } from "./constants.js"

export type Migration = {
  original: string
  converted: string
  provider: string
}

/**
 * Convert a shields.io URL to a shieldcn URL.
 * Handles common patterns:
 *   - /badge/{label}-{message}-{color}
 *   - /npm/v/{package}
 *   - /github/stars/{owner}/{repo}
 *   - /discord/{serverId}
 *   etc.
 */
export function convertShieldsUrl(url: string): Migration | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "img.shields.io") return null

    const path = parsed.pathname.replace(/^\/+/, "")
    const params = parsed.searchParams

    // Map shields.io query params to shieldcn equivalents
    const query = new URLSearchParams()

    // style → variant mapping
    const style = params.get("style")
    if (style === "flat-square" || style === "flat") query.set("variant", "secondary")
    else if (style === "for-the-badge") query.set("variant", "default")
    else if (style === "social") query.set("variant", "ghost")
    else if (style === "plastic") query.set("variant", "outline")

    // logo
    const logo = params.get("logo")
    if (logo) query.set("logo", logo)

    // logoColor
    const logoColor = params.get("logoColor")
    if (logoColor) query.set("logoColor", logoColor.replace(/^#/, ""))

    // color / labelColor
    const color = params.get("color")
    if (color) query.set("color", color.replace(/^#/, ""))

    const labelColor = params.get("labelColor")
    if (labelColor) query.set("labelColor", labelColor.replace(/^#/, ""))

    // label override
    const label = params.get("label")
    if (label) query.set("label", label)

    // Determine the shieldcn path
    let shieldcnPath: string
    let provider: string

    if (path.startsWith("badge/")) {
      // Static badge: /badge/{text}
      shieldcnPath = path
      provider = "badge"
      // shields.io uses {label}-{message}-{color} with URL encoding
      // shieldcn uses the same format, just pass through
      if (!shieldcnPath.endsWith(".svg") && !shieldcnPath.endsWith(".png")) {
        shieldcnPath += ".svg"
      }
    } else if (path.startsWith("npm/")) {
      // /npm/v/{pkg} → /npm/{pkg}.svg
      // /npm/dw/{pkg} → /npm/dw/{pkg}.svg
      // /npm/dm/{pkg} → /npm/dm/{pkg}.svg
      // /npm/dt/{pkg} → /npm/dt/{pkg}.svg
      // /npm/l/{pkg} → /npm/license/{pkg}.svg
      shieldcnPath = path
        .replace(/^npm\/l\//, "npm/license/")
        .replace(/^npm\/v\//, "npm/")
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = "npm"
    } else if (path.startsWith("github/")) {
      shieldcnPath = path
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = "github"
    } else if (path.startsWith("discord/")) {
      shieldcnPath = path
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = "discord"
    } else if (path.startsWith("pypi/")) {
      shieldcnPath = path.replace(/^pypi\/v\//, "pypi/")
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = "pypi"
    } else if (path.startsWith("crates/")) {
      shieldcnPath = path.replace(/^crates\/v\//, "crates/")
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = "crates"
    } else if (path.startsWith("docker/")) {
      shieldcnPath = path
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = "docker"
    } else {
      // Unknown provider — do a best-effort pass-through
      shieldcnPath = path
      if (!shieldcnPath.endsWith(".svg")) shieldcnPath += ".svg"
      provider = path.split("/")[0] || "unknown"
    }

    const qs = query.toString()
    const converted = `${SHIELDCN_BASE}/${shieldcnPath}${qs ? `?${qs}` : ""}`

    return { original: url, converted, provider }
  } catch {
    return null
  }
}

/**
 * Find all shields.io URLs in a string and convert them.
 */
export function migrateAll(content: string): Migration[] {
  const re = /https?:\/\/img\.shields\.io\/[^\s)"'>]+/g
  const urls = Array.from(new Set(content.match(re) ?? []))
  return urls
    .map(convertShieldsUrl)
    .filter((m): m is Migration => m !== null)
}

/**
 * Replace all shields.io URLs in content with shieldcn URLs.
 */
export function replaceShieldsUrls(content: string, migrations: Migration[]): string {
  let result = content
  for (const m of migrations) {
    result = result.replaceAll(m.original, m.converted)
  }
  return result
}
