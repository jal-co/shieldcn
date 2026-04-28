/**
 * shieldcn
 * app/api/gen-count/route.ts
 *
 * POST: increment the badge generation counter
 * GET:  return the current count
 */

import { NextResponse } from "next/server"
import { incrementGenCounter, getGenCount } from "@/lib/gen-counter"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const count = typeof body?.count === "number" ? Math.max(0, Math.floor(body.count)) : 0
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
