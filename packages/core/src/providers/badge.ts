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
import { resolveColor } from "../badges/themes"
import { raceTimeout } from "../provider-fetch"
import flagNames from "../badges/flags.json"

// Country flags come from `country-flag-icons` (catamphetamine), 3x2 aspect.
// Codes are ISO 3166-1 alpha-2 (uppercase) plus a few subdivisions/regions
// (e.g. GB-ENG, ES-CT, EU). flags.json maps each code to a display name.
const FLAG_CDN_BASE = "https://catamphetamine.gitlab.io/country-flag-icons/3x2"
const FLAG_NAMES = flagNames as Record<string, string>

/** True for every country/region code shieldcn can render a flag for. */
export function isKnownFlagCode(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(FLAG_NAMES, code.trim().toUpperCase())
}

/** All supported flag codes (uppercase), sorted. */
export function listFlagCodes(): string[] {
  return Object.keys(FLAG_NAMES)
}

/**
 * /flag/{code} — a “built in {country}” badge. The flag SVG is rendered as a
 * natural-aspect chip on the left (handled in the renderer); here we resolve
 * the display name and the flag CDN URL.
 */
export async function getFlagBadge(code: string): Promise<BadgeData | null> {
  const raw = code.trim()
  if (!raw) return null
  // CDN filenames are uppercase (US.svg, GB-ENG.svg).
  const cdnCode = raw.toUpperCase()
  const name = FLAG_NAMES[cdnCode]

  if (!name) {
    // Unknown code — still return a readable badge, no flag art.
    const fallback = raw
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    return { label: "built in", value: fallback, color: "red" }
  }

  return {
    label: "built in",
    value: name,
    link: `${FLAG_CDN_BASE}/${cdnCode}.svg`,
  }
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
    const response = await raceTimeout(fetch(jsonUrl, {
      next: { revalidate: 300 },
      headers: {
        Accept: "application/json",
        "User-Agent": "shieldcn/1.0",
      },
    }))
    if (!response) {
      return {
        label: searchParams.get("label") || "error",
        value: "timeout",
        color: "red",
        // Failure verdicts are still informative badges, but they must carry
        // short error cache headers so they self-heal instead of being pinned
        // at the CDN for an hour like a success.
        error: true,
      }
    }

    if (!response.ok) {
      return {
        label: searchParams.get("label") || "error",
        value: `${response.status}`,
        color: "red",
        error: true,
      }
    }

    const data = await response.json()
    const results = JSONPath({ path: query, json: data })

    if (!results || results.length === 0) {
      return {
        label: searchParams.get("label") || "custom",
        value: "not found",
        color: "red",
        error: true,
      }
    }

    const first = results[0]
    let value = typeof first === "object" && first !== null ? JSON.stringify(first) : String(first)
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
      error: true,
    }
  }
}
