/**
 * shieldcn
 * lib/badges/twemoji
 *
 * Resolves an emoji logo to a full-color Twemoji SVG, rendered as a square
 * inset (like the flag mechanism, but 1:1 instead of 3:2).
 *
 * Sources the art from jdecked/twemoji (the maintained fork) via jsDelivr,
 * cached aggressively since the assets are immutable per release.
 *
 * Trigger forms (handled by isTwemojiLogo / resolveTwemojiSvg):
 *   ?logo=twemoji:🚀      explicit prefix + emoji char
 *   ?logo=twemoji:1f680   explicit prefix + hex codepoint(s, dash-joined)
 *   ?logo=🚀              bare emoji char (auto-detected)
 */

import { cacheGet, cacheSet } from "../cache"

// Pinned release of jdecked/twemoji. Bump deliberately; @latest would risk a
// silent upstream change breaking cached codepoint → asset mappings.
const TWEMOJI_VERSION = "15.1.0"
const TWEMOJI_BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/svg`

// Emoji assets are immutable for a given version → cache for 30 days.
const TWEMOJI_TTL = 60 * 60 * 24 * 30

const ZWJ = 0x200d
const VARIATION_SELECTOR = /\ufe0f/g

/**
 * Convert a unicode string to Twemoji's dash-joined lowercase-hex codepoint id,
 * matching jdecked/twemoji's `toCodePoint`. Handles surrogate pairs.
 */
function toCodePoint(unicode: string): string {
  const out: string[] = []
  let high = 0
  for (let i = 0; i < unicode.length; i++) {
    const c = unicode.charCodeAt(i)
    if (high) {
      out.push((0x10000 + ((high - 0xd800) << 10) + (c - 0xdc00)).toString(16))
      high = 0
    } else if (c >= 0xd800 && c <= 0xdbff) {
      high = c
    } else {
      out.push(c.toString(16))
    }
  }
  return out.join("-")
}

/**
 * Resolve an emoji char to its Twemoji asset codepoint id. Mirrors Twemoji's
 * `grabTheRightIcon`: strip the FE0F variation selector unless the sequence
 * contains a ZWJ (e.g. 👨‍💻), where FE0F is significant.
 */
function emojiToCodepoint(emoji: string): string {
  const hasZwj = emoji.includes(String.fromCharCode(ZWJ))
  const normalized = hasZwj ? emoji : emoji.replace(VARIATION_SELECTOR, "")
  return toCodePoint(normalized)
}

/**
 * A hex codepoint id is one or more dash-joined groups of 1–6 hex digits,
 * e.g. "1f680" or "1f1fa-1f1f8".
 */
function isHexCodepoint(value: string): boolean {
  return /^[0-9a-f]{1,6}(-[0-9a-f]{1,6})*$/i.test(value)
}

// Matches an emoji-class glyph (pictographic) or a regional-indicator symbol
// (flag halves like 🇺🇸 are not Extended_Pictographic). Used to auto-detect a
// bare emoji logo without an explicit prefix.
const EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u

/** Whether a logo param should be resolved as a Twemoji emoji. */
export function isTwemojiLogo(logo: string): boolean {
  if (logo.startsWith("twemoji:")) return true
  // Bare emoji char (but not a data URI, slug, or prefixed icon).
  if (logo.includes(":") || logo.startsWith("data:")) return false
  return EMOJI_RE.test(logo)
}

/**
 * Resolve a Twemoji logo param to its asset codepoint id (e.g. "1f680"), or
 * null if empty. Accepts the `twemoji:` prefix, a raw emoji char, or a hex
 * codepoint. Exported for testing and reuse.
 */
export function twemojiCodepoint(logo: string): string | null {
  const raw = logo.startsWith("twemoji:") ? logo.slice("twemoji:".length) : logo
  if (!raw) return null
  return isHexCodepoint(raw) ? raw.toLowerCase() : emojiToCodepoint(raw)
}

/**
 * Resolve a Twemoji logo param to a raw full-color SVG string, or null if it
 * can't be resolved (unknown emoji, network failure, etc.). Cached.
 */
export async function resolveTwemojiSvg(logo: string): Promise<string | null> {
  const codepoint = twemojiCodepoint(logo)
  if (!codepoint) return null

  const cacheKeyId = `twemoji:${TWEMOJI_VERSION}:${codepoint}`
  const cached = await cacheGet<string>(cacheKeyId)
  if (cached !== undefined) return cached || null

  try {
    const res = await fetch(`${TWEMOJI_BASE}/${codepoint}.svg`, {
      headers: { Accept: "image/svg+xml", "User-Agent": "shieldcn/1.0" },
    })
    if (!res.ok) {
      // Cache the miss briefly so a bad emoji doesn't hammer the CDN.
      await cacheSet(cacheKeyId, "", 60 * 10)
      return null
    }
    const svg = await res.text()
    await cacheSet(cacheKeyId, svg, TWEMOJI_TTL)
    return svg
  } catch {
    return null
  }
}
