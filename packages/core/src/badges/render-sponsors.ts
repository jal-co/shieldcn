/**
 * shieldcn
 * src/badges/render-sponsors
 *
 * Sponsors grid image renderer. Hand-built SVG (like the header / chart
 * renderers) so the result is safe inside a sandboxed `<img>` SVG — no
 * external CSS, no CSS variables, no remote image refs (every avatar is
 * inlined by the route handler as a base64 data URI before it reaches here).
 *
 * A sponsors image is: an optional title, then one or more tiers, each a
 * centered grid of circular sponsor avatars with an optional name caption.
 * Tiers let the repo owner pin "special sponsors" larger at the top and
 * "backers" smaller at the bottom. Layout and sizing are driven by the URL.
 */

import { resolveFontFamily } from "./render-chart"
import { resolveHeaderBackground } from "./header-backgrounds"

export interface SponsorAvatar {
  login: string
  /** Display name (falls back to login when absent). */
  name: string | null
  /** Inlined avatar image (`data:image/...;base64,...`) or undefined. */
  imageDataUri?: string
  url: string
}

export interface SponsorTier {
  /** Optional centered heading above the row (e.g. "Special Sponsors"). */
  title?: string
  /** Avatar diameter in px. */
  size: number
  avatars: SponsorAvatar[]
}

export interface SponsorsConfig {
  /** Overall heading (e.g. "Sponsors"). Omit/empty to hide. */
  title?: string
  tiers: SponsorTier[]
  width: number
  mode: "dark" | "light"
  /** Corner radius in px. */
  radius: number
  /** font-family stack (resolved from the `font` keyword). */
  fontFamily?: string
  /** Draw a 1px hairline border around the card. */
  border: boolean
  /** Show a subtle shieldcn.dev watermark. */
  watermark: boolean
  /** Render a name caption under each avatar. */
  showNames: boolean
  /** Horizontal alignment of the card title + its rule. Default "left". */
  titleAlign?: "left" | "center" | "right"
  /** Horizontal alignment of the avatar rows + tier headings. Default "center". */
  avatarAlign?: "left" | "center" | "right"
  /**
   * How tiers are delimited:
   *  - "label" (default): a centered text heading above each tier.
   *  - "line": a hairline rule between tiers (no text headings).
   *  - "none": just vertical spacing, no headings or lines.
   */
  separator?: "label" | "line" | "none"
  /** Color (hex without #) of the "line" separator. Defaults to the border. */
  separatorColor?: string | null
  /** Message shown when there are no public sponsors. */
  emptyText?: string
  /** Override the SVG `aria-label` (defaults to a sponsors-oriented label). */
  ariaLabel?: string

  // --- Background (same premade system as headers) ---
  /** Named preset: surface | gradient | dots | grid | graph | glow | transparent. */
  preset?: string | null
  /** shadcn theme name — tints the accent / glow. */
  theme?: string | null
  /** Solid background color hex (no #). Replaces the preset base. */
  bg?: string | null
  /** Custom gradient "c1,c2[,c3][,angle]" (hex without #). */
  gradient?: string | null
  /** Overlay pattern: dots | grid | graph | none. */
  pattern?: string | null
  /** Spotlight glow color hex (no #). */
  glow?: string | null
  /** Accent color hex (no #) — also colors the title rule. */
  accent?: string | null
  /** Render with no background fill (blend into the host page). */
  transparent?: boolean
  /** Inlined background photo data URI (already fetched + base64 by the route). */
  imageDataUri?: string | null
  /** Scrim strength over a photo, 0–1. */
  overlay?: number | null
  /** Scrim tint color hex (no #). */
  tint?: string | null
}

