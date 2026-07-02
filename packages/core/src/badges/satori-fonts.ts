/**
 * shieldcn
 * src/badges/satori-fonts
 *
 * Bundled TTF font buffers shaped for Satori's `fonts` option
 * (`{ name, data, weight, style }`), shared by render.tsx and
 * render-group.tsx — both render shadcn Button components via Satori and
 * previously duplicated this file-loading + FONT_CONFIG verbatim.
 *
 * Distinct from fonts.ts, which loads the same TTF files but shapes them
 * as a flat `Uint8Array[]` for resvg's PNG rasterization API — a different
 * consumer with a different shape, not a fit to merge into this one.
 */

import { existsSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Try multiple paths to find fonts — Vercel, Docker standalone, and local dev
// all resolve import.meta.url and process.cwd() differently.
function findFontsDir(): string {
  const candidates = [
    // 1. Relative to this file via import.meta.url (works in Docker standalone)
    join(dirname(fileURLToPath(import.meta.url)), "..", "fonts"),
    // 2. In packages/core/src/fonts relative to cwd (works in local dev / Vercel)
    join(process.cwd(), "packages", "core", "src", "fonts"),
    // 3. Relative to cwd when cwd is packages/web (Vercel with root=packages/web)
    join(process.cwd(), "..", "core", "src", "fonts"),
    // 4. Legacy path (pre-monorepo)
    join(process.cwd(), "lib", "fonts"),
  ]
  for (const dir of candidates) {
    if (existsSync(join(dir, "inter-medium.ttf"))) return dir
  }
  throw new Error(`Could not find font files. Searched: ${candidates.join(", ")}`)
}

const fontsDir = findFontsDir()
const interData = readFileSync(join(fontsDir, "inter-medium.ttf"))
const geistData = readFileSync(join(fontsDir, "geist-medium.ttf"))
const geistMonoData = readFileSync(join(fontsDir, "geist-mono-medium.ttf"))
const jetbrainsMonoData = readFileSync(join(fontsDir, "jetbrains-mono-medium.ttf"))
const firaCodeData = readFileSync(join(fontsDir, "fira-code-medium.ttf"))
const robotoData = readFileSync(join(fontsDir, "roboto-medium.ttf"))
const spaceGroteskData = readFileSync(join(fontsDir, "space-grotesk-medium.ttf"))

export type BadgeFont = "inter" | "geist" | "geist-mono" | "jetbrains-mono" | "fira-code" | "roboto" | "space-grotesk"

export const FONT_CONFIG: Record<BadgeFont, { name: string; data: Buffer }> = {
  inter: { name: "Inter", data: interData },
  geist: { name: "Geist", data: geistData },
  "geist-mono": { name: "Geist Mono", data: geistMonoData },
  "jetbrains-mono": { name: "JetBrains Mono", data: jetbrainsMonoData },
  "fira-code": { name: "Fira Code", data: firaCodeData },
  roboto: { name: "Roboto", data: robotoData },
  "space-grotesk": { name: "Space Grotesk", data: spaceGroteskData },
}

/** Satori `fonts` option for the given badge font (defaults to Inter). */
export function getFonts(font: BadgeFont = "inter") {
  const f = FONT_CONFIG[font] ?? FONT_CONFIG.inter
  return [{ name: f.name, data: f.data, weight: 500 as const, style: "normal" as const }]
}
