/**
 * @shieldcn/core
 * src/providers/fdroid
 *
 * F-Droid API client.
 * Supports: version.
 *
 * Uses the public F-Droid API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getFDroidVersion(appId: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "fdroid",
    cacheKey: `app:${appId}`,
    url: `https://f-droid.org/api/v1/packages/${encodeURIComponent(appId)}`,
    ttl: 3600,
  })
  if (!data) return null

  const packages = data.packages as Array<Record<string, unknown>> | undefined
  if (!packages || packages.length === 0) return null

  // First package is the latest version
  const version = packages[0].versionName as string | undefined

  return {
    label: "f-droid",
    value: version ? `v${version}` : "unknown",
    link: `https://f-droid.org/packages/${appId}/`,
  }
}
