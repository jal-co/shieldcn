/**
 * shieldcn
 * src/badges/svg-text-utils
 *
 * Small string/number helpers shared by the hand-built SVG renderers
 * (chart, header, sponsors/contributors) — previously redefined verbatim
 * in each of those files.
 */

/** Escape a string for safe inclusion in hand-built SVG/XML text or attributes. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Round to 2 decimal places — keeps generated SVG coordinates compact. */
export function r2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Clamp a number to the [min, max] range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
