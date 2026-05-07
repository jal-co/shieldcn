/**
 * @shieldcn/core
 * src/migrate/transform.ts
 *
 * Parses shields.io badge URLs from markdown and transforms them
 * into equivalent shieldcn badge URLs.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeTransform {
  /** Original shields.io markdown (full `![alt](url)` or `<img>` tag) */
  original: string
  /** Original shields.io URL */
  shieldsUrl: string
  /** Transformed shieldcn URL */
  shieldcnUrl: string
  /** Replacement markdown */
  replacement: string
  /** Whether the transform is confident (vs best-effort) */
  confident: boolean
  /** Human-readable description of what was matched */
  description: string
}

export interface TransformResult {
  /** Original README content */
  original: string
  /** Transformed README content */
  transformed: string
  /** Individual badge transforms */
  badges: BadgeTransform[]
  /** Number of badges found */
  found: number
  /** Number successfully transformed */
  transformed_count: number
  /** Number skipped (no equivalent) */
  skipped: number
}

// ---------------------------------------------------------------------------
// shields.io → shieldcn mapping
// ---------------------------------------------------------------------------

/**
 * Map of shields.io path patterns to shieldcn equivalents.
 * Each entry: [regex matching shields.io path, transformer function]
 */
type PathTransformer = (
  match: RegExpExecArray,
  params: URLSearchParams,
  baseUrl: string,
) => { path: string; query: URLSearchParams; description: string } | null

