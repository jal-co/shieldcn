/**
 * shieldcn
 * lib/context-dev.ts
 *
 * Server-side wrapper around Context.dev's Brand Intelligence API. Turns a
 * domain / company name / work email / stock ticker into a normalized brand
 * profile (title, description, palette, light + dark logos, socials) that the
 * brand importer maps into a shieldcn brand + brand.md.
 *
 * - Key is read from CONTEXT_DEV_API_KEY (server only; never exposed to the
 *   browser).
 * - Successful lookups are cached 7 days in the shared two-tier cache, because
 *   each call costs credits and brand data rarely changes.
 * - Transient 408 (cold-hit) and 429 (rate limit) responses are retried with
 *   exponential backoff. A not-found brand resolves to null (graceful
 *   fallback), never a throw.
 */

import ContextDev from "context.dev"
import { cacheGet, cacheSet } from "@shieldcn/core/cache"

/** One of these identifies the brand to look up. */
export interface BrandLookup {
  domain?: string
  name?: string
  email?: string
  ticker?: string
  isin?: string
}

export interface BrandColor {
  hex: string
  name?: string
}

/** Normalized brand profile the rest of the app consumes. */
export interface BrandProfile {
  domain?: string
  title?: string
  description?: string
  slogan?: string
  /** Ordered brand palette (primary first). */
  colors: BrandColor[]
  /** Best logo for light backgrounds (dark-ink logo). */
  lightLogoUrl?: string
  /** Best logo for dark backgrounds (light-ink logo). */
  darkLogoUrl?: string
  /** Square icon/mark, if distinct from the wordmark logo. */
  iconUrl?: string
  socials: { type: string; url: string }[]
  primaryLanguage?: string
}

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
/** Cap the upstream retry latency; brand import is user-initiated. */
const MAX_RETRIES = 3

let client: ContextDev | null = null
function getClient(): ContextDev | null {
  const apiKey = process.env.CONTEXT_DEV_API_KEY
  if (!apiKey) return null
  if (!client) client = new ContextDev({ apiKey })
  return client
}

export const contextDevConfigured = Boolean(process.env.CONTEXT_DEV_API_KEY)

/** Stable cache key for a lookup (first provided identifier wins). */
function lookupKey(lookup: BrandLookup): string | null {
  if (lookup.domain) return `domain:${lookup.domain.toLowerCase()}`
  if (lookup.email) return `email:${lookup.email.toLowerCase()}`
  if (lookup.ticker) return `ticker:${lookup.ticker.toUpperCase()}`
  if (lookup.isin) return `isin:${lookup.isin.toUpperCase()}`
  if (lookup.name) return `name:${lookup.name.toLowerCase()}`
  return null
}

export interface RawBrand {
  domain?: string
  title?: string
  description?: string
  slogan?: string
  colors?: { hex?: string; name?: string }[]
  logos?: {
    url?: string
    mode?: "light" | "dark" | "has_opaque_background"
    type?: "icon" | "logo"
  }[]
  socials?: { type?: string; url?: string }[]
  primary_language?: string
}

/**
 * Normalize a raw Context.dev brand record into our BrandProfile. Exported for
 * unit testing (the pure mapping is the interesting logic).
 */
export function normalizeBrand(brand: RawBrand): BrandProfile {
  const logos = brand.logos ?? []
  const pick = (
    predicate: (l: NonNullable<RawBrand["logos"]>[number]) => boolean,
  ) => logos.find((l) => l.url && predicate(l))?.url

  // Prefer a full wordmark ("logo") over a square "icon" for the main logo,
  // and use logo mode to choose the light/dark-background variant.
  const lightLogoUrl =
    pick((l) => l.type === "logo" && l.mode === "light") ??
    pick((l) => l.mode === "light") ??
    pick((l) => l.mode === "has_opaque_background") ??
    pick((l) => l.type === "logo") ??
    logos[0]?.url
  const darkLogoUrl =
    pick((l) => l.type === "logo" && l.mode === "dark") ??
    pick((l) => l.mode === "dark") ??
    pick((l) => l.mode === "has_opaque_background")
  const iconUrl = pick((l) => l.type === "icon")

  return {
    domain: brand.domain,
    title: brand.title,
    description: brand.description,
    slogan: brand.slogan,
    colors: (brand.colors ?? [])
      .filter((c): c is { hex: string; name?: string } => Boolean(c.hex))
      .map((c) => ({ hex: c.hex, name: c.name })),
    lightLogoUrl,
    darkLogoUrl,
    iconUrl,
    socials: (brand.socials ?? [])
      .filter((s): s is { type: string; url: string } => Boolean(s.type && s.url))
      .map((s) => ({ type: s.type, url: s.url })),
    primaryLanguage: brand.primary_language,
  }
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  return status === 408 || status === 429
}

