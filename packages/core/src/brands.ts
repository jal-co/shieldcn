/**
 * @shieldcn/core
 * src/brands.ts
 *
 * Stored brands: named, reusable badge/header style tokens referenced by URL
 * (?brand=slug or /b/{slug}/...). Editing a brand's config re-styles every
 * embed that references it on the next fetch.
 *
 * Resolution is read-hot and write-cold, so lookups go through the two-tier
 * cache with a short TTL (updates propagate through GitHub's Camo proxy in
 * minutes). Resolution is fail-open: an unknown or deleted brand renders the
 * badge with defaults and never breaks the image.
 */

import { query, initDB } from "./db"
import { cacheGet, cacheSet } from "./cache"

/** Style keys a brand may carry. Kept in sync with the badge/header params. */
const BRAND_PARAM_KEYS = [
  "theme", "color", "labelColor", "valueColor", "labelTextColor",
  "font", "variant", "radius", "logo", "logoColor", "gradient", "mode",
  "labelOpacity", "size",
] as const

export type BrandConfig = Partial<Record<(typeof BRAND_PARAM_KEYS)[number], string>>

/** A single palette entry (hex without required name). */
export interface BrandPaletteColor {
  hex: string
  name?: string
}

/**
 * The human brand identity (imported from Context.dev / edited on-site).
 * Distinct from `config`, which is the badge/header style tokens.
 */
export interface BrandProfile {
  title?: string
  description?: string
  slogan?: string
  domain?: string
  palette?: BrandPaletteColor[]
}

export interface Brand {
  id: number
  slug: string
  ownerId: string
  name: string | null
  config: BrandConfig
  profile: BrandProfile
  brandMd: string | null
}

/** Reserved slugs that can't be registered (route collisions / squatting). */
export const RESERVED_BRAND_SLUGS = new Set([
  "logo", "logo-mark", "wordmark", "assets", "api", "b", "badge", "docs",
  "admin", "dashboard", "new", "edit", "delete", "shieldcn",
])

const CACHE_TTL_SECONDS = 60
const cacheKey = (slug: string) => `brand:${slug.toLowerCase()}`
/** Sentinel cached for known-missing brands, so misses don't re-hit Postgres. */
const MISS = "__miss__"

export function isValidBrandSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) &&
    !RESERVED_BRAND_SLUGS.has(slug)
}

function sanitizeConfig(input: unknown): BrandConfig {
  const out: BrandConfig = {}
  if (input && typeof input === "object") {
    for (const key of BRAND_PARAM_KEYS) {
      const v = (input as Record<string, unknown>)[key]
      if (typeof v === "string" && v.length <= 200) out[key] = v
    }
  }
  return out
}

const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/

function sanitizeProfile(input: unknown): BrandProfile {
  const out: BrandProfile = {}
  if (input && typeof input === "object") {
    const o = input as Record<string, unknown>
    for (const key of ["title", "description", "slogan", "domain"] as const) {
      const v = o[key]
      if (typeof v === "string" && v.length <= 2000) out[key] = v
    }
    if (Array.isArray(o.palette)) {
      out.palette = o.palette
        .filter((c): c is { hex: string; name?: string } =>
          Boolean(c && typeof c === "object" && typeof (c as { hex?: unknown }).hex === "string" &&
            HEX_RE.test((c as { hex: string }).hex)))
        .slice(0, 12)
        .map((c) => ({
          hex: c.hex.startsWith("#") ? c.hex : `#${c.hex}`,
          name: typeof c.name === "string" ? c.name.slice(0, 60) : undefined,
        }))
    }
  }
  return out
}

interface BrandRow {
  id: string | number
  slug: string
  owner_id: string
  name: string | null
  config: unknown
  profile: unknown
  brand_md: string | null
}

function rowToBrand(row: BrandRow): Brand {
  return {
    id: Number(row.id),
    slug: row.slug,
    ownerId: row.owner_id,
    name: row.name,
    config: sanitizeConfig(row.config),
    profile: sanitizeProfile(row.profile),
    brandMd: row.brand_md ?? null,
  }
}

