/**
 * shieldcn
 * lib/badges/custom-icons
 *
 * Custom SVG icons shipped with shieldcn for providers/brands
 * not available in SimpleIcons or React Icons.
 *
 * Each entry uses the same IconData format as the rest of the icon pipeline.
 */

import type { IconData } from "./icons"

interface CustomIcon {
  icon: IconData
  /** Default brand color (hex without #) */
  color: string
}

const customIcons: Record<string, CustomIcon> = {
  indiedevs: {
    icon: {
      viewBox: "0 0 24 24",
      paths: [
        "m18 16 4-4-4-4",
        "m6 8-4 4 4 4",
        "m14.5 4-5 16",
      ],
      path: "m18 16 4-4-4-4 m6 8-4 4 4 4 m14.5 4-5 16",
      isStroke: true,
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      rotation: 45,
    },
    color: "818CF8", // indigo-400
  },
}

/**
 * Look up a custom icon by slug.
 * Returns null if not found.
 */
export function getCustomIcon(
  slug: string
): { icon: IconData; defaultColor: string } | null {
  const entry = customIcons[slug.toLowerCase()]
  if (!entry) return null

  return {
    icon: entry.icon,
    defaultColor: entry.color,
  }
}

/**
 * Check if a slug matches a custom icon.
 */
export function hasCustomIcon(slug: string): boolean {
  return slug.toLowerCase() in customIcons
}
