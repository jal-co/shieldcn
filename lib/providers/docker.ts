/**
 * shieldcn
 * lib/providers/docker
 *
 * Docker Hub API client.
 * Supports: pulls, stars, version (latest tag).
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"

async function dockerFetch(url: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

function repoUrl(image: string): string {
  return `https://hub.docker.com/r/${image}`
}

/**
 * Normalize image name: if no slash, prefix "library/" for official images.
 */
function normalizeImage(image: string): string {
  return image.includes("/") ? image : `library/${image}`
}

// ---------------------------------------------------------------------------
// Pulls
// ---------------------------------------------------------------------------

export async function getDockerPulls(image: string): Promise<BadgeData | null> {
  const normalized = normalizeImage(image)
  const data = await dockerFetch(`https://hub.docker.com/v2/repositories/${normalized}`)
  if (!data || typeof data.pull_count !== "number") return null

  return {
    label: "docker pulls",
    value: formatCount(data.pull_count as number),
    link: repoUrl(normalized),
  }
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

export async function getDockerStars(image: string): Promise<BadgeData | null> {
  const normalized = normalizeImage(image)
  const data = await dockerFetch(`https://hub.docker.com/v2/repositories/${normalized}`)
  if (!data || typeof data.star_count !== "number") return null

  return {
    label: "docker stars",
    value: formatCount(data.star_count as number),
    link: repoUrl(normalized),
  }
}

// ---------------------------------------------------------------------------
// Version (latest tag)
// ---------------------------------------------------------------------------

export async function getDockerVersion(image: string): Promise<BadgeData | null> {
  const normalized = normalizeImage(image)
  const data = await dockerFetch(
    `https://hub.docker.com/v2/repositories/${normalized}/tags?page_size=1&ordering=last_updated`
  )
  if (!data) return null
  const results = data.results as Array<Record<string, unknown>> | undefined
  const tag = results?.[0]?.name as string | undefined

  return {
    label: "docker",
    value: tag || "latest",
    link: repoUrl(normalized),
  }
}

// ---------------------------------------------------------------------------
// Image size
// ---------------------------------------------------------------------------

export async function getDockerSize(image: string, tag: string = "latest"): Promise<BadgeData | null> {
  const normalized = normalizeImage(image)
  const data = await dockerFetch(
    `https://hub.docker.com/v2/repositories/${normalized}/tags/${tag}`
  )
  if (!data) return null

  const size = data.full_size as number | undefined
  if (!size) return null

  const mb = (size / 1024 / 1024).toFixed(1)
  return {
    label: "image size",
    value: `${mb} MB`,
    link: repoUrl(normalized),
  }
}
