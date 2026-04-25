/**
 * shieldcn
 * app/[...slug]/route.ts
 *
 * Catch-all route handler for badge endpoints.
 * Serves SVG, JSON, and shields.io-compatible JSON responses.
 */

import { renderBadge, renderErrorBadge } from "@/lib/badges/render"
import { resolveTheme, applyColorOverrides, statusColors } from "@/lib/badges/themes"
import { getSimpleIcon } from "@/lib/badges/simple-icons"
import { getProviderBrandColor } from "@/lib/badges/brand-colors"
import { trackEvent } from "@/lib/openpanel"
import type { BadgeData, BadgeConfig, BadgeStyle, BadgeSize } from "@/lib/badges/types"

/** Check if a hex color (without #) is light enough to need dark text/icons. */
function isLightHex(hex: string): boolean {
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

/** Get the right foreground for a branded badge based on brand color. */
function brandedFg(color: string | undefined): string {
  if (!color) return "#ffffff"
  return isLightHex(color) ? "#18181b" : "#ffffff"
}

// Providers
import {
  getNpmVersion, getNpmDownloads, getNpmTotalDownloads,
  getNpmLicense, getNpmNodeVersion, getNpmTypes, getNpmDependents,
} from "@/lib/providers/npm"
import {
  getGitHubStars,
  getGitHubForks,
  getGitHubWatchers,
  getGitHubBranches,
  getGitHubReleases,
  getGitHubTags,
  getGitHubLatestTag,
  getGitHubRelease,
  getGitHubContributors,
  getGitHubCI,
  getGitHubChecks,
  getGitHubLicense,
  getGitHubIssues,
  getGitHubLabelIssues,
  getGitHubPRs,
  getGitHubMilestone,
  getGitHubCommits,
  getGitHubLastCommit,
  getGitHubAssetsDl,
  getGitHubDependabot,
} from "@/lib/providers/github"
import { getDiscordOnline, getDiscordByInvite } from "@/lib/providers/discord"
import { parseStaticBadgeContent, getDynamicJsonBadge } from "@/lib/providers/badge"
import { getRedditKarma, getRedditSubscribers } from "@/lib/providers/reddit"
import { getMemoBadge, upsertMemoBadge } from "@/lib/providers/memo"

/** Response format. */
type Format = "svg" | "png" | "json" | "shields"

/** Cache headers for responses. */
const CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
}

/**
 * Parse the format from the last URL segment.
 */
function parseFormat(segments: string[]): {
  format: Format
  cleanSegments: string[]
} {
  const last = segments[segments.length - 1]

  // /provider/.../shields.json
  if (last === "shields.json") {
    return { format: "shields", cleanSegments: segments.slice(0, -1) }
  }

  // .json extension
  if (last.endsWith(".json")) {
    const cleaned = [...segments]
    cleaned[cleaned.length - 1] = last.replace(/\.json$/, "")
    return { format: "json", cleanSegments: cleaned }
  }

  // .png extension
  if (last.endsWith(".png")) {
    const cleaned = [...segments]
    cleaned[cleaned.length - 1] = last.replace(/\.png$/, "")
    return { format: "png", cleanSegments: cleaned }
  }

  // .svg extension
  if (last.endsWith(".svg")) {
    const cleaned = [...segments]
    cleaned[cleaned.length - 1] = last.replace(/\.svg$/, "")
    return { format: "svg", cleanSegments: cleaned }
  }

  // Default to SVG
  return { format: "svg", cleanSegments: segments }
}

/**
 * Route the request to the appropriate provider.
 */