/** shieldcn logo glyph (viewBox 0 0 512 512). */
const SHIELDCN_LOGO =
  '<path d="M148.02,363.76c-4.48,0-8.64-2.42-10.86-6.32l-54.29-95.68c-2.15-3.8-2.15-8.52,0-12.32l54.29-95.68c2.21-3.9,6.37-6.32,10.86-6.32h18.51c4.44,0,8.45,2.28,10.73,6.09,2.27,3.82,2.37,8.43.25,12.33l-42.23,77.99c-3.98,7.36-3.98,16.14,0,23.49l22.22,41.02c4.25,7.85,12.43,12.8,21.36,12.92,0,0,45.08.61,45.11.61,8.68,0,16.83-4.64,21.26-12.12l24.87-41.99c2.23-3.77,6.34-6.11,10.72-6.12l19.47-.04c4.48,0,8.49,2.29,10.76,6.12,2.27,3.83,2.35,8.45.21,12.35l-42.2,77.17c-2.19,4-6.39,6.49-10.95,6.49h-110.08Z"/><path d="M346.7,363.69c-4.44,0-8.45-2.28-10.73-6.09-2.27-3.82-2.37-8.43-.25-12.33l42.23-77.99c3.98-7.35,3.98-16.14,0-23.49l-22.22-41.02c-4.25-7.85-12.44-12.8-21.36-12.92,0,0-46.51-.63-46.53-.63-8.88,0-17.12,4.81-21.48,12.54l-23.35,41.36c-2.2,3.9-6.36,6.34-10.84,6.35l-19.21.04c-4.48,0-8.49-2.29-10.76-6.12-2.27-3.83-2.35-8.45-.22-12.36l42.2-77.17c2.19-4.01,6.39-6.5,10.95-6.5h110.08c4.48,0,8.64,2.42,10.86,6.32l54.29,95.68c2.16,3.8,2.16,8.52,0,12.32l-54.29,95.68c-2.21,3.9-6.37,6.32-10.86,6.32h-18.51Z"/>'

const AVATAR_CLIP_ID = "scAvatarClip"

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

/** Truncate `text` to roughly `maxWidth` px at `fontSize` (no font metrics). */
function truncate(text: string, maxWidth: number, fontSize: number, charFactor = 0.58): string {
  const maxChars = Math.max(3, Math.floor(maxWidth / (fontSize * charFactor)))
  if (text.length <= maxChars) return text
  return text.slice(0, Math.max(1, maxChars - 1)).replace(/\s+$/, "") + "…"
}

/**
 * Initials placeholder when an avatar image couldn't be inlined — keeps the
 * grid intact instead of leaving a hole or hot-linking a remote image.
 */
function placeholderAvatar(login: string, x: number, y: number, size: number, isLight: boolean): string {
  const bg = isLight ? "#e4e4e7" : "#27272a"
  const fg = isLight ? "#52525b" : "#a1a1aa"
  const r = size / 2
  const initial = esc((login[0] || "?").toUpperCase())
  return (
    `<circle cx="${r2(x + r)}" cy="${r2(y + r)}" r="${r2(r)}" fill="${bg}" />` +
    `<text x="${r2(x + r)}" y="${r2(y + r + size * 0.16)}" text-anchor="middle" font-size="${r2(size * 0.42)}" font-weight="600" fill="${fg}">${initial}</text>`
  )
}

/** Render one avatar (circular image + hairline ring), optionally linked. */
function renderAvatar(
  a: SponsorAvatar,
  x: number,
  y: number,
  size: number,
  ringColor: string,
  isLight: boolean,
): string {
  const img = a.imageDataUri
    ? `<image href="${a.imageDataUri}" x="${r2(x)}" y="${r2(y)}" width="${r2(size)}" height="${r2(size)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${AVATAR_CLIP_ID})" />`
    : placeholderAvatar(a.login, x, y, size, isLight)
  const ring = `<circle cx="${r2(x + size / 2)}" cy="${r2(y + size / 2)}" r="${r2(size / 2 - 0.5)}" fill="none" stroke="${ringColor}" stroke-width="1" />`
  const inner = img + ring
  // Wrap in a link so the avatar is clickable when the SVG is opened directly.
  return `<a href="${esc(a.url)}" target="_blank" rel="noopener">${inner}</a>`
}

interface TierLayout {
  svg: string
  height: number
}

