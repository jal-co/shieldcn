/**
 * shieldcn
 * lib/badge-output.test
 *
 * The showcase / badge modal renders a theme-adaptive <picture> only for
 * variants whose colors change with the light/dark theme. A `branded` badge is
 * driven by its fixed brand color, so its Markdown must stay a plain
 * `![alt](url)` — not turn into an HTML <picture> block.
 */

import { describe, it, expect } from "vitest"
import { formatBadgeOutput, isThemeAdaptiveBadgeUrl } from "./badge-output"

const BASE = "https://shieldcn.dev"

describe("branded badges are not theme-adaptive", () => {
  it("isThemeAdaptiveBadgeUrl is false for branded (even ignoring mode)", () => {
    const url = `${BASE}/badge/React.svg?variant=branded&brand=react&mode=dark`
    expect(isThemeAdaptiveBadgeUrl(url, { ignoreMode: true })).toBe(false)
  })

  it("markdown for a branded badge is a plain image, not <picture>", () => {
    const url = `${BASE}/badge/React.svg?variant=branded&brand=react&mode=dark`
    const md = formatBadgeOutput(url, "markdown", {
      alt: "React",
      preferPicture: true,
      ignoreModeForPicture: true,
    })
    expect(md).toBe(`![React](${url})`)
    expect(md).not.toContain("<picture")
  })

  it("still emits <picture> for a genuinely theme-derived variant (outline)", () => {
    const url = `${BASE}/npm/react.svg?variant=outline`
    const md = formatBadgeOutput(url, "markdown", {
      alt: "npm",
      preferPicture: true,
      ignoreModeForPicture: true,
    })
    expect(md).toContain("<picture")
  })
})
