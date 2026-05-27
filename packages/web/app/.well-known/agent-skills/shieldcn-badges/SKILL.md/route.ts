/**
 * shieldcn
 * app/.well-known/agent-skills/shieldcn-badges/SKILL.md/route.ts
 *
 * Serves the shieldcn-badges SKILL.md file for agent skills discovery.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

export function GET() {
  const skillPath = join(process.cwd(), "..", "..", "skills", "shieldcn-badges", "SKILL.md")

  try {
    const content = readFileSync(skillPath, "utf-8")
    return new Response(content, {
      headers: {
        "Content-Type": "text/markdown",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    })
  } catch {
    // Fallback: serve from the repo root (monorepo structure varies)
    try {
      const altPath = join(process.cwd(), "../../skills/shieldcn-badges/SKILL.md")
      const content = readFileSync(altPath, "utf-8")
      return new Response(content, {
        headers: {
          "Content-Type": "text/markdown",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      })
    } catch {
      return new Response("# shieldcn-badges\n\nSkill file not found.", {
        status: 404,
        headers: { "Content-Type": "text/markdown" },
      })
    }
  }
}
