/**
 * shieldcn
 * lib/polar-meter.ts
 *
 * Thin wrapper over Polar event ingestion for non-LLM meters (e.g. one event
 * per migration PR opened). Best-effort: metering a usage event must never
 * fail the underlying action.
 */

import { Polar } from "@polar-sh/sdk"

const accessToken = process.env.POLAR_ACCESS_TOKEN
const server = (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox"

let client: Polar | null = null
function getClient(): Polar | null {
  if (!accessToken) return null
  if (!client) client = new Polar({ accessToken, server })
  return client
}

/**
 * Ingest a single usage event against a meter for the given org (external
 * customer id). Swallows all errors.
 */
export async function meterEvent(
  orgId: string,
  name: string,
  metadata: Record<string, string | number | boolean> = {},
): Promise<void> {
  const c = getClient()
  if (!c) return
  try {
    await c.events.ingest({
      events: [{ name, externalCustomerId: orgId, metadata }],
    })
  } catch {
    /* metering is best-effort */
  }
}