async function fetchBadgeData(
  segments: string[],
  searchParams: URLSearchParams
): Promise<BadgeData | null> {
  const provider = segments[0]

  switch (provider) {
    // /npm/{topic}/{pkg}[/{tag}]  or  /npm/{pkg}
    case "npm": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      // Check if first segment is a topic
      const npmTopics = new Set(["v", "dw", "dm", "dy", "dt", "license", "node", "types", "dependents"])
      if (npmTopics.has(rest[0])) {
        const topic = rest[0]
        const pkg = rest.slice(1, rest.length - (rest.length > 2 && !rest[rest.length - 1].includes("@") && rest[rest.length - 1] !== rest[1] ? 0 : 0)).join("/")
        // Handle scoped packages: /npm/v/@scope/pkg or /npm/v/@scope/pkg/tag
        let pkgName: string
        let tag: string | undefined
        if (rest[1]?.startsWith("@")) {
          pkgName = `${rest[1]}/${rest[2]}`
          tag = rest[3]
        } else {
          pkgName = rest[1]
          tag = rest[2]
        }
        if (!pkgName) return null

        switch (topic) {
          case "v": return getNpmVersion(pkgName, tag)
          case "dw": return getNpmDownloads(pkgName, "last-week")
          case "dm": return getNpmDownloads(pkgName, "last-month")
          case "dy": return getNpmDownloads(pkgName, "last-year")
          case "dt": return getNpmTotalDownloads(pkgName)
          case "license": return getNpmLicense(pkgName)
          case "node": return getNpmNodeVersion(pkgName)
          case "types": return getNpmTypes(pkgName)
          case "dependents": return getNpmDependents(pkgName)
          default: return null
        }
      }

      // Legacy: /npm/{package}/downloads
      if (rest[rest.length - 1] === "downloads") {
        const pkg = rest.slice(0, -1).join("/")
        if (!pkg) return null
        return getNpmDownloads(pkg)
      }

      // Default: /npm/{package} → version
      const pkg = rest.join("/")
      return getNpmVersion(pkg)
    }

    // /github/{owner}/{repo}/stars
    // /github/{owner}/{repo}/release
    // /github/{owner}/{repo}/ci
    // /github/{owner}/{repo}/license
    // /github/{topic}/{owner}/{repo}/...  OR  /github/{owner}/{repo}/{topic}/...
    // Support both: /github/stars/owner/repo AND /github/owner/repo/stars
    case "github": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      // Detect format: is rest[0] a known topic or an owner?
      const knownTopics = new Set([
        "stars", "forks", "watchers", "branches", "releases", "tags", "tag",
        "license", "release", "contributors", "ci", "checks",
        "issues", "open-issues", "closed-issues", "label-issues",
        "prs", "open-prs", "closed-prs", "merged-prs",
        "milestones", "commits", "last-commit",
        "assets-dl", "dt",
        "dependents-repo", "dependents-pkg", "dependabot",
      ])

      let topic: string
      let owner: string
      let repo: string
      let extra: string[] // remaining segments after owner/repo

      if (knownTopics.has(rest[0])) {
        // /github/{topic}/{owner}/{repo}/...
        topic = rest[0]
        owner = rest[1]
        repo = rest[2]
        extra = rest.slice(3)
      } else {
        // /github/{owner}/{repo}/{topic}/...
        owner = rest[0]
        repo = rest[1]
        topic = rest[2]
        extra = rest.slice(3)
      }

      switch (topic) {
        // Repo metadata
        case "stars":       return getGitHubStars(owner, repo)
        case "forks":       return getGitHubForks(owner, repo)
        case "watchers":    return getGitHubWatchers(owner, repo)
        case "license":     return getGitHubLicense(owner, repo)
        case "branches":    return getGitHubBranches(owner, repo)
        case "releases":    return getGitHubReleases(owner, repo)
        case "tags":        return getGitHubTags(owner, repo)
        case "tag":         return getGitHubLatestTag(owner, repo)
        case "contributors": return getGitHubContributors(owner, repo)
        case "dependabot":  return getGitHubDependabot(owner, repo)

        // Release (optional channel: stable)
        case "release":     return getGitHubRelease(owner, repo, extra[0])

        // CI (Actions)
        case "ci":
          return getGitHubCI(owner, repo,
            searchParams.get("workflow") ?? undefined,
            searchParams.get("branch") ?? undefined)

        // Checks
        case "checks":
          return getGitHubChecks(owner, repo,
            extra[0], // ref (branch/tag)
            extra.slice(1).join("/") || undefined) // check_name

        // Issues
        case "issues":
        case "open-issues":
        case "closed-issues":
          return getGitHubIssues(owner, repo, topic)

        case "label-issues":
          return getGitHubLabelIssues(owner, repo,
            extra[0] || "",
            extra[1]) // open|closed

        // PRs
        case "prs":
        case "open-prs":
        case "closed-prs":
        case "merged-prs":
          return getGitHubPRs(owner, repo, topic)

        // Milestones
        case "milestones":
          return getGitHubMilestone(owner, repo, extra[0] || "1")

        // Commits
        case "commits":     return getGitHubCommits(owner, repo, extra[0])
        case "last-commit": return getGitHubLastCommit(owner, repo, extra[0])

        // Downloads
        case "assets-dl":
        case "dt":
          return getGitHubAssetsDl(owner, repo, extra[0])

        default: return null
      }
    }

    // /discord/{serverId} or /discord/{topic}/{inviteCode}
    case "discord": {
      if (segments.length < 2) return null

      const discordTopics = new Set(["members", "online-members"])
      if (discordTopics.has(segments[1]) && segments[2]) {
        return getDiscordByInvite(segments[2], segments[1])
      }

      return getDiscordOnline(segments[1])
    }

    // /reddit/karma/u/{user} or /reddit/subscribers/r/{subreddit}
    case "reddit": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      if (rest[1] === "u") {
        return getRedditKarma(rest[2], rest[0])
      }
      if (rest[0] === "subscribers" && rest[1] === "r") {
        return getRedditSubscribers(rest[2])
      }
      return null
    }

    // /memo/{key}
    case "memo": {
      if (segments.length < 2) return null
      return getMemoBadge(segments[1])
    }

    // /badge/dynamic/json?url=&query=  → dynamic JSON badge
    // /badge/{badgeContent}             → static badge (shields.io format)
    //   badgeContent = "label-message-color" or "message-color"
    case "badge": {
      const rest = segments.slice(1)

      // Dynamic JSON: /badge/dynamic/json
      if (rest[0] === "dynamic" && rest[1] === "json") {
        return getDynamicJsonBadge(searchParams)
      }

      // Static: /badge/{badgeContent}
      if (rest.length >= 1) {
        const content = rest.join("/")
        return parseStaticBadgeContent(content)
      }

      return null
    }

    // /https/{hostname}/{pathname...}
    // Proxy an HTTPS endpoint that returns { label/subject, value/status, color }
    case "https": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null
      const endpointUrl = `https://${rest.join("/")}`

      try {
        const response = await fetch(endpointUrl, {
          headers: { Accept: "application/json", "User-Agent": "shieldcn/1.0" },
          next: { revalidate: 300 },
        })
        if (!response.ok) {
          return { label: "endpoint", value: `${response.status}`, color: "red" }
        }
        const data = await response.json()

        // Support both badgen format (subject/status) and our format (label/value)
        const label = data.label || data.subject || "badge"
        const value = data.value || data.status || data.message || "unknown"
        const color = data.color || undefined

        return { label, value, color } as BadgeData
      } catch {
        return { label: "endpoint", value: "error", color: "red" }
      }
    }

    default:
      return null
  }
}