/** Lay a single tier (heading + centered avatar grid) starting at `top`. */
function layoutTier(
  tier: SponsorTier,
  top: number,
  width: number,
  padX: number,
  cfg: SponsorsConfig,
  colors: { fg: string; muted: string; ring: string; isLight: boolean },
): TierLayout {
  const parts: string[] = []
  let y = top

  // Text headings only render in "label" mode; "line"/"none" delimit tiers
  // visually in the main loop instead.
  const align = cfg.avatarAlign ?? "center"
  const headingX = align === "left" ? padX : align === "right" ? width - padX : width / 2
  const headingAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle"

  const titleSize = 15
  if (tier.title && (cfg.separator ?? "label") === "label") {
    parts.push(
      `<text x="${r2(headingX)}" y="${r2(y + titleSize)}" text-anchor="${headingAnchor}" font-size="${titleSize}" font-weight="600" fill="${colors.muted}" font-family="${cfg.fontFamily}" letter-spacing="0.04em">${esc(tier.title)}</text>`,
    )
    y += titleSize + 18
  }

  const size = tier.size
  const gap = clamp(Math.round(size * 0.34), 12, 40)
  const nameSize = clamp(Math.round(size * 0.18), 11, 14)
  const nameH = cfg.showNames ? nameSize + 8 : 0
  const cellW = size + gap
  const cellH = size + nameH + gap

  const availW = width - padX * 2
  const perRow = Math.max(1, Math.min(tier.avatars.length, Math.floor((availW + gap) / cellW)))

  let i = 0
  while (i < tier.avatars.length) {
    const rowItems = tier.avatars.slice(i, i + perRow)
    const rowW = rowItems.length * cellW - gap
    let x =
      align === "left"
        ? padX
        : align === "right"
          ? r2(width - padX - rowW)
          : r2((width - rowW) / 2)
    const rowTop = y
    for (const a of rowItems) {
      parts.push(renderAvatar(a, x, rowTop, size, colors.ring, colors.isLight))
      if (cfg.showNames) {
        const label = a.name ?? a.login
        parts.push(
          `<text x="${r2(x + size / 2)}" y="${r2(rowTop + size + nameSize + 2)}" text-anchor="middle" font-size="${nameSize}" font-weight="500" fill="${colors.fg}" font-family="${cfg.fontFamily}">${esc(truncate(label, size + gap, nameSize))}</text>`,
        )
      }
      x = r2(x + cellW)
    }
    y += cellH
    i += perRow
  }
  // Trailing gap belongs between tiers, not inside the measured block.
  y -= gap

  return { svg: parts.join("\n    "), height: y - top }
}

/**
 * Render a sponsors grid to an SVG string. Height is computed from the tiers.
 */
