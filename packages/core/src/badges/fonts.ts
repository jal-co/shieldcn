/**
 * shieldcn
 * src/badges/fonts
 *
 * Loads the bundled TTF font buffers so resvg can rasterize text when a
 * hand-built SVG (chart / header) is converted to PNG. SVG output relies on the
 * viewer's system fonts; PNG output has no system fonts inside the wasm sandbox,
 * so the buffers must be supplied explicitly.
 */

import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

/** Family name resvg should fall back to. Matches inter-medium.ttf. */
export const DEFAULT_FONT_FAMILY = "Inter"

const FONT_FILES = [
  "inter-medium.ttf",
  "geist-medium.ttf",
  "geist-mono-medium.ttf",
  "jetbrains-mono-medium.ttf",
  "fira-code-medium.ttf",
  "roboto-medium.ttf",
  "space-grotesk-medium.ttf",
]

function findFontsDir(): string | null {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "..", "fonts"),
    join(process.cwd(), "packages", "core", "src", "fonts"),
    join(process.cwd(), "..", "core", "src", "fonts"),
    join(process.cwd(), "lib", "fonts"),
  ]
  for (const dir of candidates) {
    if (existsSync(join(dir, "inter-medium.ttf"))) return dir
  }
  return null
}

let cache: Uint8Array[] | null = null

/**
 * Return the bundled font buffers for resvg's `font.fontBuffers`. Cached after
 * the first read. Returns an empty array if the fonts can't be located (PNG
 * text would then fall back to resvg's default — never throws).
 */
export function getFontBuffers(): Uint8Array[] {
  if (cache) return cache
  const dir = findFontsDir()
  if (!dir) {
    cache = []
    return cache
  }
  cache = FONT_FILES.filter((f) => existsSync(join(dir, f))).map(
    (f) => new Uint8Array(readFileSync(join(dir, f))),
  )
  return cache
}
