/**
 * shieldcn
 * lib/providers/x
 *
 * Static X / Twitter badge provider.
 * Generates follow and mention CTA badges that link to X profiles.
 * No API token required — these are static badges with the X icon.
 */

import type { BadgeData } from "../badges/types"

function normalizeUsername(username: string): string {
  return username.replace(/^@/, "")
}

function profileLink(username: string): string {
  return `https://x.com/${normalizeUsername(username)}`
}

// ---------------------------------------------------------------------------
// Follow — "follow @username"
// ---------------------------------------------------------------------------

export function getXFollow(username: string): BadgeData {
  const normalized = normalizeUsername(username)
  return {
    label: "follow",
    value: `@${normalized}`,
    link: profileLink(normalized),
  }
}

// ---------------------------------------------------------------------------
// Mention — "@username"
// ---------------------------------------------------------------------------

export function getXMention(username: string): BadgeData {
  const normalized = normalizeUsername(username)
  return {
    label: "x",
    value: `@${normalized}`,
    link: `https://x.com/intent/tweet?text=${encodeURIComponent(`@${normalized} `)}`,
  }
}
