/**
 * shieldcn
 * lib/normalize-params
 *
 * Normalizes and sorts query parameters to maximize edge cache hits.
 * ?variant=outline&mode=light&size=lg and ?size=lg&mode=light&variant=outline
 * produce the same badge but are different cache keys without normalization.
 *
 * Also strips default-valued and empty params so the canonical URL is
 * minimal. Params outside the known set (e.g. provider-specific ones like
 * chart's `values`/`days`/`icon`) are passed through unchanged — there's no
 * single allowlist that covers every provider's query params, so this
 * intentionally doesn't attempt one.
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
