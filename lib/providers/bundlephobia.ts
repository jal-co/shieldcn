/**
 * shieldcn
 * lib/providers/bundlephobia
 *
 * Bundlephobia API client for npm package bundle size.
 * Supports: minified size, minified+gzipped size, tree-shaking.
 */

import type { BadgeData } from "@/lib/badges/types"

async function bundleFetch(pkg: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(
      `https://bundlephobia.com/api/size?package=${encodeURIComponent(pkg)}`,
      { next: { revalidate: 86400 } } // cache for 24h — bundle sizes rarely change
    )
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} kB`
  }
  return `${bytes} B`
}

// ---------------------------------------------------------------------------
// Minified size
// ---------------------------------------------------------------------------

export async function getBundleMin(pkg: string): Promise<BadgeData | null> {
  const data = await bundleFetch(pkg)
  if (!data || typeof data.size !== "number") return null

  return {
    label: "minified",
    value: formatBytes(data.size as number),
    link: `https://bundlephobia.com/package/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Minified + gzipped size
// ---------------------------------------------------------------------------

export async function getBundleMinGzip(pkg: string): Promise<BadgeData | null> {
  const data = await bundleFetch(pkg)
  if (!data || typeof data.gzip !== "number") return null

  return {
    label: "minzipped",
    value: formatBytes(data.gzip as number),
    link: `https://bundlephobia.com/package/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Tree-shaking support
// ---------------------------------------------------------------------------

export async function getBundleTreeShaking(pkg: string): Promise<BadgeData | null> {
  const data = await bundleFetch(pkg)
  if (!data) return null

  const treeshake = data.hasJSModule || data.hasJSNext || data.isModuleType

  return {
    label: "tree shaking",
    value: treeshake ? "supported" : "not supported",
    color: treeshake ? "green" : "red",
    link: `https://bundlephobia.com/package/${pkg}`,
  }
}
