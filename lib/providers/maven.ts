/**
 * shieldcn
 * lib/providers/maven
 *
 * Maven Central API client.
 * Supports: version.
 */

import type { BadgeData } from "@/lib/badges/types"

// ---------------------------------------------------------------------------
// Version (latest from Maven Central)
// ---------------------------------------------------------------------------

export async function getMavenVersion(groupId: string, artifactId: string): Promise<BadgeData | null> {
  try {
    const r = await fetch(
      `https://search.maven.org/solrsearch/select?q=g:${encodeURIComponent(groupId)}+AND+a:${encodeURIComponent(artifactId)}&rows=1&wt=json`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    const data = await r.json()

    const docs = data?.response?.docs as Array<Record<string, unknown>> | undefined
    if (!docs || docs.length === 0) return null

    const version = docs[0].latestVersion as string | undefined
    return {
      label: "maven central",
      value: version ? `v${version}` : "unknown",
      link: `https://search.maven.org/artifact/${groupId}/${artifactId}`,
    }
  } catch {
    return null
  }
}
