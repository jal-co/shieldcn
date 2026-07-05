"use client"

/**
 * shieldcn
 * components/brand-demo-badges.tsx
 *
 * Live demo badges for the brand editor. Renders real engine badges styled by
 * the brand's current config (color, theme, variant, font) so the preview is
 * keyed to the brand colors and updates as you edit — no save required.
 *
 * For a *saved* brand we pass ?brand=slug so hosted assets (logo/font) resolve;
 * otherwise we inline the config params directly for an instant preview.
 */

import { useMemo } from "react"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { useHydrated } from "@/lib/use-hydrated"
import type { BrandConfig } from "@shieldcn/core/brands"

const DEMOS: { path: string; alt: string; variant?: string }[] = [
  { path: "/badge/version-1.0.0.svg", alt: "version" },
  { path: "/badge/build-passing.svg", alt: "build" },
  { path: "/github/vercel/next.js/stars.svg", alt: "stars" },
  { path: "/npm/react.svg", alt: "npm" },
  { path: "/badge/license-MIT.svg", alt: "license" },
  // Force the secondary variant so the brand's secondary color is visible.
  { path: "/badge/secondary-color.svg", alt: "secondary", variant: "secondary" },
]

/**
 * Build a demo badge URL. Always emits the live editor config (variant/color/
 * theme/font) as explicit params so the preview reflects unsaved edits — these
 * win over the stored brand (query > brand). When the brand is saved we also
 * add `brand=slug` (to resolve hosted font) and, if a logo exists, `logo=brand`
 * so the brand mark shows in the reference badges.
 */
function demoUrl(
  path: string,
  config: BrandConfig,
  slug: string | undefined,
  saved: boolean,
  showLogo: boolean,
  variantOverride?: string,
): string {
  const p = new URLSearchParams()
  const variant = variantOverride ?? config.variant
  if (variant) p.set("variant", variant)
  if (config.theme) p.set("theme", config.theme)
  if (config.color) p.set("color", config.color)
  if (config.color2) p.set("color2", config.color2)
  if (config.font) p.set("font", config.font)
  if (saved && slug) {
    p.set("brand", slug)
    if (showLogo) p.set("logo", "brand")
  }
  const q = p.toString()
  return `${path}${q ? `?${q}` : ""}`
}

export function BrandDemoBadges({
  config,
  slug,
  saved,
  hasLogo = false,
  rev = 0,
}: {
  config: BrandConfig
  slug?: string
  saved: boolean
  /** True when a brand mark/logo is stored, so we add logo=brand to the demos. */
  hasLogo?: boolean
  /** Bump to cache-bust the preview after a logo/color change. */
  rev?: number
}) {
  const { adaptUrl } = useBadgeMode()
  const mounted = useHydrated()

  const urls = useMemo(
    () => DEMOS.map((d) => {
      const base = demoUrl(d.path, config, slug, saved, hasLogo, d.variant)
      const url = rev ? `${base}${base.includes("?") ? "&" : "?"}r=${rev}` : base
      return { ...d, url }
    }),
    [config, slug, saved, hasLogo, rev],
  )

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-4">
      {urls.map((d) =>
        mounted ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={d.path} src={adaptUrl(d.url)} alt={d.alt} className="h-6 w-auto" />
        ) : (
          <span key={d.path} className="h-6 w-20 animate-pulse rounded bg-muted" />
        ),
      )}
    </div>
  )
}