export function renderSponsors(cfg: SponsorsConfig): { svg: string; height: number } {
  const { width } = cfg
  const fontStack = cfg.fontFamily ?? resolveFontFamily("inter")
  cfg.fontFamily = fontStack
  const radius = clamp(cfg.radius, 0, 80)

  // Resolve the background using the shared header system. width/height only
  // affect the paint geometry — not `isLight`/`accent`/`border` — so a probe
  // pass with a provisional height yields the contrast info we need to lay out
  // text before the real height is known.
  const bgInput = {
    preset: cfg.preset,
    mode: cfg.mode,
    width,
    radius,
    theme: cfg.theme,
    transparent: cfg.transparent,
    bg: cfg.bg,
    gradient: cfg.gradient,
    pattern: cfg.pattern,
    glow: cfg.glow,
    accent: cfg.accent,
    imageDataUri: cfg.imageDataUri,
    overlay: cfg.overlay,
    tint: cfg.tint,
  }
  const probe = resolveHeaderBackground({ ...bgInput, height: 200 })
  const isLight = probe.isLight

  const fg = isLight ? "#18181b" : "#fafafa"
  const muted = isLight ? "rgba(24,24,27,0.6)" : "rgba(250,250,250,0.55)"
  const ring = isLight ? "rgba(24,24,27,0.12)" : "rgba(250,250,250,0.14)"
  const colors = { fg, muted, ring, isLight }

  const padX = clamp(Math.round(width * 0.05), 28, 80)
  const padY = 32

  const body: string[] = []
  let y = padY

  // --- Title + hairline rule ---
  if (cfg.title) {
    const titleSize = 26
    const ta = cfg.titleAlign ?? "left"
    const tx = ta === "center" ? width / 2 : ta === "right" ? width - padX : padX
    const tAnchor = ta === "center" ? "middle" : ta === "right" ? "end" : "start"
    body.push(
      `<text x="${r2(tx)}" y="${r2(y + titleSize)}" text-anchor="${tAnchor}" font-size="${titleSize}" font-weight="700" fill="${fg}" font-family="${fontStack}" letter-spacing="-0.02em">${esc(cfg.title)}</text>`,
    )
    y += titleSize + 14
    const ruleColor = cfg.accent ? `#${cfg.accent.replace(/^#/, "")}` : probe.border
    body.push(
      `<rect x="${padX}" y="${r2(y)}" width="${r2(width - padX * 2)}" height="1" fill="${ruleColor}" />`,
    )
    y += 28
  }

  const hasAny = cfg.tiers.some((t) => t.avatars.length > 0)
  if (!hasAny) {
    const msg = cfg.emptyText ?? "No public sponsors yet"
    body.push(
      `<text x="${r2(width / 2)}" y="${r2(y + 40)}" text-anchor="middle" font-size="16" font-weight="500" fill="${muted}" font-family="${fontStack}">${esc(msg)}</text>`,
    )
    y += 80
  } else {
    const separator = cfg.separator ?? "label"
    const lineColor = cfg.separatorColor ? `#${cfg.separatorColor.replace(/^#/, "")}` : probe.border
    let firstRendered = true
    for (const tier of cfg.tiers) {
      if (tier.avatars.length === 0) continue
      if (!firstRendered) {
        // A "line" separator draws a centered hairline in the inter-tier gap.
        if (separator === "line") {
          y += 6
          body.push(
            `<rect x="${padX}" y="${r2(y)}" width="${r2(width - padX * 2)}" height="1" fill="${lineColor}" />`,
          )
          y += 22
        }
      }
      const laid = layoutTier(tier, y, width, padX, cfg, colors)
      body.push(laid.svg)
      y += laid.height + 34
      firstRendered = false
    }
    y -= 34
  }

  const height = Math.round(y + padY)

  // --- Background (resolved at the real height) / border / watermark ---
  const bg = resolveHeaderBackground({ ...bgInput, height })

  const border = cfg.border
    ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${Math.max(0, radius - 0.5)}" fill="none" stroke="${bg.border}" stroke-width="1" />`
    : ""

  let watermark = ""
  if (cfg.watermark) {
    const wmColor = isLight ? "rgba(24,24,27,0.45)" : "rgba(250,250,250,0.45)"
    const wmSize = 13
    const lx = width - 18 - wmSize
    const ly = height - 16 - wmSize
    watermark =
      `<g>` +
      `<text x="${lx - 6}" y="${r2(ly + wmSize / 2 + 4)}" text-anchor="end" font-size="${wmSize}" font-weight="500" fill="${wmColor}" font-family="${fontStack}">shieldcn.dev</text>` +
      `<g transform="translate(${lx}, ${ly}) scale(${r2(wmSize / 512)})" fill="${wmColor}">${SHIELDCN_LOGO}</g>` +
      `</g>`
  }

  const ariaLabel = esc(
    cfg.ariaLabel ?? (cfg.title ? `${cfg.title} — GitHub sponsors` : "GitHub sponsors"),
  )
  const cardClipId = "scCardClip"

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">
  <defs>
    <clipPath id="${cardClipId}"><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" /></clipPath>
    <clipPath id="${AVATAR_CLIP_ID}" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5" /></clipPath>
    ${bg.defs}
  </defs>
  <g clip-path="url(#${cardClipId})">
    ${bg.layers}
    ${body.join("\n    ")}
  </g>
  ${border}
  ${watermark}
</svg>`

  return { svg, height }
}
