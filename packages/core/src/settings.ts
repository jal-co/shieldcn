/**
 * shieldcn
 * settings
 *
 * Global, admin-controlled site settings stored as key/value rows in Postgres.
 * Cached briefly so reads on hot public pages (e.g. the showcase) don't hit the
 * DB every request. Fail-open: a DB blip resolves to the provided default.
 */

import { query, initDB } from "./db"
import { cacheGet, cacheSet } from "./cache"

const CACHE_TTL_SECONDS = 30
const cacheKey = (key: string) => `setting:${key}`

/** Known setting keys + their defaults (used when unset or on failure). */
export const SETTINGS = {
  /** Whether brand-badge categories are shown in the public showcase. */
  showcaseBrandBadges: { key: "showcase_brand_badges", default: true },
} as const

export type SettingName = keyof typeof SETTINGS

export async function getBoolSetting(name: SettingName): Promise<boolean> {
  const { key, default: def } = SETTINGS[name]
  try {
    const cached = await cacheGet<string>(cacheKey(key))
    if (cached != null) return cached === "1"
    await initDB()
    const { rows } = await query<{ value: string }>(
      `SELECT value FROM site_settings WHERE key = $1`,
      [key],
    )
    const value = rows[0]?.value
    const resolved = value == null ? def : value === "1"
    await cacheSet(cacheKey(key), resolved ? "1" : "0", CACHE_TTL_SECONDS)
    return resolved
  } catch {
    return def
  }
}

export async function setBoolSetting(name: SettingName, value: boolean): Promise<void> {
  const { key } = SETTINGS[name]
  await initDB()
  await query(
    `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value ? "1" : "0"],
  )
  await cacheSet(cacheKey(key), value ? "1" : "0", CACHE_TTL_SECONDS)
}
