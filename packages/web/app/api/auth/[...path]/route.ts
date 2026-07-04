/**
 * shieldcn
 * app/api/auth/[...path]/route.ts
 *
 * Neon Auth API proxy. All client auth calls (sign-in, sign-up, social,
 * session, organization) route through here and are proxied to the hosted
 * Neon Auth service, with session cookies signed for our own domain.
 *
 * Team-creation cap: org creation is intercepted so a user can create only a
 * limited number of teams (more come via invitation). The check + record run
 * against our own Postgres ledger, since team ownership lives in the hosted
 * store and isn't cheaply queryable there.
 */

import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/lib/auth/server"
import { canCreateTeam, recordTeamCreation } from "@shieldcn/core/teams"

const handlers = auth.handler()

export const GET = handlers.GET

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  // Gate + ledger team creation.
  if (req.nextUrl.pathname.endsWith("/organization/create")) {
    const { data } = await auth.getSession().catch(() => ({ data: null }))
    const userId = data?.user?.id
    if (userId) {
      if (!(await canCreateTeam(userId))) {
        return NextResponse.json(
          { message: "You can only create one team. To join more, ask to be invited." },
          { status: 403 },
        )
      }
      const res = await handlers.POST(req, ctx)
      // Record the created org so it counts against the cap. Best-effort; a
      // failure here never fails the create the user already completed.
      if (res.ok) {
        try {
          const created = (await res.clone().json()) as { id?: string }
          if (created?.id) await recordTeamCreation(created.id, userId)
        } catch {
          /* ignore — response wasn't JSON or had no id */
        }
      }
      return res
    }
  }

  return handlers.POST(req, ctx)
}
