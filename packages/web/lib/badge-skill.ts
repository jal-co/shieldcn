/**
 * shieldcn
 * lib/badge-skill.ts
 *
 * Loads the shieldcn-badges SKILL.md — the same agent skill published at
 * /.well-known/agent-skills — as authoritative badge context for AI README
 * generation, so the model uses real shieldcn badge/group/chart/header syntax
 * instead of a hand-maintained subset. Server-only; cached per process; fails
 * soft to an empty string (the caller falls back to inline examples).
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

let cached: string | null = null

/** The shieldcn-badges skill body (frontmatter stripped), or "" if unavailable. */
export function loadBadgeSkill(): string {
  if (cached !== null) return cached
  // Mirror the skill route's path resolution — monorepo cwd varies by env.
  const candidates = [
    join(process.cwd(), "..", "..", "skills", "shieldcn-badges", "SKILL.md"),
    join(process.cwd(), "../../skills/shieldcn-badges/SKILL.md"),
    join(process.cwd(), "skills", "shieldcn-badges", "SKILL.md"),
  ]
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf-8")
      cached = raw.replace(/^---[\s\S]*?\n---\n/, "").trim()
      return cached
    } catch {
      /* try the next candidate */
    }
  }
  cached = ""
  return cached
}
