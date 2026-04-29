/**
 * @shieldcn/engine
 * app/api/health/route.ts
 *
 * Health check endpoint for Docker healthchecks and monitoring.
 */

import { getPoolStats } from "@shieldcn/core/token-pool"

export async function GET() {
  const pool = await getPoolStats()
  return Response.json({
    ok: true,
    engine: "shieldcn",
    version: "0.0.1",
    pool,
  })
}
