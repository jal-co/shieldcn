/**
 * shieldcn CLI
 * src/inject.ts
 *
 * Inject/replace badges between <!-- shieldcn-start --> markers in README.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { INJECT_START, INJECT_END } from "./constants.js"

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD"]

/**
 * Find the README file in a directory.
 */
export function findReadme(dir: string): string | null {
  for (const name of README_NAMES) {
    const path = join(dir, name)
    if (existsSync(path)) return path
  }
  return null
}

/**
 * Check if a README already has shieldcn markers.
 */
export function hasMarkers(content: string): boolean {
  return content.includes(INJECT_START) && content.includes(INJECT_END)
}

/**
 * Inject badge markdown between markers.
 * If markers exist, replaces content between them.
 * If not, inserts markers + badges after the first heading.
 */
export function injectBadges(content: string, badgeMarkdown: string): string {
  const block = `${INJECT_START}\n${badgeMarkdown}\n${INJECT_END}`

  if (hasMarkers(content)) {
    // Replace existing markers
    const startIdx = content.indexOf(INJECT_START)
    const endIdx = content.indexOf(INJECT_END) + INJECT_END.length
    return content.slice(0, startIdx) + block + content.slice(endIdx)
  }

  // Insert after first heading
  const headingMatch = content.match(/^#\s+.+$/m)
  if (headingMatch && headingMatch.index !== undefined) {
    const insertAt = headingMatch.index + headingMatch[0].length
    return (
      content.slice(0, insertAt) +
      "\n\n" +
      block +
      "\n" +
      content.slice(insertAt)
    )
  }

  // No heading found — prepend
  return block + "\n\n" + content
}

/**
 * Read, inject, and write back to README.
 */
export function injectIntoFile(readmePath: string, badgeMarkdown: string): void {
  const content = readFileSync(readmePath, "utf-8")
  const updated = injectBadges(content, badgeMarkdown)
  writeFileSync(readmePath, updated, "utf-8")
}
