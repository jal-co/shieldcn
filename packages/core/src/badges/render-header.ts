/**
 * shieldcn
 * src/badges/render-header
 *
 * Repository header / banner image renderer. Hand-built SVG (like the chart
 * renderer) so the result is safe inside a sandboxed `<img>` SVG — no external
 * CSS, no CSS variables, no embedded font (system font stacks via the shared
 * `font` vocabulary).
 *
 * A header is: a premade (or prop-driven) background, an optional logo, a big
 * title, and an optional subtitle. Layout is either centered or left-aligned.
 * Everything is driven by the image URL.
 */

import type { IconData } from "./icons"
import { resolveFontFamily } from "./render-chart"
import type { ResolvedHeaderBg } from "./header-backgrounds"

export type HeaderAlign = "center" | "left"

export interface HeaderLogoInput {
  /** Path-based icon (SimpleIcons / React Icons / custom SVG). */
  icon?: IconData
  /** Ready-to-embed raster/vector data URI (a user's own logo). */
  imageDataUri?: string
  /** Fill color for path icons (#rrggbb). Ignored for image logos. */
  color?: string
}

export interface HeaderConfig {
  title: string
  subtitle?: string
  width: number
  height: number
  mode: "dark" | "light"
  align: HeaderAlign
  /** Corner radius in px. */
  radius: number
  /** Resolved premade/prop background. */
  background: ResolvedHeaderBg
  logo?: HeaderLogoInput
  /** font-family stack (resolved from the `font` keyword). */
  fontFamily?: string
  /** Title color override (#rrggbb). */
  titleColor?: string
  /** Subtitle color override (#rrggbb). */
  subtitleColor?: string
  /** Draw a 1px hairline border around the card. */
  border?: boolean
  /** Show a subtle shieldcn.dev watermark (bottom corner). Default false. */
  watermark?: boolean
}

/** shieldcn logo glyph (viewBox 0 0 512 512). */
const SHIELDCN_LOGO =
  '<path d="M148.02,363.76c-4.48,0-8.64-2.42-10.86-6.32l-54.29-95.68c-2.15-3.8-2.15-8.52,0-12.32l54.29-95.68c2.21-3.9,6.37-6.32,10.86-6.32h18.51c4.44,0,8.45,2.28,10.73,6.09,2.27,3.82,2.37,8.43.25,12.33l-42.23,77.99c-3.98,7.36-3.98,16.14,0,23.49l22.22,41.02c4.25,7.85,12.43,12.8,21.36,12.92,0,0,45.08.61,45.11.61,8.68,0,16.83-4.64,21.26-12.12l24.87-41.99c2.23-3.77,6.34-6.11,10.72-6.12l19.47-.04c4.48,0,8.49,2.29,10.76,6.12,2.27,3.83,2.35,8.45.21,12.35l-42.2,77.17c-2.19,4-6.39,6.49-10.95,6.49h-110.08Z"/><path d="M346.7,363.69c-4.44,0-8.45-2.28-10.73-6.09-2.27-3.82-2.37-8.43-.25-12.33l42.23-77.99c3.98-7.35,3.98-16.14,0-23.49l-22.22-41.02c-4.25-7.85-12.44-12.8-21.36-12.92,0,0-46.51-.63-46.53-.63-8.88,0-17.12,4.81-21.48,12.54l-23.35,41.36c-2.2,3.9-6.36,6.34-10.84,6.35l-19.21.04c-4.48,0-8.49-2.29-10.76-6.12-2.27-3.83-2.35-8.45-.22-12.36l42.2-77.17c2.19-4.01,6.39-6.5,10.95-6.5h110.08c4.48,0,8.64,2.42,10.86,6.32l54.29,95.68c2.16,3.8,2.16,8.52,0,12.32l-54.29,95.68c-2.21,3.9-6.37,6.32-10.86,6.32h-18.51Z"/>'

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Greedy word-wrap with an approximate character-width model (no font metrics
 * available in a pure SVG string). Respects explicit newlines, caps the number
 * of lines, and ellipsizes the final line when content overflows.
 */
