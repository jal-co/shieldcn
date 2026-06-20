// shieldcn — components/hero-glow.tsx
// Subtle ambient radial glow behind the hero showcase. Decorative only.
// Intensity / size / position / hue tuned with DialKit and baked in — set
// intensity to 0 to disable. Renders behind all hero content.

"use client"

import { useSyncExternalStore } from "react"

/** Hydration flag without setState-in-effect (lint-clean, mirrors HomeCharts). */
function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false)
}

/** #rgb | #rrggbb → rgba(r,g,b,a) */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function HeroGlow() {
  const hydrated = useHydrated()

  // Tuned values baked out of DialKit before shipping.
  const g = {
    intensity: 0.19, // peak alpha at the center of the glow
    sizeX: 49, //      horizontal radius (% of hero)
    sizeY: 55, //      vertical radius (% of hero)
    x: 70, //          center X (%) — anchored over the showcase
    y: 48, //          center Y (%)
    color: "#737373", // neutral grey wash
    noise: 0.03, //    film-grain overlay opacity (0 = off)
    dither: 0.05, //   ordered Bayer dither opacity (0 = off)
  }

  // Shared radial mask so both grain layers fade out exactly where the glow does.
  const glowMask = `radial-gradient(${g.sizeX}% ${g.sizeY}% at ${g.x}% ${g.y}%, #000, transparent 70%)`

  // Deterministic from defaults, but gate to avoid any hydration drift.
  if (!hydrated) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(${g.sizeX}% ${g.sizeY}% at ${g.x}% ${g.y}%, ${hexToRgba(g.color as string, g.intensity)}, transparent 70%)`,
        }}
      />
      {/* Fractal-noise grain, masked to the glow so it only grains the lit area */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity: g.noise,
          backgroundImage: NOISE_URL,
          WebkitMaskImage: glowMask,
          maskImage: glowMask,
        }}
      />
      {/* Ordered Bayer dither — crisp 1px grid, pixelated, masked to the glow */}
      <div
        className="absolute inset-0 mix-blend-overlay"
        style={{
          opacity: g.dither,
          backgroundImage: DITHER_URL,
          backgroundSize: "4px 4px",
          imageRendering: "pixelated",
          WebkitMaskImage: glowMask,
          maskImage: glowMask,
        }}
      />
    </div>
  )
}

/** Tiling fractal-noise tile rendered by the browser (no asset needed). */
const NOISE_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/**
 * 4x4 ordered Bayer pattern (black pixels at threshold cells < 8). Tiled at
 * 4px with pixelated rendering, it reads as a crisp ordered dither that breaks
 * up gradient banding.
 */
const DITHER_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Cg fill='%23000'%3E%3Crect x='0' y='0' width='1' height='1'/%3E%3Crect x='2' y='0' width='1' height='1'/%3E%3Crect x='1' y='1' width='1' height='1'/%3E%3Crect x='3' y='1' width='1' height='1'/%3E%3Crect x='0' y='2' width='1' height='1'/%3E%3Crect x='2' y='2' width='1' height='1'/%3E%3Crect x='1' y='3' width='1' height='1'/%3E%3Crect x='3' y='3' width='1' height='1'/%3E%3C/g%3E%3C/svg%3E\")"
