/**
 * shieldcn
 * app/api/ai/polish/route.ts
 *
 * Rewrite/polish a selected block of README prose. Plus+ only; metered via Polar.
 */

import { NextResponse, type NextRequest } from "next/server"
import { generateText } from "ai"
import { requireOwner } from "@/lib/auth"
import { hasPlan } from "@shieldcn/core/entitlements"
import { aiModel, meterAiUsage, aiErrorResponse, aiConfigured } from "@/lib/ai"

const SYSTEM = `You improve README prose. Return only the rewritten text with no
commentary, preserving the author's meaning and any Markdown formatting. Make it
clearer and tighter; do not add new claims.`

export async function POST(req: NextRequest) {
  if (!aiConfigured) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 })
  }
  const auth = await requireOwner()
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (!(await hasPlan(auth.ownerId, "plus"))) {
    return NextResponse.json({ error: "AI requires the Plus plan" }, { status: 402 })
  }

  let body: { text?: string; instruction?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  const text = (body.text ?? "").slice(0, 6000)
  if (!text.trim()) return NextResponse.json({ error: "missing text" }, { status: 400 })

  try {
    const { text: out, usage } = await generateText({
      model: aiModel(),
      system: SYSTEM,
      prompt: body.instruction
        ? `${body.instruction}\n\n---\n${text}`
        : `Polish this:\n\n---\n${text}`,
    })
    meterAiUsage(auth.ownerId, usage)
    return NextResponse.json({ text: out })
  } catch (err) {
    const { error, status } = aiErrorResponse(err)
    return NextResponse.json({ error }, { status })
  }
}
