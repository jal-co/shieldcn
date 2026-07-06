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
import { esc, r2, clamp } from "./svg-text-utils"

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

/** shieldcn logo glyph (viewBox 0 0 1600 1600). */
const SHIELDCN_LOGO =
  '<path d="M1088.4,565.1c-6.5-4.7-15.5,0-15.5,7.9v510.2c0,21.3-18.1,38.6-40.4,38.6H160.9c-22.3,0-40.4,17.3-40.4,38.6v280.8c0,21.3,18.1,38.6,40.4,38.6h1004.5c10.8,0,21.2-4.2,28.8-11.6l273.4-266.3c7.4-7.2,11.6-16.9,11.6-27v-308.7c0-12.1-5.9-23.5-16.1-30.8l-374.7-270.3Z"/><path d="M511.2,1035.9c6.5,4.7,15.5,0,15.5-7.9v-510.2c0-21.3,18.1-38.6,40.4-38.6h871.7c22.3,0,40.4-17.3,40.4-38.6V159.7c0-21.3-18.1-38.6-40.4-38.6H434.3c-10.8,0-21.2,4.2-28.8,11.6L132,399c-7.4,7.2-11.6,16.9-11.6,27v308.7c0,12.1,5.9,23.5,16.1,30.8l374.7,270.3Z"/>'

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
      `<g transform="translate(${lx}, ${ly}) scale(${r2(wmSize / 1600)})" fill="${wmColor}">${SHIELDCN_LOGO}</g>` +
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