function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
  charFactor = 0.56,
): string[] {
  const charW = fontSize * charFactor
  const maxChars = Math.max(4, Math.floor(maxWidth / charW))

  // Build every wrapped line first (respecting explicit newlines + hard-breaks),
  // then truncate to `maxLines` with an ellipsis if the content overflows.
  const all: string[] = []
  for (const seg of text.split(/\r?\n/)) {
    const words = seg.split(/\s+/).filter(Boolean)
    if (words.length === 0) continue
    let line = ""
    for (let word of words) {
      // Hard-break a single word longer than a full line.
      while (word.length > maxChars) {
        if (line) {
          all.push(line)
          line = ""
        }
        all.push(word.slice(0, maxChars))
        word = word.slice(maxChars)
      }
      if (!word) continue
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length <= maxChars) {
        line = candidate
      } else {
        if (line) all.push(line)
        line = word
      }
    }
    if (line) all.push(line)
  }

  if (all.length === 0) return [text.slice(0, maxChars)]
  if (all.length <= maxLines) return all

  // Overflow: keep `maxLines` and ellipsize the last visible line.
  const kept = all.slice(0, maxLines)
  let last = kept[maxLines - 1]
  if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1)
  kept[maxLines - 1] = last.replace(/[\s…]+$/, "") + "…"
  return kept
}

/** Build the `<g>` markup for a path-based icon scaled to `size` px. */
function renderIconLogo(icon: IconData, size: number, x: number, y: number, color: string): {
  svg: string
  width: number
  height: number
} {
  const vb = (icon.viewBox || "0 0 24 24").split(/\s+/).map(Number)
  const vbW = vb[2] && vb[2] > 0 ? vb[2] : 24
  const vbH = vb[3] && vb[3] > 0 ? vb[3] : 24
  const scale = r2(size / Math.max(vbW, vbH))
  const scaledW = r2(vbW * scale)
  const scaledH = r2(vbH * scale)
  const pathSvg =
    icon.paths && icon.paths.length
      ? icon.paths.map((d) => `<path d="${d}" />`).join("")
      : `<path d="${icon.path}" />`
  const paint = icon.isStroke
    ? `fill="none" stroke="${color}" stroke-width="${icon.strokeWidth ?? 2}" stroke-linecap="${icon.strokeLinecap ?? "round"}" stroke-linejoin="${icon.strokeLinejoin ?? "round"}"`
    : `fill="${color}"${icon.fillRule ? ` fill-rule="${icon.fillRule}"` : ""}`
  const svg = `<g transform="translate(${r2(x)}, ${r2(y)}) scale(${scale})" ${paint}>${pathSvg}</g>`
  return { svg, width: scaledW, height: scaledH }
}

/**
 * Render a repository header to an SVG string.
 */
