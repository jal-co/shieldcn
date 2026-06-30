/**
 * shieldcn
 * lib/badge-output
 *
 * Shared README output helpers for badges.
 */

type BadgeOutputFormat = "markdown" | "html" | "url" | "rst" | "asciidoc"

const THEME_DERIVED_VARIANTS = new Set([
  "default",
  "secondary",
  "outline",
  "ghost",
  "branded",
])

const COLOR_LOCKING_PARAMS = [
  "color",
  "labelColor",
  "valueColor",
  "labelTextColor",
  "gradient",
]

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeMarkdownAlt(value: string): string {
  return value.replace(/[\[\]]/g, "")
}

function parseBadgeUrl(url: string): URL | null {
  try {
    return new URL(url, "https://shieldcn.dev")
  } catch {
    return null
  }
}

function serializeLikeInput(parsed: URL, original: string): string {
  if (/^https?:\/\//.test(original)) return parsed.toString()
  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function withBadgeMode(url: string, mode: "dark" | "light"): string {
  const parsed = parseBadgeUrl(url)
  if (!parsed) return url
  parsed.searchParams.set("mode", mode)
  return serializeLikeInput(parsed, url)
}

export function isThemeAdaptiveBadgeUrl(
  url: string,
  opts: { ignoreMode?: boolean } = {},
): boolean {
  const parsed = parseBadgeUrl(url)
  if (!parsed) return false
  if (!/\.(svg|png)$/.test(parsed.pathname)) return false

  const variant = parsed.searchParams.get("variant") ?? "default"
  if (!THEME_DERIVED_VARIANTS.has(variant)) return false
  if (!opts.ignoreMode && parsed.searchParams.has("mode")) return false

  return !COLOR_LOCKING_PARAMS.some((param) => parsed.searchParams.has(param))
}

export function badgePictureFromUrl(url: string, alt = "badge", linkUrl?: string): string {
  const dark = withBadgeMode(url, "dark")
  const light = withBadgeMode(url, "light")
  const pic =
    `<picture>` +
    `<source media="(prefers-color-scheme: dark)" srcset="${escapeAttr(dark)}">` +
    `<img alt="${escapeAttr(alt)}" src="${escapeAttr(light)}"></picture>`
  const link = linkUrl?.trim()
  return link ? `<a href="${escapeAttr(link)}">${pic}</a>` : pic
}

export function formatBadgeOutput(
  url: string,
  format: BadgeOutputFormat,
  opts: {
    alt?: string
    linkUrl?: string
    preferPicture?: boolean
    ignoreModeForPicture?: boolean
  } = {},
): string {
  const alt = opts.alt || "badge"
  const link = opts.linkUrl?.trim()
  const usePicture =
    opts.preferPicture &&
    (format === "markdown" || format === "html") &&
    isThemeAdaptiveBadgeUrl(url, { ignoreMode: opts.ignoreModeForPicture })

  if (usePicture) return badgePictureFromUrl(url, alt, link)

  switch (format) {
    case "markdown": {
      const img = `![${escapeMarkdownAlt(alt)}](${url})`
      return link ? `[${img}](${link})` : img
    }
    case "html": {
      const img = `<img alt="${escapeAttr(alt)}" src="${escapeAttr(url)}">`
      return link ? `<a href="${escapeAttr(link)}">${img}</a>` : img
    }
    case "rst":
      return link
        ? `.. image:: ${url}\n   :alt: ${alt}\n   :target: ${link}`
        : `.. image:: ${url}\n   :alt: ${alt}`
    case "asciidoc":
      return `image:${url}[${alt}]`
    case "url":
      return url
  }
}
