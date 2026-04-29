/**
 * shieldcn
 * lib/providers/badge
 *
 * Static and dynamic badge providers.
 *
 * Static:  /badge/{badgeContent}.svg
 *          where badgeContent is "label-message-color" or "message-color"
 *          (shields.io compatible format)
 *
 * Dynamic: /badge/dynamic/json.svg?url=...&query=...
 */

import type { BadgeData } from "../badges/types"
import { JSONPath } from "jsonpath-plus"

// ---------------------------------------------------------------------------
// Named color map (subset matching shields.io / badge-maker)
// ---------------------------------------------------------------------------

const NAMED_COLORS: Record<string, string> = {
  brightgreen: "44cc11",
  green: "16a34a",
  yellow: "d97706",
  yellowgreen: "a3e635",
  orange: "ea580c",
  red: "dc2626",
  blue: "2563eb",
  grey: "6b7280",
  gray: "6b7280",
  lightgrey: "9ca3af",
  lightgray: "9ca3af",
  critical: "dc2626",
  important: "ea580c",
  success: "16a34a",
  informational: "2563eb",
  inactive: "9ca3af",
  // CSS named colors (common subset)
  black: "000000",
  white: "ffffff",
  purple: "9333ea",
  violet: "7c3aed",
  pink: "ec4899",
  cyan: "0891b2",
  teal: "0d9488",
  lime: "84cc16",
  indigo: "6366f1",
}

/**
 * Resolve a color string to a hex value (without #).
 * Accepts: named colors, hex (with or without #), or returns undefined.
 */
function resolveColor(color: string | undefined): string | undefined {
  if (!color) return undefined
  const lower = color.toLowerCase()
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower]
  // Strip leading # if present
  const hex = lower.replace(/^#/, "")
  // Validate hex: 3, 4, 6, or 8 hex chars
  if (/^[0-9a-f]{3,8}$/i.test(hex)) return hex
  return undefined
}

// ---------------------------------------------------------------------------
// Static badge
// ---------------------------------------------------------------------------

/**
 * Parse a shields.io-compatible badgeContent string.
 *
 * Format: "label-message-color" or "message-color"
 *
 * The last segment is always the color. If there are 3+ segments, the first
 * is the label. Everything in between is the message.
 *
 * Double dashes (--) encode a literal dash within segments.
 * Underscores (_) encode spaces. Double underscores (__) encode literal _.
 */
export function parseStaticBadgeContent(content: string): BadgeData {
  // Split on single dashes, preserving double dashes as literals.
  // Strategy: replace -- with a placeholder, split on -, rejoin placeholders.
  const placeholder = "\x00"
  const escaped = content.replace(/--/g, placeholder)
  const parts = escaped.split("-").map((p) => p.replace(new RegExp(placeholder, "g"), "-"))

  let label = ""
  let value: string
  let color: string | undefined

  if (parts.length >= 3) {
    // label-message-color (message may contain dashes, take first as label, last as color)
    label = decodeText(parts[0])
    color = resolveColor(parts[parts.length - 1])
    // If the last part resolved as a color, the middle is the message
    if (color) {
      value = decodeText(parts.slice(1, -1).join("-"))
    } else {
      // No valid color — treat as label-message (no color)
      value = decodeText(parts.slice(1).join("-"))
      color = undefined
    }
  } else if (parts.length === 2) {
    // Could be "message-color" or "label-message"
    const maybeColor = resolveColor(parts[1])
    if (maybeColor) {
      value = decodeText(parts[0])
      color = maybeColor
    } else {
      label = decodeText(parts[0])
      value = decodeText(parts[1])
    }
  } else {
    // Single segment — message only
    value = decodeText(parts[0])
  }

  return {
    label,
    value,
    color: color ? color : undefined,
  }
}

/**
 * Decode shields.io-style text encoding:
 * - Underscore _ → space
 * - Double underscore __ → literal underscore
 * - %20 → space (via decodeURIComponent)
 */
function decodeText(text: string): string {
  let decoded: string
  try {
    decoded = decodeURIComponent(text)
  } catch {
    decoded = text // if malformed, use as-is
  }
  return decoded
    .replace(/__/g, "\x01")   // protect double underscores
    .replace(/_/g, " ")        // single underscore → space
    .replace(/\x01/g, "_")    // restore literal underscores
}

// ---------------------------------------------------------------------------
// Dynamic JSON badge
// ---------------------------------------------------------------------------

/**
 * Dynamic JSON badge — fetches a JSON document and extracts a value.
 *
 * Query params:
 *  - url:    URL to a JSON document (required)
 *  - query:  JSONPath expression (required)
 *  - prefix: optional text to prepend to the value
 *  - suffix: optional text to append to the value
 *  - label:  override badge label (defaults to "custom")
 */
export async function getDynamicJsonBadge(
  searchParams: URLSearchParams
): Promise<BadgeData | null> {
  const jsonUrl = searchParams.get("url")
  const query = searchParams.get("query")

  if (!jsonUrl || !query) return null

  try {
    const response = await fetch(jsonUrl, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json",
        "User-Agent": "shieldcn/1.0",
      },
    })

    if (!response.ok) {
      return {
        label: searchParams.get("label") || "error",
        value: `${response.status}`,
        color: "red",
      }
    }

    const data = await response.json()
    const results = JSONPath({ path: query, json: data })

    if (!results || results.length === 0) {
      return {
        label: searchParams.get("label") || "custom",
        value: "not found",
        color: "red",
      }
    }

    let value = String(results[0])
    const prefix = searchParams.get("prefix") || ""
    const suffix = searchParams.get("suffix") || ""
    value = `${prefix}${value}${suffix}`

    return {
      label: searchParams.get("label") || "custom",
      value,
    }
  } catch {
    return {
      label: searchParams.get("label") || "error",
      value: "fetch failed",
      color: "red",
    }
  }
}
