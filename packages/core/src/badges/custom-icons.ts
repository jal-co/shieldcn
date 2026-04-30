/**
 * shieldcn
 * lib/badges/custom-icons
 *
 * Custom SVG icons shipped with shieldcn for providers/brands
 * not available in SimpleIcons or React Icons.
 *
 * Pipeline:
 * 1. Drop an .svg file into packages/core/src/icons/
 * 2. Add a one-liner to the registry below: slug → { file, color }
 * 3. Done — the SVG is parsed at startup and served as an icon.
 *
 * The parser handles:
 * - Fill-based icons (normal SVGs with solid paths)
 * - Stroke-based icons (Lucide/Feather style — auto-detected)
 * - Non-square viewBoxes (aspect ratio preserved in rendering)
 * - Multi-path SVGs (each <path> extracted separately)
 * - <circle>, <rect>, <ellipse>, <line>, <polyline>, <polygon>
 * - Rotation via `data-rotation="45"` on the root <svg>
 */

import { readFileSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { existsSync } from "node:fs"
import { parseSvg } from "./svg-parser"
import type { IconData } from "./icons"

// ---------------------------------------------------------------------------
// Registry — one entry per custom icon
// ---------------------------------------------------------------------------

interface CustomIconEntry {
  /** SVG filename in packages/core/src/icons/ */
  file: string
  /** Default brand color (hex without #) */
  color: string
  /** Optional rotation in degrees (applied around viewBox center) */
  rotation?: number
}

/**
 * Custom icon registry.
 *
 * To add a new icon:
 * 1. Save the SVG to packages/core/src/icons/{name}.svg
 * 2. Add an entry here: slug → { file, color }
 *
 * Tips for good SVGs:
 * - Use a proper viewBox (not width/height only)
 * - Remove hardcoded fill colors (let the badge engine color it)
 * - Keep it simple — no gradients, filters, or CSS classes
 * - For stroke icons: use stroke="currentColor" and fill="none"
 */
const registry: Record<string, CustomIconEntry> = {
  openpanel: { file: "openpanel.svg", color: "2564EB" },
  indiedevs: { file: "indiedevs.svg", color: "818CF8", rotation: 45 },
  shieldcn: { file: "shieldcn.svg", color: "000000" },
  shadcncraft: { file: "shadcncraft.svg", color: "171717" },
}

// ---------------------------------------------------------------------------
// Load and cache icons at startup
// ---------------------------------------------------------------------------

interface LoadedIcon {
  icon: IconData
  color: string
}

let iconCache: Map<string, LoadedIcon> | null = null

function findIconsDir(): string {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "..", "icons"),
    join(process.cwd(), "packages", "core", "src", "icons"),
    join(process.cwd(), "..", "core", "src", "icons"),
  ]
  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }
  throw new Error(`Could not find icons directory. Searched: ${candidates.join(", ")}`)
}

function loadIcons(): Map<string, LoadedIcon> {
  if (iconCache) return iconCache

  const iconsDir = findIconsDir()
  const cache = new Map<string, LoadedIcon>()

  for (const [slug, entry] of Object.entries(registry)) {
    const filePath = join(iconsDir, entry.file)
    if (!existsSync(filePath)) {
      console.warn(`[shieldcn] Custom icon file not found: ${filePath} (slug: ${slug})`)
      continue
    }

    try {
      const svgContent = readFileSync(filePath, "utf-8")
      const parsed = parseSvg(svgContent)
      if (!parsed) {
        console.warn(`[shieldcn] Failed to parse SVG: ${entry.file} (slug: ${slug})`)
        continue
      }

      // Apply rotation override from registry
      if (entry.rotation) {
        parsed.icon.rotation = entry.rotation
      }

      cache.set(slug, {
        icon: parsed.icon,
        color: entry.color,
      })
    } catch (err) {
      console.warn(`[shieldcn] Error loading custom icon ${entry.file}:`, err)
    }
  }

  iconCache = cache
  return cache
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a custom icon by slug.
 * Returns null if not found.
 */
export function getCustomIcon(
  slug: string
): { icon: IconData; defaultColor: string } | null {
  const cache = loadIcons()
  const entry = cache.get(slug.toLowerCase())
  if (!entry) return null

  return {
    icon: entry.icon,
    defaultColor: entry.color,
  }
}

/**
 * Check if a slug matches a custom icon.
 */
export function hasCustomIcon(slug: string): boolean {
  const cache = loadIcons()
  return cache.has(slug.toLowerCase())
}

/**
 * List all available custom icon slugs.
 * Useful for documentation and validation.
 */
export function listCustomIcons(): string[] {
  return Object.keys(registry)
}

/**
 * Validate all icons in the registry.
 * Returns a list of issues (empty = all good).
 * Run this during development to catch problems early.
 */
export function validateCustomIcons(): string[] {
  const issues: string[] = []
  const iconsDir = findIconsDir()

  // Check registry entries
  for (const [slug, entry] of Object.entries(registry)) {
    const filePath = join(iconsDir, entry.file)
    if (!existsSync(filePath)) {
      issues.push(`${slug}: file not found → ${entry.file}`)
      continue
    }

    const svgContent = readFileSync(filePath, "utf-8")
    const parsed = parseSvg(svgContent)
    if (!parsed) {
      issues.push(`${slug}: SVG parse failed — no renderable paths found`)
      continue
    }

    // Check for common problems
    if (!svgContent.includes("viewBox")) {
      issues.push(`${slug}: missing viewBox — icon may render at wrong size`)
    }

    if (svgContent.includes("class=")) {
      issues.push(`${slug}: contains CSS classes — these won't work in badge SVGs`)
    }

    if (svgContent.includes("<style")) {
      issues.push(`${slug}: contains <style> block — inline styles only`)
    }

    if (svgContent.includes("url(") || svgContent.includes("<linearGradient") || svgContent.includes("<radialGradient")) {
      issues.push(`${slug}: contains gradients — not supported in badge rendering`)
    }

    if (svgContent.includes("<filter")) {
      issues.push(`${slug}: contains filters — not supported in badge rendering`)
    }

    if (!/^[0-9a-fA-F]{6}$/.test(entry.color)) {
      issues.push(`${slug}: invalid color "${entry.color}" — must be 6-char hex without #`)
    }
  }

  // Check for orphaned SVG files (in icons dir but not in registry)
  try {
    const files = readdirSync(iconsDir).filter(f => f.endsWith(".svg"))
    const registeredFiles = new Set(Object.values(registry).map(e => e.file))
    for (const file of files) {
      if (!registeredFiles.has(file)) {
        issues.push(`orphan: ${file} exists in icons/ but is not registered`)
      }
    }
  } catch {
    // Directory listing failed — not critical
  }

  return issues
}
