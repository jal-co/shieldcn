/**
 * shieldcn CLI
 * src/output.ts
 *
 * Format badges as markdown, HTML, or JSON output.
 */

import type { Badge, GlobalSettings, InspectResult } from "./types.js"
import { badgeMarkdown, badgeHtml, badgeUrl } from "./url.js"

type BadgeGroup = Badge["group"]

const GROUP_TITLES: Record<BadgeGroup, string> = {
  github: "GitHub",
  package: "Package",
  tooling: "Tooling",
  stack: "Stack",
  modern: "Modern",
  community: "Community",
}

const GROUP_ORDER: BadgeGroup[] = [
  "github",
  "package",
  "tooling",
  "stack",
  "modern",
  "community",
]

function groupBadges(badges: Badge[]): Map<BadgeGroup, Badge[]> {
  const groups = new Map<BadgeGroup, Badge[]>()
  for (const badge of badges) {
    if (!badge.enabled) continue
    const list = groups.get(badge.group) ?? []
    list.push(badge)
    groups.set(badge.group, list)
  }
  return groups
}

/**
 * Format badges as grouped markdown.
 */
export function formatMarkdown(
  result: InspectResult,
  global: GlobalSettings,
  options: { grouped?: boolean; compact?: boolean } = {},
): string {
  const { grouped = true, compact = false } = options
  const enabled = result.badges.filter((b) => b.enabled)

  if (!grouped || compact) {
    return enabled.map((b) => badgeMarkdown(b, global)).join("\n")
  }

  const groups = groupBadges(enabled)
  const sections: string[] = []

  for (const group of GROUP_ORDER) {
    const badges = groups.get(group)
    if (!badges || badges.length === 0) continue
    const title = GROUP_TITLES[group]
    const lines = badges.map((b) => badgeMarkdown(b, global))
    sections.push(`### ${title}\n\n${lines.join("\n")}`)
  }

  return sections.join("\n\n")
}

/**
 * Format badges as flat markdown (all in one line, no groups).
 */
export function formatFlatMarkdown(
  result: InspectResult,
  global: GlobalSettings,
): string {
  return result.badges
    .filter((b) => b.enabled)
    .map((b) => badgeMarkdown(b, global))
    .join(" ")
}

/**
 * Format badges as HTML.
 */
export function formatHtml(
  result: InspectResult,
  global: GlobalSettings,
): string {
  const enabled = result.badges.filter((b) => b.enabled)
  const groups = groupBadges(enabled)
  const sections: string[] = []

  sections.push('<p align="center">')

  for (const group of GROUP_ORDER) {
    const badges = groups.get(group)
    if (!badges || badges.length === 0) continue
    for (const b of badges) {
      sections.push(`  ${badgeHtml(b, global)}`)
    }
  }

  sections.push("</p>")
  return sections.join("\n")
}

/**
 * Format badges as JSON config.
 */
export function formatJson(
  result: InspectResult,
  global: GlobalSettings,
): string {
  return JSON.stringify(
    {
      version: 1,
      source: result.source,
      global,
      badges: result.badges.map((b) => ({
        ...b,
        url: badgeUrl(b, global),
      })),
      notes: result.notes,
    },
    null,
    2,
  )
}
