/**
 * @shieldcn/core
 * scripts/seed-friends-brands.ts
 *
 * Idempotent seed for the "Friends of shieldcn" showcase. Attaches each
 * friend's curated badges to its brand record (profile.showcaseBadges) so the
 * public /showcase renders them from the brand — replacing the old hardcoded
 * list in packages/web/lib/showcase-data.ts.
 *
 * Safe to re-run: existing brands are read-merged (name, config, hosted logos,
 * palette, brand_md are preserved); only showcaseBadges + showcaseCategory are
 * set. New brands are created and assigned to SEED_BRAND_OWNER_ID.
 *
 * Usage:
 *   cd packages/web
 *   SEED_BRAND_OWNER_ID=<admin-user-id> node_modules/.bin/tsx \
 *     ../core/src/scripts/seed-friends-brands.ts
 *
 * SEED_BRAND_OWNER_ID is only required when a brand does not yet exist; on
 * update the existing owner is preserved.
 */

import { getAnyBrand, adminUpsertBrand, isValidBrandSlug } from "../brands"
import { getPool } from "../db"

// Category heading these brands' badges group under on /showcase.
const CATEGORY = "Friends of shieldcn"

interface FriendSeed {
  slug: string
  name: string
  /** Brand color (hex, no #), drives the row tint and ?brand=slug styling. */
  color?: string
  /** Curated badge paths (relative, no brand= param — the showcase adds it). */
  badges: string[]
}

const FRIENDS: FriendSeed[] = [
  {
    slug: "indiedevs",
    name: "IndieDevs",
    badges: [
      "/indiedevs/jalco.svg?variant=branded",
      "/indiedevs/jalco.svg?variant=outline",
      "/indiedevs/jalco.svg?variant=secondary",
    ],
  },
  {
    slug: "openpanel",
    name: "OpenPanel",
    color: "2564EB",
    badges: [
      "/badge/analytics%20by-OpenPanel-2564EB.svg?logo=openpanel&logoColor=fff&variant=branded",
      "/badge/analytics%20by-OpenPanel-2564EB.svg?logo=openpanel&variant=outline",
      "/badge/analytics%20by-OpenPanel-2564EB.svg?logo=openpanel&logoColor=fff&variant=secondary",
    ],
  },
  {
    slug: "sentry",
    name: "Sentry",
    color: "362D59",
    badges: [
      "/badge/monitored%20by-Sentry-362D59.svg?logo=sentry&logoColor=fff&variant=branded",
      "/badge/monitored%20by-Sentry-362D59.svg?logo=sentry&variant=outline",
      "/badge/monitored%20by-Sentry-362D59.svg?logo=sentry&logoColor=fff&variant=secondary",
    ],
  },
  {
    slug: "shadcncraft",
    name: "shadcncraft",
    color: "171717",
    badges: [
      "/badge/built%20with-shadcncraft-171717.svg?logo=shadcncraft&logoColor=fff&variant=branded",
      "/badge/built%20with-shadcncraft.svg?logo=shadcncraft",
      "/badge/built%20with-shadcncraft-171717.svg?logo=shadcncraft&logoColor=fff&variant=secondary",
    ],
  },
  {
    slug: "shadcnblocks",
    name: "shadcnblocks",
    color: "000000",
    badges: [
      "/badge/built%20with-shadcnblocks-000000.svg?logo=shadcnblocks&logoColor=fff&variant=branded",
      "/badge/built%20with-shadcnblocks.svg?logo=shadcnblocks",
      "/badge/built%20with-shadcnblocks-000000.svg?logo=shadcnblocks&logoColor=fff&variant=secondary",
    ],
  },
  {
    slug: "notra",
    name: "Notra",
    color: "C8B2EE",
    badges: [
      "/badge/powered%20by-Notra-C8B2EE.svg?logo=notra&logoColor=1e1e1e&variant=branded",
      "/badge/powered%20by-Notra-C8B2EE.svg?logo=notra&variant=outline",
      "/badge/powered%20by-Notra-C8B2EE.svg?logo=notra&variant=secondary",
    ],
  },
  {
    slug: "neon",
    name: "Neon",
    color: "37C38F",
    badges: [
      "/badge/powered%20by-Neon-37C38F.svg?logo=neon&logoColor=fff&variant=branded",
      "/badge/powered%20by-Neon-37C38F.svg?logo=neon&variant=outline",
      "/badge/powered%20by-Neon-37C38F.svg?logo=neon&variant=secondary",
    ],
  },
  {
    slug: "shipperclub",
    name: "shipper.club",
    color: "000000",
    badges: [
      "/shipperclub.svg",
      "/shipperclub.svg?variant=secondary",
      "/shipperclub.svg?variant=outline",
    ],
  },
]

async function main() {
  const ownerId = process.env.SEED_BRAND_OWNER_ID ?? ""

  let created = 0
  let updated = 0

  for (const friend of FRIENDS) {
    if (!isValidBrandSlug(friend.slug)) {
      throw new Error(`Invalid brand slug: ${friend.slug}`)
    }

    const existing = await getAnyBrand(friend.slug)

    if (!existing && !ownerId) {
      throw new Error(
        `Brand "${friend.slug}" does not exist and SEED_BRAND_OWNER_ID is not set. ` +
        `Set it to an admin user id to create new brands.`,
      )
    }

    // Read-merge-write: preserve everything on the existing brand and only set
    // the showcase fields. Preserve an existing explicit color if present.
    const config = {
      ...(existing?.config ?? {}),
      ...(friend.color && !existing?.config.color ? { color: friend.color } : {}),
    }
    const profile = {
      ...(existing?.profile ?? {}),
      showcaseBadges: friend.badges.map((path) => ({ path })),
      showcaseCategory: CATEGORY,
    }

    await adminUpsertBrand(
      friend.slug,
      {
        name: existing?.name ?? friend.name,
        config,
        profile,
        brandMd: existing?.brandMd ?? null,
      },
      existing?.ownerId ?? ownerId,
    )

    if (existing) updated++
    else created++
    console.log(`  ✓ ${friend.slug} — ${friend.badges.length} badge(s) ${existing ? "updated" : "created"}`)
  }

  console.log(`\n✅ Seeded ${FRIENDS.length} friend brand(s): ${created} created, ${updated} updated.\n`)
}

main()
  .then(async () => {
    await getPool().end()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error("\n❌ Seed failed:", err instanceof Error ? err.message : err)
    try { await getPool().end() } catch { /* ignore */ }
    process.exit(1)
  })
