/**
 * @shieldcn/core
 * src/badges/gif.ts
 *
 * Rasterized animated-GIF output for badges. GitHub sanitizes animated SVGs
 * (CSS keyframes are stripped), so to animate inside a GitHub README the badge
 * must be a real animated raster. This module:
 *
 *   1. takes the static base SVG (rendered once) + animation mode
 *   2. bakes N static frames via `frameSvg()`
 *   3. rasterizes each frame to RGBA pixels with resvg-wasm
 *   4. encodes the frames into an animated GIF (transparent, looping)
 *
 * GIF's flat 256-color palette is a perfect fit for badges (flat fills), and
 * the format is universally rendered \u2014 including in GitHub READMEs.
 */

import { encode } from "modern-gif"
import { frameSvg, GIF_FRAMES, GIF_FRAME_DELAY_MS, type AnimateMode } from "./animate"

let resvgReady: Promise<void> | null = null

/**
 * Initialize the resvg WASM module exactly once (idempotent across calls).
 * Mirrors the loading strategy used for PNG output: prefer the bundled WASM
 * file in production, fall back to the CDN.
 */
async function ensureResvg(initWasm: (input: unknown) => Promise<void>): Promise<void> {
  if (resvgReady) return resvgReady
  resvgReady = (async () => {
    try {
      if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        try {
          const fs = await import("node:fs")
          const path = await import("node:path")
          const p = path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm")
          if (fs.existsSync(p)) {
            await initWasm(fs.readFileSync(p))
            return
          }
        } catch { /* fs unavailable */ }
      }
      await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"))
    } catch { /* already initialized */ }
  })()
  return resvgReady
}

/**
 * Render an animated GIF for a badge.
 *
 * @param baseSvg   The static base badge SVG (rendered once, no animation).
 * @param mode      The animation mode ("pulse" | "glow" | "shimmer").
 * @param dotColor  Resolved status-dot color (required for pulse/glow).
 * @param scale     Pixel scale factor. Defaults to 1 so the GIF's pixel size
 *                  matches the badge's logical size (and the PNG/SVG output) —
 *                  in a bare `![](url)` the GIF displays at its intrinsic size,
 *                  so anything above 1 makes it render larger than other
 *                  badges. Raise only when the caller controls the `<img>`
 *                  display size.
 * @returns         GIF bytes, or null if the badge can't be animated as a GIF.
 */
export async function renderGif(
  baseSvg: string,
  mode: AnimateMode,
  dotColor: string | undefined,
  scale = 1,
): Promise<Uint8Array | null> {
  if (mode === "none") return null

  // pulse/glow need a dot; if there isn't one, there's nothing to animate.
  if ((mode === "pulse" || mode === "glow") && !dotColor) return null

  const { Resvg, initWasm } = await import("@resvg/resvg-wasm")
  await ensureResvg(initWasm as (input: unknown) => Promise<void>)

  // Read intrinsic badge size from the base SVG so all frames share dimensions.
  const wMatch = baseSvg.match(/<svg[^>]*\bwidth="([\d.]+)"/)
  const hMatch = baseSvg.match(/<svg[^>]*\bheight="([\d.]+)"/)
  if (!wMatch || !hMatch) return null
  const width = Math.round(parseFloat(wMatch[1]) * scale)
  const height = Math.round(parseFloat(hMatch[1]) * scale)

  const frames: Array<{ data: ArrayBuffer; delay: number }> = []
  for (let i = 0; i < GIF_FRAMES; i++) {
    const t = i / GIF_FRAMES
    const svg = frameSvg(baseSvg, mode, t, dotColor)
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
      background: "rgba(0,0,0,0)",
    })
    const rendered = resvg.render()
    // .pixels is RGBA8 \u2014 exactly what modern-gif expects for frame data.
    const px = rendered.pixels
    const buf = new ArrayBuffer(px.byteLength)
    const out = new Uint8Array(buf)
    out.set(px)
    // GIF has 1-bit alpha (no anti-aliasing). resvg renders a soft AA edge
    // (alpha ramps 0->255 over ~2px). Snapping that ramp to opaque/clear at a
    // mid threshold insets the shape by a sub-pixel, so the resulting hard
    // edge sits inside the smooth outline: clean rounded corners on any
    // background instead of a crunchy or fringed edge.
    insetAlpha(out, ALPHA_INSET_THRESHOLD)
    frames.push({ data: buf, delay: GIF_FRAME_DELAY_MS })
  }

  const buffer = await encode({
    width,
    height,
    frames,
    looped: true,
    // Badges are flat-colored; a small palette keeps the file tiny.
    maxColors: 64,
  })

  return new Uint8Array(buffer)
}

/**
 * Alpha cutoff for the 1-bit inset. Pixels with alpha >= threshold become
 * fully opaque; everything else becomes fully transparent. ~150 drops the
 * faint outer AA ramp (insetting the edge) while keeping the body solid.
 */
const ALPHA_INSET_THRESHOLD = 150

/**
 * Snap a frame's alpha channel to 1-bit at `threshold`, insetting the shape.
 * Mutates the buffer in place.
 */
function insetAlpha(rgba: Uint8Array, threshold: number): void {
  for (let i = 3; i < rgba.length; i += 4) {
    rgba[i] = rgba[i] >= threshold ? 255 : 0
  }
}