const SHIELDS_PATTERNS: Array<[RegExp, PathTransformer]> = [
  // --- npm ---
  [/^\/npm\/v\/(.+)$/, (m, _p, base) => ({
    path: `/npm/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm version for ${m[1]}`,
  })],
  [/^\/npm\/dw\/(.+)$/, (m, _p, base) => ({
    path: `/npm/dw/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm weekly downloads for ${m[1]}`,
  })],
  [/^\/npm\/dm\/(.+)$/, (m, _p, base) => ({
    path: `/npm/dm/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm monthly downloads for ${m[1]}`,
  })],
  [/^\/npm\/dy\/(.+)$/, (m, _p, base) => ({
    path: `/npm/dy/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm yearly downloads for ${m[1]}`,
  })],
  [/^\/npm\/dt\/(.+)$/, (m, _p, base) => ({
    path: `/npm/dt/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm total downloads for ${m[1]}`,
  })],
  [/^\/npm\/l\/(.+)$/, (m) => ({
    path: `/npm/license/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm license for ${m[1]}`,
  })],
  [/^\/npm\/types\/(.+)$/, (m) => ({
    path: `/npm/types/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm types for ${m[1]}`,
  })],
  [/^\/npm\/node\/(.+)$/, (m) => ({
    path: `/npm/node/${m[1]}`,
    query: new URLSearchParams(),
    description: `npm node version for ${m[1]}`,
  })],

  // --- GitHub ---
  [/^\/github\/stars\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/stars/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub stars for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/forks\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/forks/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub forks for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/watchers\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/watchers/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub watchers for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/issues\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/issues/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub issues for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/issues-pr\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/prs/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub PRs for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/issues-pr-closed\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/closed-prs/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub closed PRs for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/license\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/license/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub license for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/release\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/release/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub release for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/v\/release\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/release/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub release for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/v\/tag\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/tag/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub tag for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/contributors\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/contributors/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub contributors for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/last-commit\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/last-commit/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub last commit for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/commit-activity\/\w+\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/github/commits/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub commits for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/downloads\/([^/]+)\/([^/]+)\/total$/, (m) => ({
    path: `/github/dt/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `GitHub downloads for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/actions\/workflow\/status\/([^/]+)\/([^/]+)\/(.+)$/, (m) => ({
    path: `/github/ci/${m[1]}/${m[2]}`,
    query: new URLSearchParams({ workflow: m[3] }),
    description: `GitHub CI for ${m[1]}/${m[2]}`,
  })],
  [/^\/github\/followers\/([^/]+)$/, (m) => ({
    path: `/github/followers/${m[1]}`,
    query: new URLSearchParams(),
    description: `GitHub followers for ${m[1]}`,
  })],

  // --- PyPI ---
  [/^\/pypi\/v\/(.+)$/, (m) => ({
    path: `/pypi/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `PyPI version for ${m[1]}`,
  })],
  [/^\/pypi\/dm\/(.+)$/, (m) => ({
    path: `/pypi/dm/${m[1]}`,
    query: new URLSearchParams(),
    description: `PyPI downloads for ${m[1]}`,
  })],
  [/^\/pypi\/l\/(.+)$/, (m) => ({
    path: `/pypi/license/${m[1]}`,
    query: new URLSearchParams(),
    description: `PyPI license for ${m[1]}`,
  })],
  [/^\/pypi\/pyversions\/(.+)$/, (m) => ({
    path: `/pypi/python/${m[1]}`,
    query: new URLSearchParams(),
    description: `PyPI Python version for ${m[1]}`,
  })],

  // --- crates.io ---
  [/^\/crates\/v\/(.+)$/, (m) => ({
    path: `/crates/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `crates.io version for ${m[1]}`,
  })],
  [/^\/crates\/d\/(.+)$/, (m) => ({
    path: `/crates/downloads/${m[1]}`,
    query: new URLSearchParams(),
    description: `crates.io downloads for ${m[1]}`,
  })],
  [/^\/crates\/l\/(.+)$/, (m) => ({
    path: `/crates/license/${m[1]}`,
    query: new URLSearchParams(),
    description: `crates.io license for ${m[1]}`,
  })],

  // --- Docker ---
  [/^\/docker\/pulls\/(.+)$/, (m) => ({
    path: `/docker/pulls/${m[1]}`,
    query: new URLSearchParams(),
    description: `Docker pulls for ${m[1]}`,
  })],
  [/^\/docker\/stars\/(.+)$/, (m) => ({
    path: `/docker/stars/${m[1]}`,
    query: new URLSearchParams(),
    description: `Docker stars for ${m[1]}`,
  })],
  [/^\/docker\/v\/(.+)$/, (m) => ({
    path: `/docker/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `Docker version for ${m[1]}`,
  })],
  [/^\/docker\/image-size\/(.+)$/, (m) => ({
    path: `/docker/size/${m[1]}`,
    query: new URLSearchParams(),
    description: `Docker image size for ${m[1]}`,
  })],

  // --- Discord ---
  [/^\/discord\/(\d+)$/, (m) => ({
    path: `/discord/${m[1]}`,
    query: new URLSearchParams(),
    description: `Discord online members`,
  })],

  // --- Reddit ---
  [/^\/reddit\/subreddit-subscribers\/(.+)$/, (m) => ({
    path: `/reddit/subscribers/${m[1]}`,
    query: new URLSearchParams(),
    description: `Reddit subscribers for r/${m[1]}`,
  })],

  // --- Codecov ---
  [/^\/codecov\/c\/github\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/codecov/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `Codecov coverage for ${m[1]}/${m[2]}`,
  })],
  [/^\/codecov\/c\/gh\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/codecov/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `Codecov coverage for ${m[1]}/${m[2]}`,
  })],

  // --- Bundlephobia ---
  [/^\/bundlephobia\/min\/(.+)$/, (m) => ({
    path: `/bundlephobia/min/${m[1]}`,
    query: new URLSearchParams(),
    description: `Bundle size (min) for ${m[1]}`,
  })],
  [/^\/bundlephobia\/minzip\/(.+)$/, (m) => ({
    path: `/bundlephobia/minzip/${m[1]}`,
    query: new URLSearchParams(),
    description: `Bundle size (gzip) for ${m[1]}`,
  })],

  // --- Visual Studio Code ---
  [/^\/visual-studio-marketplace\/v\/(.+)$/, (m) => ({
    path: `/vscode/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `VS Code version for ${m[1]}`,
  })],
  [/^\/visual-studio-marketplace\/i\/(.+)$/, (m) => ({
    path: `/vscode/installs/${m[1]}`,
    query: new URLSearchParams(),
    description: `VS Code installs for ${m[1]}`,
  })],
  [/^\/visual-studio-marketplace\/r\/(.+)$/, (m) => ({
    path: `/vscode/rating/${m[1]}`,
    query: new URLSearchParams(),
    description: `VS Code rating for ${m[1]}`,
  })],

  // --- YouTube ---
  [/^\/youtube\/channel\/subscribers\/(.+)$/, (m) => ({
    path: `/youtube/subscribers/${m[1]}`,
    query: new URLSearchParams(),
    description: `YouTube subscribers`,
  })],
  [/^\/youtube\/channel\/views\/(.+)$/, (m) => ({
    path: `/youtube/views/${m[1]}`,
    query: new URLSearchParams(),
    description: `YouTube channel views`,
  })],

  // --- NuGet ---
  [/^\/nuget\/v\/(.+)$/, (m) => ({
    path: `/nuget/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `NuGet version for ${m[1]}`,
  })],
  [/^\/nuget\/dt\/(.+)$/, (m) => ({
    path: `/nuget/downloads/${m[1]}`,
    query: new URLSearchParams(),
    description: `NuGet downloads for ${m[1]}`,
  })],

  // --- Packagist ---
  [/^\/packagist\/v\/(.+)$/, (m) => ({
    path: `/packagist/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `Packagist version for ${m[1]}`,
  })],
  [/^\/packagist\/dt\/(.+)$/, (m) => ({
    path: `/packagist/downloads/${m[1]}`,
    query: new URLSearchParams(),
    description: `Packagist downloads for ${m[1]}`,
  })],
  [/^\/packagist\/l\/(.+)$/, (m) => ({
    path: `/packagist/license/${m[1]}`,
    query: new URLSearchParams(),
    description: `Packagist license for ${m[1]}`,
  })],

  // --- RubyGems ---
  [/^\/gem\/v\/(.+)$/, (m) => ({
    path: `/rubygems/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `RubyGems version for ${m[1]}`,
  })],
  [/^\/gem\/dt\/(.+)$/, (m) => ({
    path: `/rubygems/downloads/${m[1]}`,
    query: new URLSearchParams(),
    description: `RubyGems downloads for ${m[1]}`,
  })],

  // --- Homebrew ---
  [/^\/homebrew\/v\/(.+)$/, (m) => ({
    path: `/homebrew/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `Homebrew version for ${m[1]}`,
  })],
  [/^\/homebrew\/cask\/v\/(.+)$/, (m) => ({
    path: `/homebrew/cask/${m[1]}`,
    query: new URLSearchParams(),
    description: `Homebrew cask version for ${m[1]}`,
  })],

  // --- Maven ---
  [/^\/maven-central\/v\/([^/]+)\/([^/]+)$/, (m) => ({
    path: `/maven/v/${m[1]}/${m[2]}`,
    query: new URLSearchParams(),
    description: `Maven version for ${m[1]}:${m[2]}`,
  })],

  // --- Pub.dev ---
  [/^\/pub\/v\/(.+)$/, (m) => ({
    path: `/pub/v/${m[1]}`,
    query: new URLSearchParams(),
    description: `pub.dev version for ${m[1]}`,
  })],
  [/^\/pub\/likes\/(.+)$/, (m) => ({
    path: `/pub/likes/${m[1]}`,
    query: new URLSearchParams(),
    description: `pub.dev likes for ${m[1]}`,
  })],
  [/^\/pub\/points\/(.+)$/, (m) => ({
    path: `/pub/points/${m[1]}`,
    query: new URLSearchParams(),
    description: `pub.dev points for ${m[1]}`,
  })],

  // --- Static badge (shields.io format) ---
  // /badge/label-message-color or /badge/message-color
  [/^\/badge\/(.+)$/, (m) => ({
    path: `/badge/${m[1]}`,
    query: new URLSearchParams(),
    description: `Static badge: ${decodeURIComponent(m[1])}`,
  })],
]

// ---------------------------------------------------------------------------
// shields.io query param → shieldcn query param mapping
// ---------------------------------------------------------------------------

function mapShieldsParams(
  shieldsParams: URLSearchParams,
  targetQuery: URLSearchParams,
): URLSearchParams {
  const out = new URLSearchParams(targetQuery)

  // style → variant
  const style = shieldsParams.get("style")
  if (style === "flat" || style === "flat-square" || style === "plastic") {
    out.set("variant", "default")
  } else if (style === "for-the-badge") {
    out.set("variant", "default")
    out.set("size", "default")
  } else if (style === "social") {
    out.set("variant", "secondary")
  }

  // logo → logo
  const logo = shieldsParams.get("logo")
  if (logo) out.set("logo", logo)

  // logoColor → logoColor
  const logoColor = shieldsParams.get("logoColor")
  if (logoColor) out.set("logoColor", logoColor.replace(/^#/, ""))

  // label → label
  const label = shieldsParams.get("label")
  if (label) out.set("label", label)

  // color → color
  const color = shieldsParams.get("color")
  if (color) out.set("color", color.replace(/^#/, ""))

  // labelColor → labelColor
  const labelColor = shieldsParams.get("labelColor")
  if (labelColor) out.set("labelColor", labelColor.replace(/^#/, ""))

  return out
}

// ---------------------------------------------------------------------------
// Extract shields.io URLs from markdown
// ---------------------------------------------------------------------------

/** Regex to find shields.io badge images in markdown */
const SHIELDS_MARKDOWN_RE =
  /!\[([^\]]*)\]\((https?:\/\/(?:img\.shields\.io|shields\.io)\/[^)]+)\)/g

/** Regex to find shields.io badge images in HTML img tags */
const SHIELDS_HTML_RE =
  /<img[^>]+src=["'](https?:\/\/(?:img\.shields\.io|shields\.io)\/[^"']+)["'][^>]*>/g

// ---------------------------------------------------------------------------
// Core transform function
// ---------------------------------------------------------------------------

/**
 * Transform a single shields.io URL to a shieldcn URL.
 * Returns null if no mapping exists.
 */
export function transformShieldsUrl(
  shieldsUrl: string,
  baseUrl: string,
): { shieldcnUrl: string; description: string; confident: boolean } | null {
  let parsed: URL
  try {
    parsed = new URL(shieldsUrl)
  } catch {
    return null
  }

  // Strip trailing extension (.svg, .png, .json)
  let pathname = parsed.pathname.replace(/\.(svg|png|json)$/, "")

  for (const [pattern, transformer] of SHIELDS_PATTERNS) {
    const match = pattern.exec(pathname)
    if (match) {
      const result = transformer(match, parsed.searchParams, baseUrl)
      if (result) {
        const mappedParams = mapShieldsParams(parsed.searchParams, result.query)
        const queryString = mappedParams.toString()
        const ext = ".svg" // always output SVG
        const shieldcnUrl =
          `${baseUrl}${result.path}${ext}${queryString ? `?${queryString}` : ""}`
        return {
          shieldcnUrl,
          description: result.description,
          confident: true,
        }
      }
    }
  }

  return null
}

/**
 * Transform all shields.io badges in a markdown README.
 */
export function transformReadme(
  readme: string,
  baseUrl: string = "https://shieldcn.dev",
): TransformResult {
  const badges: BadgeTransform[] = []
  let transformed = readme

  // Process markdown image syntax: ![alt](url)
  const mdMatches = [...readme.matchAll(SHIELDS_MARKDOWN_RE)]
  for (const match of mdMatches) {
    const [full, alt, url] = match
    const result = transformShieldsUrl(url, baseUrl)
    if (result) {
      badges.push({
        original: full,
        shieldsUrl: url,
        shieldcnUrl: result.shieldcnUrl,
        replacement: `![${alt}](${result.shieldcnUrl})`,
        confident: result.confident,
        description: result.description,
      })
    }
  }

  // Process HTML img tags: <img src="url" />
  const htmlMatches = [...readme.matchAll(SHIELDS_HTML_RE)]
  for (const match of htmlMatches) {
    const [full, url] = match
    const result = transformShieldsUrl(url, baseUrl)
    if (result) {
      const replacement = full.replace(url, result.shieldcnUrl)
      badges.push({
        original: full,
        shieldsUrl: url,
        shieldcnUrl: result.shieldcnUrl,
        replacement,
        confident: result.confident,
        description: result.description,
      })
    }
  }

  // Apply transforms (process in reverse order to preserve indices)
  const sortedBadges = [...badges].sort((a, b) => {
    const aIdx = readme.indexOf(a.original)
    const bIdx = readme.indexOf(b.original)
    return bIdx - aIdx
  })

  for (const badge of sortedBadges) {
    transformed = transformed.replace(badge.original, badge.replacement)
  }

  const found = mdMatches.length + htmlMatches.length
  return {
    original: readme,
    transformed,
    badges,
    found,
    transformed_count: badges.length,
    skipped: found - badges.length,
  }
}
