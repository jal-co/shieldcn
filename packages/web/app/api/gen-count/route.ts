/**
 * shieldcn
 * app/api/gen-count/route.ts
 *
 * POST: increment the badge generation counter
 * GET:  return the current count
 */

import { NextResponse } from "next/server"
import { incrementGenCounter, getGenCount } from "@shieldcn/core/gen-counter"
import { checkRateLimit, getClientIdentifier } from "@shieldcn/core/rate-limit"

/** A single generation run enables at most a few dozen badges — well above
 * any real count, but far below what an inflate-the-counter script would send. */
const MAX_COUNT_PER_REQUEST = 100

export async function POST(request: Request) {
  const limit = await checkRateLimit("gen-count", getClientIdentifier(request), { max: 30, windowMs: 60_000 })
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  try {
    const body = await request.json()
    const count = typeof body?.count === "number" ? Math.max(0, Math.min(MAX_COUNT_PER_REQUEST, Math.floor(body.count))) : 0
    if (count > 0) {
      await incrementGenCounter(count)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // fail silently
  }
}

export async function GET() {
  const count = await getGenCount()
  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  )
}
