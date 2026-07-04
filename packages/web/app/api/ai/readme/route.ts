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
import { aiModel, meterAiUsage, aiErrorResponse, aiConfigured } from "@/lib/ai"

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
    const { text, usage } = await generateText({
      model: aiModel(),
      system: SYSTEM,
      prompt: `Write a README for this project:\n\n${context}`,
    })
    meterAiUsage(auth.ownerId, usage)
    return NextResponse.json({ markdown: text })
  } catch (err) {
    const { error, status } = aiErrorResponse(err)
    return NextResponse.json({ error }, { status })
  }
}
