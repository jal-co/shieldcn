/**
 * shieldcn
 * lib/normalize-params
 *
 * Normalizes and sorts query parameters to maximize edge cache hits.
 * ?variant=outline&mode=light&size=lg and ?size=lg&mode=light&variant=outline
 * produce the same badge but are different cache keys without normalization.
 *
 * Also strips unknown/default params so the canonical URL is minimal.
 */

/** Default values — if a param matches its default, strip it. */
const DEFAULTS: Record<string, string> = {
  variant: "default",
  style: "default",
  size: "sm",
  mode: "dark",
  font: "inter",
  split: "false",
  statusDot: "auto",
  labelOpacity: "0.7",
}

/** Known badge params (anything else is passed through). */
const KNOWN_PARAMS = new Set([
  "variant", "style", "size", "mode", "theme", "font",
  "split", "statusDot", "logo", "logoColor",
  "color", "labelColor", "valueColor", "labelTextColor",
  "label", "labelOpacity",
  "height", "fontSize", "radius", "padX", "iconSize", "gap", "labelGap",
  // provider-specific
  "workflow", "branch",
  // dynamic badge
  "url", "query", "prefix", "suffix",
])

/**
 * Normalize search params: sort alphabetically, strip defaults.
 * Returns a new URLSearchParams with canonical ordering.
 */
export function normalizeSearchParams(params: URLSearchParams): URLSearchParams {
  const normalized = new URLSearchParams()

  // Collect all entries, normalize style → variant alias
  const entries: [string, string][] = []
  for (const [key, value] of params.entries()) {
    // Normalize "style" alias to "variant"
    const normalizedKey = key === "style" ? "variant" : key

    // Skip params that match their default value
    if (DEFAULTS[normalizedKey] === value) continue

    // Skip empty values
    if (!value) continue

    entries.push([normalizedKey, value])
  }

  // Sort alphabetically by key, then by value for deterministic order
  entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))

  for (const [key, value] of entries) {
    normalized.set(key, value)
  }

  return normalized
}

/**
 * Build a canonical cache key from the URL path + normalized params.
 */
export function buildCacheKey(path: string, params: URLSearchParams): string {
  const normalized = normalizeSearchParams(params)
  const qs = normalized.toString()
  return qs ? `${path}?${qs}` : path
}