/**
 * Resolve a brand by slug, cached. Returns null for unknown/deleted brands.
 * Fail-open: any DB error resolves to null (badge renders with defaults).
 */
export async function getBrand(slug: string): Promise<Brand | null> {
  if (!slug || !isValidBrandSlug(slug)) return null
  const key = cacheKey(slug)

  const cached = await cacheGet<Brand | typeof MISS>(key)
  if (cached === MISS) return null
  if (cached) return cached

  try {
    await initDB()
    const { rows } = await query<BrandRow>(
      `SELECT id, slug, owner_id, name, config, profile, brand_md FROM brands WHERE slug = $1`,
      [slug.toLowerCase()],
    )
    const brand = rows[0] ? rowToBrand(rows[0]) : null
    await cacheSet(key, brand ?? MISS, CACHE_TTL_SECONDS)
    return brand
  } catch {
    return null
  }
}

/**
 * Overlay a brand's config onto request search params with the correct
 * precedence: explicit query params win over brand values, brand values win
 * over defaults. Mutates and returns a *copy* of the params.
 */
export function applyBrandToParams(
  params: URLSearchParams,
  config: BrandConfig,
): URLSearchParams {
  const merged = new URLSearchParams(params)
  for (const [key, value] of Object.entries(config)) {
    if (value != null && !merged.has(key)) merged.set(key, value)
  }
  return merged
}

// ── CRUD (management side; the engine only ever reads via getBrand) ──────────

/** Per-plan brand cap. Managed brands are a Plus capability, capped at a single
 *  brand — enough to restyle every embed from one place while keeping the
 *  dashboard usage meter meaningful. */
export const PLUS_BRAND_LIMIT = 1
export function brandLimitForPlan(plan: string): number {
  return plan === "plus" ? PLUS_BRAND_LIMIT : 0
}

export async function listBrandsByOwner(ownerId: string): Promise<Brand[]> {
  // Fail-open: a DB blip on a dashboard read shows an empty list, not a crash.
  try {
    await initDB()
    const { rows } = await query<BrandRow>(
      `SELECT id, slug, owner_id, name, config, profile, brand_md FROM brands
        WHERE owner_id = $1 ORDER BY updated_at DESC`,
      [ownerId],
    )
    return rows.map(rowToBrand)
  } catch {
    return []
  }
}

