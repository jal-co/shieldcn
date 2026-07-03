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

export interface Brand {
  id: number
  slug: string
  orgId: string
  name: string | null
  config: BrandConfig
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

interface BrandRow {
  id: string | number
  slug: string
  org_id: string
  name: string | null
  config: unknown
}

function rowToBrand(row: BrandRow): Brand {
  return {
    id: Number(row.id),
    slug: row.slug,
    orgId: row.org_id,
    name: row.name,
    config: sanitizeConfig(row.config),
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
      `SELECT id, slug, org_id, name, config FROM brands WHERE slug = $1`,
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

export async function listBrandsByOrg(orgId: string): Promise<Brand[]> {
  await initDB()
  const { rows } = await query<BrandRow>(
    `SELECT id, slug, org_id, name, config FROM brands
      WHERE org_id = $1 ORDER BY updated_at DESC`,
    [orgId],
  )
  return rows.map(rowToBrand)
}

export async function upsertBrand(
  orgId: string,
  slug: string,
  name: string | null,
  config: BrandConfig,
): Promise<Brand> {
  await initDB()
  const clean = sanitizeConfig(config)
  const { rows } = await query<BrandRow>(
    `INSERT INTO brands (slug, org_id, name, config, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           config = EXCLUDED.config,
           updated_at = NOW()
     WHERE brands.org_id = $2
     RETURNING id, slug, org_id, name, config`,
    [slug.toLowerCase(), orgId, name, JSON.stringify(clean)],
  )
  if (!rows[0]) {
    // ON CONFLICT WHERE guard failed → slug owned by another org.
    throw new Error("brand slug is taken")
  }
  await cacheSet(cacheKey(slug), rowToBrand(rows[0]), CACHE_TTL_SECONDS)
  return rowToBrand(rows[0])
}

export async function deleteBrand(orgId: string, slug: string): Promise<boolean> {
  await initDB()
  const { rowCount } = await query(
    `DELETE FROM brands WHERE slug = $1 AND org_id = $2`,
    [slug.toLowerCase(), orgId],
  )
  await cacheSet(cacheKey(slug), MISS, CACHE_TTL_SECONDS)
  return (rowCount ?? 0) > 0
}

// ── Hosted brand assets ──────────────────────────────────────────────────────

export type BrandAssetKind = "logo" | "logo-mark" | "wordmark"

export interface BrandAsset {
  contentType: string
  data: Buffer
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
    const { rows } = await query<{ content_type: string; data: Buffer }>(
      `SELECT a.content_type, a.data
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
      { contentType: rows[0].content_type, base64: data.toString("base64") },
      CACHE_TTL_SECONDS,
    )
    return { contentType: rows[0].content_type, data }
  } catch {
    return null
  }
}

/** Store (or replace) a brand asset. Ownership is checked by the caller. */
export async function putBrandAsset(
  brandId: number,
  kind: BrandAssetKind,
  contentType: string,
  data: Buffer,
): Promise<void> {
  await initDB()
  await query(
    `INSERT INTO brand_assets (brand_id, kind, content_type, data, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (brand_id, kind) DO UPDATE
       SET content_type = EXCLUDED.content_type, data = EXCLUDED.data, updated_at = NOW()`,
    [brandId, kind, contentType, data],
  )
}

/** Look up a brand owned by an org (for asset-upload authorization). */
export async function getOwnedBrand(orgId: string, slug: string): Promise<Brand | null> {
  await initDB()
  const { rows } = await query<BrandRow>(
    `SELECT id, slug, org_id, name, config FROM brands WHERE slug = $1 AND org_id = $2`,
    [slug.toLowerCase(), orgId],
  )
  return rows[0] ? rowToBrand(rows[0]) : null
}
