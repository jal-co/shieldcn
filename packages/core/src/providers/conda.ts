/**
 * @shieldcn/core
 * src/providers/conda
 *
 * Anaconda (Conda) API client.
 * Supports: version, downloads, platform.
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function condaFetch(channel: string, pkg: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "conda",
    cacheKey: `${channel}:${pkg}`,
    url: `https://api.anaconda.org/package/${encodeURIComponent(channel)}/${encodeURIComponent(pkg)}`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

export async function getCondaVersion(channel: string, pkg: string): Promise<BadgeData | null> {
  const data = await condaFetch(channel, pkg)
  if (!data) return null
  const version = data.latest_version as string | undefined
  if (!version) return null

  return {
    label: "conda",
    value: `v${version}`,
    link: `https://anaconda.org/${channel}/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Downloads
// ---------------------------------------------------------------------------

export async function getCondaDownloads(channel: string, pkg: string): Promise<BadgeData | null> {
  const data = await condaFetch(channel, pkg)
  if (!data) return null

  const files = data.files as Array<Record<string, unknown>> | undefined
  if (!files) return null

  let total = 0
  for (const file of files) {
    total += (file.ndownloads as number) ?? 0
  }

  return {
    label: "downloads",
    value: formatCount(total),
    link: `https://anaconda.org/${channel}/${pkg}`,
  }
}

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export async function getCondaPlatform(channel: string, pkg: string): Promise<BadgeData | null> {
  const data = await condaFetch(channel, pkg)
  if (!data) return null

  const platforms = data.conda_platforms as string[] | undefined
  if (!platforms || platforms.length === 0) return null

  return {
    label: "platform",
    value: platforms.join(" | "),
    link: `https://anaconda.org/${channel}/${pkg}`,
  }
}