export function renderHeader(cfg: HeaderConfig): string {
  const { width, height, background: bg, align } = cfg
  const fontStack = cfg.fontFamily ?? resolveFontFamily("inter")
  const radius = clamp(cfg.radius, 0, Math.min(width, height) / 2)
  const isLight = bg.isLight

  const fg = cfg.titleColor ? `#${cfg.titleColor.replace(/^#/, "")}` : isLight ? "#18181b" : "#fafafa"
  const muted = cfg.subtitleColor
    ? `#${cfg.subtitleColor.replace(/^#/, "")}`
    : isLight
      ? "rgba(24,24,27,0.72)"
      : "rgba(250,250,250,0.74)"

  const padX = clamp(Math.round(width * 0.075), 32, 128)
  const availW = width - padX * 2

  // Type scale derived from canvas height.
  const titleSize = clamp(Math.round(height * 0.155), 26, 66)
  const subtitleSize = clamp(Math.round(titleSize * 0.42), 14, 28)
  const logoSize = clamp(Math.round(height * 0.22), 40, 132)

  const titleLines = cfg.title ? wrapText(cfg.title, availW, titleSize, 2, 0.56) : []
  const subtitleLines = cfg.subtitle ? wrapText(cfg.subtitle, availW, subtitleSize, 2, 0.54) : []

  const hasLogo = !!(cfg.logo && (cfg.logo.icon || cfg.logo.imageDataUri))

  // Vertical rhythm.
  const titleLineH = r2(titleSize * 1.12)
  const subLineH = r2(subtitleSize * 1.3)
  const logoGap = hasLogo ? r2(titleSize * 0.5) : 0
  const titleGap = subtitleLines.length ? r2(titleSize * 0.32) : 0

  const logoH = hasLogo ? logoSize : 0
  const titleBlockH = titleLines.length * titleLineH
  const subBlockH = subtitleLines.length * subLineH
  const totalH = logoH + logoGap + titleBlockH + titleGap + subBlockH

  let cursorY = r2((height - totalH) / 2)

  const cx = align === "center" ? width / 2 : padX
  const anchor = align === "center" ? "middle" : "start"

  const parts: string[] = []

  // --- Logo ---
  if (hasLogo && cfg.logo) {
    if (cfg.logo.imageDataUri) {
      const x = align === "center" ? r2(cx - logoSize / 2) : padX
      parts.push(
        `<image href="${cfg.logo.imageDataUri}" x="${x}" y="${r2(cursorY)}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />`,
      )
    } else if (cfg.logo.icon) {
      const color = cfg.logo.color ? `#${cfg.logo.color.replace(/^#/, "")}` : fg
      // Measure first so we can horizontally center non-square glyphs.
      const measured = renderIconLogo(cfg.logo.icon, logoSize, 0, 0, color)
      const x = align === "center" ? r2(cx - measured.width / 2) : padX
      // Vertically center within the reserved logo box.
      const y = r2(cursorY + (logoSize - measured.height) / 2)
      parts.push(renderIconLogo(cfg.logo.icon, logoSize, x, y, color).svg)
    }
    cursorY += logoH + logoGap
  }

  // --- Title ---
  if (titleLines.length) {
    // Baseline of the first line.
    let ty = r2(cursorY + titleSize * 0.86)
    for (const line of titleLines) {
      parts.push(
        `<text x="${r2(cx)}" y="${ty}" text-anchor="${anchor}" font-size="${titleSize}" font-weight="700" fill="${fg}" font-family="${fontStack}" letter-spacing="-0.02em">${esc(line)}</text>`,
      )
      ty = r2(ty + titleLineH)
    }
    cursorY += titleBlockH + titleGap
  }

  // --- Subtitle ---
  if (subtitleLines.length) {
    let sy = r2(cursorY + subtitleSize * 0.82)
    for (const line of subtitleLines) {
      parts.push(
        `<text x="${r2(cx)}" y="${sy}" text-anchor="${anchor}" font-size="${subtitleSize}" font-weight="400" fill="${muted}" font-family="${fontStack}">${esc(line)}</text>`,
      )
      sy = r2(sy + subLineH)
    }
  }

  // --- Watermark ---
  let watermark = ""
  if (cfg.watermark) {
    const wmColor = isLight ? "rgba(24,24,27,0.5)" : "rgba(250,250,250,0.5)"
    const wmSize = 14
    const lx = width - 20 - wmSize
    const ly = height - 20 - wmSize
    watermark =
      `<g>` +
      `<text x="${lx - 6}" y="${r2(ly + wmSize / 2 + 4)}" text-anchor="end" font-size="${wmSize}" font-weight="500" fill="${wmColor}" font-family="${fontStack}">shieldcn.dev</text>` +
      `<g transform="translate(${lx}, ${ly}) scale(${r2(wmSize / 512)})" fill="${wmColor}">${SHIELDCN_LOGO}</g>` +
      `</g>`
  }

  const clipId = "headerClip"
  const borderColor = bg.border || (isLight ? "#e4e4e7" : "#27272a")
  const border = cfg.border
    ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${Math.max(0, radius - 0.5)}" fill="none" stroke="${borderColor}" stroke-width="1" />`
    : ""

  const ariaLabel = esc([cfg.title, cfg.subtitle].filter(Boolean).join(" — ") || "header")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
  <defs>
    <clipPath id="${clipId}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" /></clipPath>
    ${bg.defs}
  </defs>
  <g clip-path="url(#${clipId})">
    ${bg.layers}
    ${parts.join("\n    ")}
  </g>
  ${border}
  ${watermark}
</svg>`
}
