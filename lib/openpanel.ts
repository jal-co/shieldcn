/**
 * shieldcn
 * lib/openpanel
 *
 * OpenPanel server-side tracking.
 * Requires NEXT_PUBLIC_OPENPANEL_CLIENT_ID and OPENPANEL_CLIENT_SECRET env vars.
 */

import { OpenPanel } from "@openpanel/nextjs"

const clientId = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID
const clientSecret = process.env.OPENPANEL_CLIENT_SECRET

export const opServer =
  clientId && clientSecret
    ? new OpenPanel({ clientId, clientSecret })
    : null

interface TrackEventOptions {
  name: string
  data?: Record<string, string | number | boolean>
}

export async function trackEvent({ name, data }: TrackEventOptions): Promise<void> {
  if (!opServer) return

  try {
    await opServer.track(name, data ?? {})
  } catch {
    // Silently fail — don't block responses for analytics
  }
}
