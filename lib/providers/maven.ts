/**
 * shieldcn
 * lib/providers/maven
 *
 * Maven Central API client.
 * Supports: version.
 */

import type { BadgeData } from "@/lib/badges/types"
import { providerFetch } from "@/lib/provider-fetch"

// ---------------------------------------------------------------------------
// Version (latest from Maven Central)
// ---------------------------------------------------------------------------

export async function getMavenVersion(groupId: string, artifactId: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "maven",
    cacheKey: `v:${groupId}:${artifactId}`,
    url: `https://search.maven.org/solrsearch/select?q=g:${encodeURIComponent(groupId)}+AND+a:${encodeURIComponent(artifactId)}&rows=1&wt=json`,
    ttl: 3600,
  })
  if (!data) return null

  const response = data.response as Record<string, unknown> | undefined
  const docs = response?.docs as Array<Record<string, unknown>> | undefined
  if (!docs || docs.length === 0) return null

  const version = docs[0].latestVersion as string | undefined
  return {
    label: "maven central",
    value: version ? `v${version}` : "unknown",
    link: `https://search.maven.org/artifact/${groupId}/${artifactId}`,
  }
}
