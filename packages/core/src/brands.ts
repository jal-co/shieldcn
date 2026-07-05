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
  "theme", "color", "color2", "labelColor", "valueColor", "labelTextColor",
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
/** A curated showcase badge attached to a brand (up to MAX_BRAND_SHOWCASE). */
export interface BrandShowcaseBadge {
  /** Relative badge path incl. its own params, e.g. /badge/build-passing.svg?variant=branded */
  path: string
  /** Alt text / caption. */
  alt?: string
}

export const MAX_BRAND_SHOWCASE = 5

export interface BrandProfile {
  title?: string
  description?: string
  slogan?: string
  domain?: string
  palette?: BrandPaletteColor[]
  /** Up to 5 curated badges shown for this brand in the global showcase. */
  showcaseBadges?: BrandShowcaseBadge[]
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
    if (Array.isArray(o.showcaseBadges)) {
      out.showcaseBadges = o.showcaseBadges
        .filter((b): b is { path: string; alt?: unknown } =>
          Boolean(b && typeof b === "object" && typeof (b as { path?: unknown }).path === "string"))
        // Only allow same-origin relative badge paths (no protocol/host).
        .filter((b) => /^\/[a-zA-Z0-9]/.test(b.path) && !b.path.includes("://"))
        .slice(0, MAX_BRAND_SHOWCASE)
        .map((b) => ({
          path: b.path.slice(0, 600),
          alt: typeof b.alt === "string" ? b.alt.slice(0, 120) : undefined,
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

// ── Admin (owner-agnostic) ───────────────────────────────────────────────────
// These bypass the owner_id scope and MUST only be called behind an admin gate.
// They let an allowlisted admin list and edit every brand from the admin panel.

/** List every brand across all owners (admin only). */
export async function listAllBrands(): Promise<Brand[]> {
  try {
    await initDB()
    const { rows } = await query<BrandRow>(
      `SELECT id, slug, owner_id, name, config, profile, brand_md FROM brands
        ORDER BY updated_at DESC`,
    )
    return rows.map(rowToBrand)
  } catch {
    return []
  }
}

/** Fetch any brand by slug regardless of owner (admin only). */
export async function getAnyBrand(slug: string): Promise<Brand | null> {
  await initDB()
  const { rows } = await query<BrandRow>(
    `SELECT id, slug, owner_id, name, config, profile, brand_md FROM brands WHERE slug = $1`,
    [slug.toLowerCase()],
  )
  return rows[0] ? rowToBrand(rows[0]) : null
}

/** Upsert a brand without the owner_id guard (admin only). Preserves the
 *  existing owner on update; assigns `fallbackOwnerId` when creating new. */
export async function adminUpsertBrand(
  slug: string,
  input: BrandUpsert,
  fallbackOwnerId: string,
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
     RETURNING id, slug, owner_id, name, config, profile, brand_md`,
    [slug.toLowerCase(), fallbackOwnerId, input.name ?? null, JSON.stringify(clean),
     JSON.stringify(profile), input.brandMd ?? null],
  )
  await cacheSet(cacheKey(slug), rowToBrand(rows[0]), CACHE_TTL_SECONDS)
  return rowToBrand(rows[0])
}

/**
 * Claim a brand for `ownerId`: upsert the brand and set its owner to the
 * claimant (transferring it if a placeholder row already exists). Used by the
 * "claim your brand" flow. Config/name only overwrite when provided.
 */
export async function claimBrandForOwner(
  slug: string,
  ownerId: string,
  input: { name?: string | null; config?: BrandConfig },
): Promise<Brand> {
  await initDB()
  const clean = sanitizeConfig(input.config)
  const { rows } = await query<BrandRow>(
    `INSERT INTO brands (slug, owner_id, name, config, profile, brand_md, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, '{}'::jsonb, NULL, NOW())
     ON CONFLICT (slug) DO UPDATE
       SET owner_id = EXCLUDED.owner_id,
           name = COALESCE(EXCLUDED.name, brands.name),
           config = CASE WHEN EXCLUDED.config = '{}'::jsonb THEN brands.config ELSE EXCLUDED.config END,
           updated_at = NOW()
     RETURNING id, slug, owner_id, name, config, profile, brand_md`,
    [slug.toLowerCase(), ownerId, input.name ?? null, JSON.stringify(clean)],
  )
  await cacheSet(cacheKey(slug), rowToBrand(rows[0]), CACHE_TTL_SECONDS)
  return rowToBrand(rows[0])
}

/**
 * Rename a brand's slug (admin only). Moves the brands row; brand_assets follow
 * via the brand_id FK (no data move needed). Busts both slug caches. Throws if
 * the target slug is taken. Returns the renamed brand.
 */
export async function adminRenameBrand(fromSlug: string, toSlug: string): Promise<Brand> {
  await initDB()
  if (!isValidBrandSlug(toSlug)) throw new Error("invalid target slug")
  const from = fromSlug.toLowerCase()
  const to = toSlug.toLowerCase()
  if (from === to) {
    const b = await getAnyBrand(from)
    if (!b) throw new Error("brand not found")
    return b
  }
  const existing = await getAnyBrand(to)
  if (existing) throw new Error("target slug is taken")
  const { rows } = await query<BrandRow>(
    `UPDATE brands SET slug = $2, updated_at = NOW() WHERE slug = $1
     RETURNING id, slug, owner_id, name, config, profile, brand_md`,
    [from, to],
  )
  if (!rows[0]) throw new Error("brand not found")
  // Bust caches for both slugs (old becomes a miss, new gets the fresh brand).
  await cacheSet(cacheKey(from), MISS, CACHE_TTL_SECONDS)
  await cacheSet(cacheKey(to), rowToBrand(rows[0]), CACHE_TTL_SECONDS)
  return rowToBrand(rows[0])
}

/** Delete any brand by slug regardless of owner (admin only). */
export async function adminDeleteBrand(slug: string): Promise<boolean> {
  await initDB()
  const { rowCount } = await query(
    `DELETE FROM brands WHERE slug = $1`,
    [slug.toLowerCase()],
  )
  await cacheSet(cacheKey(slug), MISS, CACHE_TTL_SECONDS)
  return (rowCount ?? 0) > 0
}

// ── Hosted brand assets ──────────────────────────────────────────────────────

export type BrandImageKind = "logo-light" | "logo-dark" | "mark" | "mark-alt" | "wordmark"
export type BrandFontKind = "font-sans" | "font-mono" | "font-heading"
export type BrandAssetKind = BrandImageKind | BrandFontKind

export const BRAND_IMAGE_KINDS: BrandImageKind[] = ["logo-light", "logo-dark", "mark", "mark-alt", "wordmark"]
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
/**
 * List the asset kinds a brand has stored (fonts + logos), with file names.
 * Used by the editor to show which slots are already filled. Not cached — it's
 * a management-side read behind auth, not a hot engine path.
 */
export async function listBrandAssetKinds(
  brandId: number,
): Promise<{ kind: string; fileName: string | null }[]> {
  try {
    await initDB()
    const { rows } = await query<{ kind: string; file_name: string | null }>(
      `SELECT kind, file_name FROM brand_assets WHERE brand_id = $1`,
      [brandId],
    )
    return rows.map((r) => ({ kind: r.kind, fileName: r.file_name }))
  } catch {
    return []
  }
}

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
  const { rows } = await query<{ slug: string }>(
    `INSERT INTO brand_assets (brand_id, kind, content_type, file_name, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (brand_id, kind) DO UPDATE
       SET content_type = EXCLUDED.content_type, file_name = EXCLUDED.file_name,
           data = EXCLUDED.data, updated_at = NOW()
     RETURNING (SELECT slug FROM brands WHERE id = $1) AS slug`,
    [brandId, kind, contentType, fileName ?? null, data],
  )
  // Refresh the per-asset cache with the fresh bytes. Critical because a prior
  // read (e.g. an editor preview <img> before first upload) may have cached a
  // MISS for up to the TTL, which would otherwise 404 the just-uploaded asset.
  const slug = rows[0]?.slug
  if (slug) {
    await cacheSet(
      assetCacheKey(slug, kind),
      { contentType, base64: data.toString("base64"), fileName: fileName ?? null },
      CACHE_TTL_SECONDS,
    )
  }
}

/**
 * Delete a brand asset (a logo/mark or font). Busts the per-asset cache with a
 * MISS so the hosted URL 404s immediately instead of serving a stale copy.
 * Returns true when a row was removed.
 */
export async function deleteBrandAsset(
  brandId: number,
  kind: BrandAssetKind,
): Promise<boolean> {
  await initDB()
  const { rows } = await query<{ slug: string }>(
    `DELETE FROM brand_assets a
       USING brands b
      WHERE a.brand_id = b.id AND a.brand_id = $1 AND a.kind = $2
      RETURNING b.slug AS slug`,
    [brandId, kind],
  )
  const slug = rows[0]?.slug
  if (slug) await cacheSet(assetCacheKey(slug, kind), MISS, CACHE_TTL_SECONDS)
  return rows.length > 0
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