/** Count an owner's brands (for the create-time cap + dashboard usage meter). */
export async function countBrandsByOwner(ownerId: string): Promise<number> {
  try {
    await initDB()
    const { rows } = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM brands WHERE owner_id = $1`,
      [ownerId],
    )
    return Number(rows[0]?.n ?? 0)
  } catch {
    return 0
  }
}

export interface BrandUpsert {
  name?: string | null
  config?: BrandConfig
  profile?: BrandProfile
  brandMd?: string | null
}

export async function upsertBrand(
  ownerId: string,
  slug: string,
  input: BrandUpsert,
): Promise<Brand> {
  await initDB()
  const clean = sanitizeConfig(input.config)
  const profile = sanitizeProfile(input.profile)
  const { rows } = await query<BrandRow>(
    `INSERT INTO brands (slug, owner_id, name, config, profile, brand_md, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           config = EXCLUDED.config,
           profile = EXCLUDED.profile,
           brand_md = EXCLUDED.brand_md,
           updated_at = NOW()
     WHERE brands.owner_id = $2
     RETURNING id, slug, owner_id, name, config, profile, brand_md`,
    [slug.toLowerCase(), ownerId, input.name ?? null, JSON.stringify(clean),
     JSON.stringify(profile), input.brandMd ?? null],
  )
  if (!rows[0]) {
    // ON CONFLICT WHERE guard failed → slug owned by another org.
    throw new Error("brand slug is taken")
  }
  await cacheSet(cacheKey(slug), rowToBrand(rows[0]), CACHE_TTL_SECONDS)
  return rowToBrand(rows[0])
}

export async function deleteBrand(ownerId: string, slug: string): Promise<boolean> {
  await initDB()
  const { rowCount } = await query(
    `DELETE FROM brands WHERE slug = $1 AND owner_id = $2`,
    [slug.toLowerCase(), ownerId],
  )
  await cacheSet(cacheKey(slug), MISS, CACHE_TTL_SECONDS)
  return (rowCount ?? 0) > 0
}

// ── Hosted brand assets ──────────────────────────────────────────────────────

export type BrandImageKind = "logo-light" | "logo-dark" | "mark" | "wordmark"
export type BrandFontKind = "font-sans" | "font-mono" | "font-heading"
export type BrandAssetKind = BrandImageKind | BrandFontKind

export const BRAND_IMAGE_KINDS: BrandImageKind[] = ["logo-light", "logo-dark", "mark", "wordmark"]
export const BRAND_FONT_KINDS: BrandFontKind[] = ["font-sans", "font-mono", "font-heading"]

export interface BrandAsset {
  contentType: string
  data: Buffer
  fileName?: string | null
}

const assetCacheKey = (slug: string, kind: string) => `brand-asset:${slug}:${kind}`

/**
 * Fetch a hosted brand asset (e.g. the logo) for serving. Cached briefly so a
 * rebrand propagates within minutes. Returns null when the brand or asset is
 * missing. Fail-open on DB error.
 */
export async function getBrandAsset(
  slug: string,
  kind: BrandAssetKind,
): Promise<BrandAsset | null> {
  if (!isValidBrandSlug(slug)) return null
  const key = assetCacheKey(slug, kind)
  const cached = await cacheGet<{ contentType: string; base64: string } | typeof MISS>(key)
  if (cached === MISS) return null
  if (cached) return { contentType: cached.contentType, data: Buffer.from(cached.base64, "base64") }

  try {
    await initDB()
    const { rows } = await query<{ content_type: string; data: Buffer; file_name: string | null }>(
      `SELECT a.content_type, a.data, a.file_name
         FROM brand_assets a JOIN brands b ON b.id = a.brand_id
        WHERE b.slug = $1 AND a.kind = $2`,
      [slug.toLowerCase(), kind],
    )
    if (!rows[0]) {
      await cacheSet(key, MISS, CACHE_TTL_SECONDS)
      return null
    }
    const data = rows[0].data
    await cacheSet(
      key,
      { contentType: rows[0].content_type, base64: data.toString("base64"), fileName: rows[0].file_name },
      CACHE_TTL_SECONDS,
    )
    return { contentType: rows[0].content_type, data, fileName: rows[0].file_name }
  } catch {
    return null
  }
}

/**
 * Fetch a brand's uploaded font bytes by kind, for the render pipeline. Same
 * cache + fail-open behavior as getBrandAsset; returns raw bytes only.
 */
export async function getBrandFont(
  slug: string,
  kind: BrandFontKind,
): Promise<Buffer | null> {
  const asset = await getBrandAsset(slug, kind)
  return asset?.data ?? null
}

/** Store (or replace) a brand asset. Ownership is checked by the caller. */
export async function putBrandAsset(
  brandId: number,
  kind: BrandAssetKind,
  contentType: string,
  data: Buffer,
  fileName?: string | null,
): Promise<void> {
  await initDB()
  await query(
    `INSERT INTO brand_assets (brand_id, kind, content_type, file_name, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (brand_id, kind) DO UPDATE
       SET content_type = EXCLUDED.content_type, file_name = EXCLUDED.file_name,
           data = EXCLUDED.data, updated_at = NOW()`,
    [brandId, kind, contentType, fileName ?? null, data],
  )
  // The per-asset cache TTL (60s) bounds how long a stale copy can serve after
  // a re-upload; no explicit bust needed (and we avoid caching a false MISS).
}

/** Look up a brand owned by an org (for asset-upload authorization). */
export async function getOwnedBrand(ownerId: string, slug: string): Promise<Brand | null> {
  await initDB()
  const { rows } = await query<BrandRow>(
    `SELECT id, slug, owner_id, name, config, profile, brand_md FROM brands WHERE slug = $1 AND owner_id = $2`,
    [slug.toLowerCase(), ownerId],
  )
  return rows[0] ? rowToBrand(rows[0]) : null
}