/** Call the right Context.dev method for whichever identifier was provided. */
async function fetchRaw(
  c: ContextDev,
  lookup: BrandLookup,
): Promise<RawBrand | null> {
  // The SDK's Brand type is a superset with narrower enums; we only read a
  // handful of fields, so cast at this single boundary.
  let res: { brand?: unknown }
  if (lookup.domain) res = await c.brand.retrieve({ domain: lookup.domain })
  else if (lookup.email) res = await c.brand.retrieveByEmail({ email: lookup.email })
  else if (lookup.ticker) res = await c.brand.retrieveByTicker({ ticker: lookup.ticker })
  else if (lookup.isin) res = await c.brand.retrieveByIsin({ isin: lookup.isin })
  else if (lookup.name) res = await c.brand.retrieveByName({ name: lookup.name })
  else return null
  return (res.brand as RawBrand | undefined) ?? null
}

/**
 * Resolve a brand profile for a lookup. Returns null when Context.dev isn't
 * configured, the brand isn't found, or the input is invalid (e.g. a free/
 * disposable email → 422). Never throws for the caller.
 */
export async function getBrandProfile(
  lookup: BrandLookup,
): Promise<BrandProfile | null> {
  const c = getClient()
  const key = lookupKey(lookup)
  if (!c || !key) return null

  const cacheKey = `contextdev:${key}`
  const cached = await cacheGet<BrandProfile>(cacheKey)
  if (cached) return cached

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const raw = await fetchRaw(c, lookup)
      if (!raw) return null
      const profile = normalizeBrand(raw)
      await cacheSet(cacheKey, profile, CACHE_TTL_SECONDS)
      return profile
    } catch (err) {
      if (isRetryable(err) && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
        continue
      }
      // Not-found / validation / auth errors: fail soft to null so the import
      // UI can show "brand not found" rather than a 500.
      return null
    }
  }
  return null
}

/**
 * Render a brand profile as a brand.md document — the human-editable,
 * portable representation. The DB record stays canonical; this is the
 * import/export view of it.
 */
export function brandProfileToMarkdown(profile: BrandProfile): string {
  const lines: string[] = []
  lines.push(`# ${profile.title ?? profile.domain ?? "Brand"}`)
  lines.push("")
  if (profile.slogan) lines.push(`> ${profile.slogan}`, "")
  if (profile.description) lines.push(profile.description, "")

  if (profile.domain) lines.push(`- **Domain:** ${profile.domain}`)
  if (profile.primaryLanguage) lines.push(`- **Language:** ${profile.primaryLanguage}`)
  lines.push("")

  if (profile.colors.length) {
    lines.push("## Palette", "")
    for (const c of profile.colors) {
      lines.push(`- \`${c.hex}\`${c.name ? ` — ${c.name}` : ""}`)
    }
    lines.push("")
  }

  lines.push("## Logos", "")
  if (profile.lightLogoUrl) lines.push(`- **Light background:** ${profile.lightLogoUrl}`)
  if (profile.darkLogoUrl) lines.push(`- **Dark background:** ${profile.darkLogoUrl}`)
  if (profile.iconUrl) lines.push(`- **Icon / mark:** ${profile.iconUrl}`)
  lines.push("")

  if (profile.socials.length) {
    lines.push("## Socials", "")
    for (const s of profile.socials) lines.push(`- **${s.type}:** ${s.url}`)
    lines.push("")
  }

  return lines.join("\n").trim() + "\n"
}
