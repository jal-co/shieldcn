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
  openpanel: {
    icon: {
      viewBox: "0 0 61 35",
      paths: [
        "M34.0269 5.5413C34.0269 2.6843 36.3432 0.368164 39.2002 0.368164C42.0572 0.368164 44.3743 2.6843 44.3743 5.5413V29.4206C44.3743 32.2776 42.0572 34.594 39.2002 34.594C36.3432 34.594 34.0269 32.2776 34.0269 29.4206V5.5413Z",
        "M49.9458 5.5413C49.9458 2.6843 52.2621 0.368164 55.1191 0.368164C57.9761 0.368164 60.2932 2.6843 60.2932 5.5413V12.7059C60.2932 15.5629 57.9761 17.8791 55.1191 17.8791C52.2621 17.8791 49.9458 15.5629 49.9458 12.7059V5.5413Z",
        "M14.212 0C6.36293 0 0 6.36293 0 14.212V20.02C0 27.8691 6.36293 34.232 14.212 34.232C22.0611 34.232 28.424 27.8691 28.424 20.02V14.212C28.424 6.36293 22.0611 0 14.212 0ZM14.2379 8.35999C11.3805 8.35999 9.06419 10.6763 9.06419 13.5337V20.6971C9.06419 23.5545 11.3805 25.8708 14.2379 25.8708C17.0953 25.8708 19.4116 23.5545 19.4116 20.6971V13.5337C19.4116 10.6763 17.0953 8.35999 14.2379 8.35999Z",
      ],
      path: "",
      fillRule: "evenodd",
    },
    color: "2564EB",
  },
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
