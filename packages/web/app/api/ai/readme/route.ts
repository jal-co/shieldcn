/**
 * shieldcn
 * app/api/ai/readme/route.ts
 *
 * Generate a README (as GitHub-flavored Markdown) from a repo summary or
 * pasted package metadata. The Studio imports the markdown into typed blocks
 * via lib/studio-import, so the model only needs to emit clean Markdown.
 *
 * Plus+ only. Usage is metered through Polar (see lib/ai).
 */

import { NextResponse, type NextRequest } from "next/server"
import { generateText } from "ai"
import { requireOwner } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import { meteredModel, aiConfigured } from "@/lib/ai"

const SYSTEM = `You are a technical writer generating a project README.
Output GitHub-flavored Markdown only — no preamble, no code fence around the
whole document. Include: an H1 title, a one-line description, a shieldcn badge
row placeholder line reading "<!-- badges -->", Installation, Usage, and
License sections. Keep prose tight and concrete. Do not invent features.`

export async function POST(req: NextRequest) {
  if (!aiConfigured) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 })
  }
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    return NextResponse.json({ error: "AI requires the Plus plan" }, { status: 402 })
  }

  let body: { summary?: string; repo?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  const context = (body.summary ?? body.repo ?? "").slice(0, 8000)
  if (!context.trim()) {
    return NextResponse.json({ error: "provide a summary or repo" }, { status: 400 })
  }

  try {
    const { text } = await generateText({
      model: meteredModel(auth.ownerId),
      system: SYSTEM,
      prompt: `Write a README for this project:\n\n${context}`,
    })
    return NextResponse.json({ markdown: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "generation failed"
    // Polar returns a 402/403 when the org is out of credits.
    if (/credit|quota|limit|402|403/i.test(msg)) {
      return NextResponse.json(
        { error: "out of AI credits — upgrade or wait for the next cycle" },
        { status: 402 },
      )
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
