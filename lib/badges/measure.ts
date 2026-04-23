/**
 * shieldcn
 * lib/badges/measure
 *
 * Text width calculation using a character width lookup table.
 * Same technique as shields.io — pre-measured character widths for
 * Verdana at 11px (the standard badge font). No native dependencies.
 */

/**
 * Character width lookup table for Verdana 11px.
 * Values are measured widths in pixels.
 */
const CHAR_WIDTHS: Record<string, number> = {
  // Lowercase
  a: 6.71, b: 6.71, c: 5.91, d: 6.71, e: 6.41,
  f: 3.64, g: 6.71, h: 6.71, i: 2.64, j: 3.64,
  k: 6.41, l: 2.64, m: 10.31, n: 6.71, o: 6.71,
  p: 6.71, q: 6.71, r: 4.14, s: 5.71, t: 4.14,
  u: 6.71, v: 6.41, w: 9.01, x: 6.41, y: 6.41,
  z: 5.71,

  // Uppercase
  A: 7.91, B: 7.41, C: 7.41, D: 8.21, E: 6.91,
  F: 6.41, G: 8.21, H: 8.21, I: 3.14, J: 4.91,
  K: 7.41, L: 6.41, M: 9.51, N: 8.21, O: 8.51,
  P: 6.91, Q: 8.51, R: 7.91, S: 7.41, T: 6.91,
  U: 8.21, V: 7.91, W: 11.01, X: 7.41, Y: 6.91,
  Z: 7.41,

  // Numbers
  "0": 6.71, "1": 6.71, "2": 6.71, "3": 6.71, "4": 6.71,
  "5": 6.71, "6": 6.71, "7": 6.71, "8": 6.71, "9": 6.71,

  // Symbols
  " ": 3.34, ".": 3.34, ",": 3.34, ":": 3.34, ";": 3.34,
  "!": 3.64, "?": 6.41, "'": 2.91, "\"": 4.64, "`": 4.01,
  "-": 4.14, "_": 5.51, "/": 4.14, "\\": 4.14,
  "(": 3.91, ")": 3.91, "[": 3.91, "]": 3.91,
  "{": 4.41, "}": 4.41,
  "+": 7.41, "=": 7.41, "<": 7.41, ">": 7.41,
  "@": 11.21, "#": 7.41, "$": 6.71, "%": 9.31,
  "^": 7.41, "&": 7.91, "*": 5.51, "~": 7.41,
  "|": 3.14,
}

/** Default width for characters not in the lookup table. */
const DEFAULT_CHAR_WIDTH = 6.71

/**
 * Measure the rendered width of a text string at a given font size.
 * Uses a character-width lookup table calibrated for Verdana.
 *
 * @param text - The string to measure.
 * @param fontSize - Font size in pixels (default: 11).
 * @returns Width in pixels.
 */
export function measureText(text: string, fontSize: number = 11): number {
  const scale = fontSize / 11
  let width = 0
  for (const char of text) {
    width += (CHAR_WIDTHS[char] ?? DEFAULT_CHAR_WIDTH) * scale
  }
  return width
}