/**
 * Map a provider/badge combination to a SimpleIcons slug and optional
 * Lucide icon name for the default icon.
 *
 * Returns { simpleIcon, lucide } — one or both may be set.
 * simpleIcon is tried first, lucide is fallback.
 */
function getDefaultLogoSlug(segments: string[]): { simpleIcon?: string; lucide?: string; reactIcon?: string } | null {
  const provider = segments[0]

  // Static / dynamic badges have no default icon
  if (provider === "badge") return null

  if (provider === "npm") return { simpleIcon: "npm" }
  if (provider === "discord") return { simpleIcon: "discord" }

  if (provider === "github") {
    // Find the topic from either /github/{topic}/owner/repo or /github/owner/repo/{topic}
    const rest = segments.slice(1)
    const knownTopics = new Set(["stars","forks","watchers","branches","releases","tags","tag",
      "license","release","contributors","ci","checks","issues","open-issues","closed-issues",
      "label-issues","prs","open-prs","closed-prs","merged-prs","milestones","commits",
      "last-commit","assets-dl","dt","dependents-repo","dependents-pkg","dependabot"])
    const topic = knownTopics.has(rest[0]) ? rest[0] : rest[2]

    if (topic === "stars") return { lucide: "star" }
    if (topic === "forks") return { lucide: "git-fork" }
    if (topic === "release" || topic === "tag") return { lucide: "tag" }
    if (topic === "ci" || topic === "checks") return null // uses status dot
    if (topic === "license") return { reactIcon: "FaBalanceScale" }
    if (topic === "contributors") return { lucide: "users" }
    if (topic === "issues" || topic === "open-issues" || topic === "closed-issues" || topic === "label-issues") return { lucide: "circle-dot" }
    if (topic === "prs" || topic === "open-prs" || topic === "closed-prs" || topic === "merged-prs") return { lucide: "git-pull-request" }
    if (topic === "commits" || topic === "last-commit") return { lucide: "git-commit-horizontal" }
    if (topic === "assets-dl" || topic === "dt") return { lucide: "download" }
    return { simpleIcon: "github" }
  }

  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const url = new URL(request.url)
  const searchParams = url.searchParams

  // Parse format from URL
  const { format, cleanSegments } = parseFormat(slug)

  if (cleanSegments.length === 0) {
    if (format === "svg") {
      return new Response(await renderErrorBadge("error", "invalid url"), {
        headers: { "Content-Type": "image/svg+xml", ...CACHE_HEADERS },
      })
    }
    return Response.json({ error: "invalid url" }, { status: 400 })
  }

  // Fetch badge data from provider
  const data = await fetchBadgeData(cleanSegments, searchParams)

  if (!data) {
    if (format === "svg") {
      return new Response(
        await renderErrorBadge(cleanSegments[0] || "error", "not found"),
        {
          headers: { "Content-Type": "image/svg+xml", ...CACHE_HEADERS },
        }
      )
    }
    return Response.json(
      { error: "not found" },
      { status: 404, headers: CACHE_HEADERS }
    )
  }

  // JSON response
  if (format === "json") {
    return Response.json(data, { headers: CACHE_HEADERS })
  }

  // Shields.io compatible JSON
  if (format === "shields") {
    return Response.json(
      {
        schemaVersion: 1,
        label: data.label,
        message: data.value,
        color: data.color || "blue",
      },
      { headers: CACHE_HEADERS }
    )
  }

  // SVG response
  const style = (searchParams.get("style") || searchParams.get("variant") || "default") as BadgeStyle
  const size = (searchParams.get("size") || undefined) as BadgeSize | undefined
  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const theme = searchParams.get("theme") ?? undefined
  const fontParam = searchParams.get("font") ?? undefined
  const font = (fontParam && ["inter", "geist", "geist-mono"].includes(fontParam) ? fontParam : undefined) as BadgeConfig["font"]
  const logoParam = searchParams.get("logo")
  const logoColor = searchParams.get("logoColor") ?? undefined

  // Resolve colors
  const isStaticBadge = cleanSegments[0] === "badge" || cleanSegments[0] === "https"
  const hasThemeOverride = !!(theme || searchParams.get("color") || searchParams.get("labelColor") || (isStaticBadge && data.color))
  let colors = resolveTheme(theme)

  // Color overrides:
  // 1. ?color= query param always wins (user-specified hex)
  // 2. For static badges (/badge/...), data.color is a resolved hex from the path
  // 3. For provider badges, data.color is a status keyword — handled by statusColor
  const colorOverride = searchParams.get("color")
    ?? (isStaticBadge && data.color ? data.color : undefined)
  const labelColorOverride = searchParams.get("labelColor") ?? undefined

  colors = applyColorOverrides(colors, {
    color: colorOverride,
    labelColor: labelColorOverride,
  })

  // Resolve icon
  // Priority: ?logo=<simpleicon-slug> > ?logo=false (hide) > default provider icon
  let iconPath: string | undefined
  let iconViewBox: string | undefined
  let iconFillRule: string | undefined
  let iconFill: string | undefined
  let brandColor: string | undefined

  // For branded variant, get provider brand color as fallback
  const provider = cleanSegments[0]
  const providerBrand = getProviderBrandColor(provider)

  if (logoParam === "false" || logoParam === "none") {
    // Explicitly hidden — still use provider brand for branded variant
    if (style === "branded" && providerBrand) {
      brandColor = providerBrand
    }
  } else if (logoParam && logoParam !== "true") {
    // Custom icon: SimpleIcons slug or lucide:name
    const si = await getSimpleIcon(logoParam, logoColor)
    if (si) {
      iconPath = si.icon.path
      iconViewBox = si.icon.viewBox
      iconFillRule = si.icon.fillRule

      // Track brand color: icon's color > provider's color
      if (si.defaultColor && si.defaultColor !== "currentColor") {
        brandColor = si.defaultColor
      } else if (providerBrand) {
        brandColor = providerBrand
      }

      // Determine icon fill color
      if (style === "branded" && !logoColor) {
        // Use the actual badge bg color for contrast, not the icon's brand color
        const effectiveBg = colorOverride ?? brandColor
        iconFill = brandedFg(effectiveBg)
      } else if (logoColor) {
        iconFill = `#${logoColor}`
      } else if (!hasThemeOverride && style === "default" && si.defaultColor !== "currentColor") {
        iconFill = `#${si.defaultColor}`
      }
    }
  } else {
    // Default provider icon
    const defaultLogo = getDefaultLogoSlug(cleanSegments)
    if (defaultLogo) {
      // Try sources in order: SimpleIcons > Lucide > React Icons
      const sources = [
        defaultLogo.simpleIcon,
        defaultLogo.lucide ? `lucide:${defaultLogo.lucide}` : null,
        defaultLogo.reactIcon ? `ri:${defaultLogo.reactIcon}` : null,
      ].filter(Boolean) as string[]

      for (const source of sources) {
        const si = await getSimpleIcon(source, logoColor)
        if (si) {
          iconPath = si.icon.path
          iconViewBox = si.icon.viewBox
          iconFillRule = si.icon.fillRule

          // Track brand color: icon's color > provider's color
          if (si.defaultColor && si.defaultColor !== "currentColor") {
            brandColor = si.defaultColor
          }
          break
        }
      }

    }

    // Fallback to provider brand color if no icon brand color found
    if (!brandColor && providerBrand) {
      brandColor = providerBrand
    }

    // For branded variant, use contrast-aware icon color (after brand color is resolved)
    if (style === "branded" && !logoColor) {
      iconFill = brandedFg(brandColor)
    }
  }

  // Resolve status color for CI badges (only when data.color is a status keyword)
  const statusColor = data.color && statusColors[data.color] ? statusColors[data.color] : undefined

  // Split mode: only when explicitly requested
  const splitParam = searchParams.get("split")
  const split = splitParam === "true" || splitParam === "1"

  // Status dot: auto for CI badges with a status color, or explicit
  const statusDotParam = searchParams.get("statusDot")
  const statusDot = statusDotParam === "true" || statusDotParam === "1"
    || (statusDotParam !== "false" && statusDotParam !== "0" && !!statusColor && !split)

  // Override label if provided
  const label = searchParams.get("label") || data.label

  // Parse configurable layout params
  function num(key: string): number | undefined {
    const v = searchParams.get(key)
    if (v === null) return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  const svg = await renderBadge({
    label,
    value: data.value,
    icon: iconPath,
    iconViewBox,
    iconFillRule,
    iconFill,
    style,
    size,
    mode,
    colors,
    statusColor,
    statusDot,
    split,
    hasThemeOverride,
    brandColor,
    font,
    valueColor: searchParams.get("valueColor") ?? undefined,
    labelTextColor: searchParams.get("labelTextColor") ?? undefined,
    labelOpacity: num("labelOpacity"),
    height: num("height"),
    fontSize: num("fontSize"),
    radius: num("radius"),
    padX: num("padX"),
    iconSize: num("iconSize"),
    gap: num("gap"),
    labelGap: num("labelGap"),
  })

  void trackEvent({
    name: "badge_rendered",
    data: {
      provider: cleanSegments[0] || "unknown",
      format,
      style,
      size: size ?? "sm",
      mode,
      split,
      statusDot,
      hasLogo: !!iconPath,
      hasThemeOverride,
      hasBrandColor: !!brandColor,
      font: font ?? "inter",
    },
  })

  // PNG response
  if (format === "png") {
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm")
    try { await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm")) } catch { /* already initialized */ }
    const resvg = new Resvg(svg)
    const png = resvg.render().asPng()

    return new Response(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        ...CACHE_HEADERS,
      },
    })
  }

  // SVG response
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      ...CACHE_HEADERS,
    },
  })
}

/**
 * PUT /memo/{key}/{label}/{value}/{color}
 * Create or update a memo badge with Bearer token auth.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  if (slug[0] !== "memo" || slug.length < 4) {
    return Response.json({ error: "Invalid memo URL. Use PUT /memo/{key}/{label}/{value}/{color}" }, { status: 400 })
  }

  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ error: "Missing Authorization: Bearer <token> header" }, { status: 401 })
  }
  const token = auth.slice(7)
  if (!token) {
    return Response.json({ error: "Empty bearer token" }, { status: 401 })
  }

  const key = slug[1]
  const label = decodeURIComponent(slug[2])
  const value = decodeURIComponent(slug[3])
  const color = slug[4] ? decodeURIComponent(slug[4]) : undefined

  const result = await upsertMemoBadge(key, label, value, color, token)

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 403 })
  }

  return Response.json({ ok: true, key, label, value, color, expiresIn: "32 days" })
}
