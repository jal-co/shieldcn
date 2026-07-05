/**
 * @shieldcn/core
 * src/brand-claims.ts
 *
 * Admin-issued "claim your brand" invites. An admin generates a token tied to a
 * brand slug (with optional pre-seeded name/config). Opening the link and
 * signing in grants the claimant Plus + ownership of that brand.
 *
 * The token is a high-entropy URL-safe string; the row is the single source of
 * truth for its status. Claims can optionally expire.
 */

import { randomBytes } from "node:crypto"
import { query, initDB } from "./db"
import type { BrandConfig } from "./brands"

export interface BrandClaim {
  token: string
  brandSlug: string
  brandName: string | null
  config: BrandConfig
  createdBy: string
  claimedBy: string | null
  claimedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface BrandClaimRow {
  token: string
  brand_slug: string
  brand_name: string | null
  config: unknown
  created_by: string
  claimed_by: string | null
  claimed_at: Date | null
  expires_at: Date | null
  created_at: Date
}

function rowToClaim(r: BrandClaimRow): BrandClaim {
  return {
    token: r.token,
    brandSlug: r.brand_slug,
    brandName: r.brand_name,
    config: (r.config && typeof r.config === "object" ? r.config : {}) as BrandConfig,
    createdBy: r.created_by,
    claimedBy: r.claimed_by,
    claimedAt: r.claimed_at ? r.claimed_at.toISOString() : null,
    expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
    createdAt: r.created_at.toISOString(),
  }
}

/** Generate a URL-safe claim token. */
export function newClaimToken(): string {
  return randomBytes(24).toString("base64url")
}

/** Create a claim invite for a brand slug. Returns the stored claim. */
export async function createBrandClaim(input: {
  brandSlug: string
  brandName?: string | null
  config?: BrandConfig
  createdBy: string
  expiresInDays?: number | null
}): Promise<BrandClaim> {
  await initDB()
  const token = newClaimToken()
  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null
  const { rows } = await query<BrandClaimRow>(
    `INSERT INTO brand_claims (token, brand_slug, brand_name, config, created_by, expires_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING token, brand_slug, brand_name, config, created_by, claimed_by, claimed_at, expires_at, created_at`,
    [
      token,
      input.brandSlug.toLowerCase(),
      input.brandName ?? null,
      JSON.stringify(input.config ?? {}),
      input.createdBy,
      expiresAt,
    ],
  )
  return rowToClaim(rows[0])
}

/** Fetch a claim by token, or null. */
export async function getBrandClaim(token: string): Promise<BrandClaim | null> {
  if (!token) return null
  await initDB()
  const { rows } = await query<BrandClaimRow>(
    `SELECT token, brand_slug, brand_name, config, created_by, claimed_by, claimed_at, expires_at, created_at
       FROM brand_claims WHERE token = $1`,
    [token],
  )
  return rows[0] ? rowToClaim(rows[0]) : null
}

/** List recent claims for the admin panel. */
export async function listBrandClaims(limit = 50): Promise<BrandClaim[]> {
  try {
    await initDB()
    const { rows } = await query<BrandClaimRow>(
      `SELECT token, brand_slug, brand_name, config, created_by, claimed_by, claimed_at, expires_at, created_at
         FROM brand_claims ORDER BY created_at DESC LIMIT $1`,
      [limit],
    )
    return rows.map(rowToClaim)
  } catch {
    return []
  }
}

/**
 * Mark a claim as claimed by `ownerId`. Atomic + idempotent: only an unclaimed,
 * unexpired claim transitions. Returns the updated claim, or null if it was
 * already claimed / expired / missing.
 */
export async function markClaimClaimed(token: string, ownerId: string): Promise<BrandClaim | null> {
  await initDB()
  const { rows } = await query<BrandClaimRow>(
    `UPDATE brand_claims
        SET claimed_by = $2, claimed_at = NOW()
      WHERE token = $1
        AND claimed_by IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING token, brand_slug, brand_name, config, created_by, claimed_by, claimed_at, expires_at, created_at`,
    [token, ownerId],
  )
  return rows[0] ? rowToClaim(rows[0]) : null
}

/** Delete a claim (admin revoke). */
export async function deleteBrandClaim(token: string): Promise<boolean> {
  await initDB()
  const { rowCount } = await query(`DELETE FROM brand_claims WHERE token = $1`, [token])
  return (rowCount ?? 0) > 0
}

/** A claim is usable if it exists, is unclaimed, and hasn't expired. */
export function isClaimOpen(claim: BrandClaim | null): boolean {
  if (!claim) return false
  if (claim.claimedBy) return false
  if (claim.expiresAt && new Date(claim.expiresAt).getTime() <= Date.now()) return false
  return true
}
