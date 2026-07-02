/**
 * @shieldcn/engine
 * app/api/health/route.ts
 *
 * Health check endpoint for Docker healthchecks and monitoring.
 */

import { getPoolStats } from "@shieldcn/core/token-pool"
import { query } from "@shieldcn/core/db"
import pkg from "../../../package.json" with { type: "json" }

export async function GET() {
  // getPoolStats() swallows its own DB errors and returns zeros on failure —
  // useful for badge-serving (never let a stats read break a request), but
  // it means the health check needs its own explicit ping to actually detect
  // a down database rather than reporting ok:true with an empty-looking pool.
  let dbOk = true
  try {
    await query("SELECT 1")
  } catch {
    dbOk = false
  }

  const pool = await getPoolStats()

  return Response.json(
    { ok: dbOk, engine: "shieldcn", version: pkg.version, db: dbOk ? "up" : "down", pool },
    { status: dbOk ? 200 : 503 },
  )
}
