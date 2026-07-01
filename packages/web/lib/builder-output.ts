/**
 * shieldcn
 * lib/builder-output
 *
 * Shared markdown/HTML/URL formatting for the header/sponsors/contributors
 * builders' "Copy output" control. badge-builder.tsx has its own richer
 * formatOutput (RST support, badge-specific picture-tag options via
 * lib/badge-output.ts) and isn't a fit here — this covers the three
 * builders whose format functions were byte-identical (or a strict
 * generalization of each other).
 */

export type ImageCopyFormat = "markdown" | "html" | "url"

export const IMAGE_COPY_FORMATS: { value: ImageCopyFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "url", label: "URL" },
]

/**
 * Format an image URL as markdown/HTML/plain output. Pass `link` to wrap
 * the image in a hyperlink (contributors builder links to the GitHub
 * contributors graph); omit it for a bare image (header/sponsors builders).
 */
export function formatImageOutput(url: string, format: ImageCopyFormat, alt: string, link?: string): string {
  switch (format) {
    case "markdown":
      return link ? `[![${alt}](${url})](${link})` : `![${alt}](${url})`
    case "html":
      return link ? `<a href="${link}"><img alt="${alt}" src="${url}" /></a>` : `<img alt="${alt}" src="${url}">`
    case "url":
      return url
  }
}
