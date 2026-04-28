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
  pypi: "3775A9",
  crates: "dea584",
  docker: "2496ED",
  bluesky: "0085FF",
  jsr: "F7DF1E",
  bundlephobia: "4E4E4E",
  youtube: "FF0000",
  vscode: "007ACC",
  opencollective: "7FADF2",
  hackernews: "FF6600",
  mastodon: "6364FF",
  lemmy: "00BC8C",
  packagist: "F28D1A",
  rubygems: "E9573F",
  nuget: "004880",
  pub: "0175C2",
  homebrew: "FBB040",
  maven: "C71A36",
  cocoapods: "EE3322",
  twitch: "9146FF",
  codecov: "F01F7A",
  wakatime: "000000",
  tokscale: "0073FF",
  indiedevs: "818CF8",
}

/**
 * Get brand color for a provider.
 */
export function getProviderBrandColor(provider: string): string | undefined {
  return providerBrandColors[provider]
}
