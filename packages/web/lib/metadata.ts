/**
 * shieldcn
 * lib/metadata
 *
 * Shared metadata helpers for SEO-optimized per-page OG tags.
 * Uses the static og.png (which has real shieldcn badges baked in).
 */

import type { Metadata } from "next"

const SITE_URL = "https://shieldcn.dev"
const OG_IMAGE = `${SITE_URL}/og.png`

interface PageMeta {
  title: string
  description: string
  path?: string
  /** Override the OG title (defaults to `${title} — shieldcn`) */
  ogTitle?: string
}

export function pageMetadata({
  title,
  description,
  path = "",
  ogTitle,
}: PageMeta): Metadata {
  const url = `${SITE_URL}${path}`
  const resolvedOgTitle = ogTitle || `${title} — shieldcn`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      siteName: "shieldcn",
      title: resolvedOgTitle,
      description,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: resolvedOgTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedOgTitle,
      description,
      images: [OG_IMAGE],
    },
  }
}
