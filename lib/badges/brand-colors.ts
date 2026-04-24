/**
 * shieldcn
 * lib/badges/brand-colors
 *
 * Brand colors for providers and icons.
 * Used by the "branded" variant to set background color.
 */

/**
 * Provider brand colors (hex without #).
 * These are the official brand colors from SimpleIcons.
 */
export const providerBrandColors: Record<string, string> = {
  npm: "CB3837",
  github: "181717",
  discord: "5865F2",
  reddit: "FF4500",
}

/**
 * Get brand color for a provider.
 */
export function getProviderBrandColor(provider: string): string | undefined {
  return providerBrandColors[provider]
}
