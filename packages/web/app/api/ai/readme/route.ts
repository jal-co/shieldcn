/**
 * shieldcn
 * app/api/ai/readme/route.ts
 *
 * Generate a README (as GitHub-flavored Markdown) from a repo summary or
 * pasted package metadata. The Studio imports the markdown into typed blocks
 * via lib/studio-import, so the model emits clean Markdown — including a real
 * shieldcn badge row (not a placeholder). Plus callers may pass a brand slug to
 * style every generated badge with their brand.
 *
 * Plus+ only. Usage is metered through Polar (see lib/ai).
 */

import { NextResponse, type NextRequest } from "next/server"
import { generateText } from "ai"
import { requireOwner } from "@/lib/auth"
import { getPlan, hasPlan } from "@shieldcn/core/entitlements"
import { getOwnedBrand } from "@shieldcn/core/brands"
import { aiModel, meterAiUsage, aiErrorResponse, aiConfigured } from "@/lib/ai"
import { loadBadgeSkill } from "@/lib/badge-skill"

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://shieldcn.dev"

/**
 * Build the system prompt. Teaches the real shieldcn badge URL format so the
 * model emits working badges inferred from the project, optionally styled with
 * a brand (`?brand=slug`, applied to every badge URL).
 */
/** Inline badge reference used only if the skill file can't be loaded. */
const INLINE_BADGES = (q: string) => `shieldcn badges are real image URLs on ${SITE}. Use these formats, filling in
the project's real identifiers (never leave literal placeholders):
- npm version:      ![npm](${SITE}/npm/v/PACKAGE.svg${q})
- npm downloads:    ![downloads](${SITE}/npm/dm/PACKAGE.svg${q})
- GitHub stars:     ![stars](${SITE}/github/stars/OWNER/REPO.svg${q})
- GitHub license:   ![license](${SITE}/github/license/OWNER/REPO.svg${q})
- GitHub CI:        ![build](${SITE}/github/OWNER/REPO/ci.svg${q})
- PyPI version:     ![pypi](${SITE}/pypi/v/PACKAGE.svg${q})
- Static badge:     ![label](${SITE}/badge/LABEL-MESSAGE-COLOR.svg${q})

Graphs (full-width images, not in the badge row — give each its own section):
- Star history chart:  ![stars over time](${SITE}/chart/github/stars/OWNER/REPO.svg${q})
- Contributor wall:    ![contributors](${SITE}/contributors/OWNER/REPO.svg${q})`

function buildSystem(brandSlug: string | null, links: { github?: string; website?: string }): string {
  // Badges default to the compact XS size; a brand overlays its style.
  const params = ["size=xs"]
  if (brandSlug) params.push(`brand=${brandSlug}`)
  const q = `?${params.join("&")}`
  const styleNote = brandSlug
    ? `IMPORTANT: append "${q}" to EVERY shieldcn badge URL so they render compact
(XS) and in the "${brandSlug}" brand style.`
    : `IMPORTANT: append "${q}" to every shieldcn badge URL so badges render at the
compact XS size. You may also add "&variant=branded" for a colored look.`

  const linkNote = [
    links.github ? `- GitHub repository: ${links.github}` : "",
    links.website ? `- Website: ${links.website}` : "",
  ].filter(Boolean).join("\n")
  const linksSection = linkNote
    ? `\nKnown project links (use these exact URLs; infer OWNER/REPO from the GitHub
URL for badges):\n${linkNote}\nLink the title/description to the website when one
is given, and include a short "Links" line pointing to the repo and site.`
    : ""

  // Prefer the published shieldcn-badges skill as the authoritative badge
  // reference; fall back to the inline subset if the file isn't available.
  const skill = loadBadgeSkill()
  const reference = skill
    ? `Below is the official shieldcn badge skill. Follow its badge, group, chart,
and header syntax exactly, using ${SITE} as the base URL.

=== shieldcn-badges skill ===
${skill}
=== end skill ===`
    : INLINE_BADGES(q)

  return `You are a technical writer generating a project README, and an expert
at shieldcn badges.

Output GitHub-flavored Markdown only — no preamble, no surrounding code fence.

Structure, in order:
1. An H1 title.
2. A one-line description.
3. A centered badge row of 3–5 relevant shieldcn badges as Markdown images,
   wrapped in <p align="center"> … </p>. Infer the package name / GitHub
   owner+repo from the context and use real values. Badges MUST use the XS size.
4. Installation, Usage, and License sections.
5. When a GitHub repo is known, add a "Stars" section with the shieldcn star
   history chart and a "Contributors" section with the contributors graph/wall
   (use the chart + contributors URL formats from the reference, with ${q}).

${reference}
${linksSection}

${styleNote}
Only include badges that make sense for the project. Keep prose tight and
concrete. Do not invent features.`
}

export async function POST(req: NextRequest) {
  if (!aiConfigured) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 })
  }
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    return NextResponse.json({ error: "AI requires the Plus plan" }, { status: 402 })
  }

  let body: { summary?: string; repo?: string; brand?: string; githubUrl?: string; websiteUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  const github = (body.githubUrl ?? "").trim().slice(0, 300) || undefined
  const website = (body.websiteUrl ?? "").trim().slice(0, 300) || undefined
  // Fold the known links into the model context too, so it can infer OWNER/REPO.
  const linkContext = [github ? `GitHub: ${github}` : "", website ? `Website: ${website}` : ""]
    .filter(Boolean).join("\n")
  const context = [(body.summary ?? body.repo ?? "").slice(0, 8000), linkContext]
    .filter(Boolean).join("\n\n")
  if (!context.trim()) {
    return NextResponse.json({ error: "provide a summary, repo, or links" }, { status: 400 })
  }

  // A brand is a Plus capability — accept it only when the caller is Plus and
  // actually owns that brand; otherwise generate unbranded.
  let brandSlug: string | null = null
  if (body.brand && (await getPlan(auth.ownerId)) === "plus") {
    const owned = await getOwnedBrand(auth.ownerId, body.brand)
    if (owned) brandSlug = owned.slug
  }

  try {
    const { text, usage } = await generateText({
      model: aiModel(),
      system: buildSystem(brandSlug, { github, website }),
      prompt: `Write a README for this project:\n\n${context}`,
    })
    meterAiUsage(auth.ownerId, usage)
    return NextResponse.json({ markdown: text })
  } catch (err) {
    const { error, status } = aiErrorResponse(err)
    return NextResponse.json({ error }, { status })
  }
}
