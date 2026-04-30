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
  openpanel: "2564EB",
  gitlab: "FC6D26",
  conda: "44A833",
  chrome: "4285F4",
  amo: "FF7139",
  coveralls: "3F5767",
  sonar: "4E9BCD",
  jsdelivr: "E84D3D",
  chocolatey: "80B5E3",
  flathub: "4A86CF",
  snapcraft: "82BEA0",
  fdroid: "1976D2",
  discourse: "231F20",
  stackexchange: "F58025",
  modrinth: "1BD96A",
  openvsx: "C160EF",
  liberapay: "F6C915",
  matrix: "000000",
  weblate: "2ECCAA",
}

/**
 * Get brand color for a provider.
 */
export function getProviderBrandColor(provider: string): string | undefined {
  return providerBrandColors[provider]
}
