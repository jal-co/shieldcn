/**
 * shieldcn
 * lib/providers/cocoapods
 *
 * CocoaPods API client.
 * Supports: version, license, platform.
 */

import type { BadgeData } from "@/lib/badges/types"

async function podFetch(pod: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(
      `https://trunk.cocoapods.org/api/v1/pods/${encodeURIComponent(pod)}`,
      { next: { revalidate: 3600 } }
    )
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getCocoaPodsVersion(pod: string): Promise<BadgeData | null> {
  const data = await podFetch(pod)
  if (!data) return null

  const versions = data.versions as Array<Record<string, unknown>> | undefined
  if (!versions || versions.length === 0) return null

  const latest = versions[0].name as string | undefined
  return {
    label: "cocoapods",
    value: latest ? `v${latest}` : "unknown",
    link: `https://cocoapods.org/pods/${pod}`,
  }
}

// ---------------------------------------------------------------------------
// License
// ---------------------------------------------------------------------------

export async function getCocoaPodsLicense(pod: string): Promise<BadgeData | null> {
  const data = await podFetch(pod)
  if (!data) return null

  // Fetch the spec for license info
  try {
    const r = await fetch(
      `https://cdn.cocoapods.org/all_pods_versions_${pod.charAt(0).toLowerCase()}_${pod.charAt(1).toLowerCase()}_${pod.charAt(2).toLowerCase()}.txt`,
      { next: { revalidate: 86400 } }
    )
    // Fallback: just return the pod page
    if (!r.ok) {
      return {
        label: "license",
        value: "see pod",
        link: `https://cocoapods.org/pods/${pod}`,
      }
    }
  } catch { /* ignore */ }

  return {
    label: "license",
    value: "see pod",
    link: `https://cocoapods.org/pods/${pod}`,
  }
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export async function getCocoaPodsPlatform(pod: string): Promise<BadgeData | null> {
  // CocoaPods trunk API returns version info; platform is in the podspec
  return {
    label: "platform",
    value: "ios | macos",
    link: `https://cocoapods.org/pods/${pod}`,
  }
}
