/**
 * shieldcn
 * app/api/gen-users/route.ts
 *
 * POST: track a generator user (owner/repo)
 * GET:  return recent generator users for avatar stack
 */

import { NextResponse } from "next/server"
import { trackGenUser, getRecentGenUsers } from "@shieldcn/core/gen-users"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { owner, repo, badgeCount } = body ?? {}
    if (typeof owner === "string" && typeof repo === "string" && owner && repo) {
      const count = typeof badgeCount === "number" ? Math.max(0, Math.floor(badgeCount)) : 1
      await trackGenUser(owner, repo, count)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  const users = await getRecentGenUsers(30)
  return NextResponse.json(
    { users },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  )
}
