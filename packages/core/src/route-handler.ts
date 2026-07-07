/**
 * @shieldcn/core
 * src/route-handler.ts
 *
 * Shared badge request handler used by both the web site and the
 * self-hosted engine. Handles GET (badge rendering) and PUT (memo badges).
 */

import { renderBadge, renderBadgeBase, renderErrorBadge, clampBadgeDim } from "./badges/render"
import { renderChart, resolveAccent, resolveFontFamily, type ChartSeries, type ChartPoint } from "./badges/render-chart"
import { renderHeader, type HeaderLogoInput } from "./badges/render-header"
import { renderSponsors, type SponsorAvatar, type SponsorTier } from "./badges/render-sponsors"
import { resolveHeaderBackground } from "./badges/header-backgrounds"
import { getIssueHistory } from "./providers/starhistory"
import { getCommitHistory, type CommitHistory } from "./providers/commit-history"
import { getNpmDownloadSeries } from "./providers/npm"
import { formatCount } from "./format"
import { JSONPath } from "jsonpath-plus"
import { parseAnimate } from "./badges/animate"
import { renderGif } from "./badges/gif"
import { renderBadgeGroup, type GroupSegment, type GroupConfig } from "./badges/render-group"
import { resolveTheme, applyColorOverrides, statusColors, resolveColor } from "./badges/themes"
import { getSimpleIcon } from "./badges/simple-icons"
import { isTwemojiLogo, resolveTwemojiSvg } from "./badges/twemoji"
import { getProviderBrandColor } from "./badges/brand-colors"
import { parseSvg, decodeSvgDataUri } from "./badges/svg-parser"
import { normalizeSearchParams } from "./normalize-params"
import { getBrand, applyBrandToParams, getBrandFont, getBrandAsset, type BrandFontKind } from "./brands"
import { recordBadgeStat } from "./badge-stats"
import type { BadgeData, BadgeConfig, BadgeStyle, BadgeSize } from "./badges/types"
import { resolveVariant } from "./badges/validate"

/**
 * A single metric emission. Apps wire this to Sentry.metrics (or any
 * metrics backend); core stays dependency-free.
 */
export interface MetricEvent {
  /** Metric type: counter, distribution (histogram), gauge, or set. */
  type: "counter" | "distribution" | "gauge" | "set"
  /** Metric name, e.g. "badge.render_duration". */
  name: string
  /** Numeric value (or string for sets). */
  value: number | string
  /** Unit hint — Sentry uses this for display formatting. */
  unit?: "millisecond" | "none" | "byte"
  /** Key-value tags attached to the metric point. */
  tags?: Record<string, string>
}

/**
 * Options for the badge GET handler.
 */
export interface BadgeRequestOptions {
  /** Optional analytics callback. Called after badge render. */
  onTrack?: (event: { name: string; data: Record<string, string | number | boolean> }) => void
  /**
   * Optional error reporter. Called when an unexpected error is caught while
   * rendering a badge. The route still returns a valid fallback badge — this
   * callback exists so the failure isn't silently swallowed. Apps wire this to
   * Sentry (or any monitoring tool); core stays dependency-free.
   */
  onError?: (error: unknown, context: Record<string, string>) => void
  /**
   * Optional metrics callback. Called to emit counter/distribution/gauge/set
   * metrics for badge operations. Apps wire this to Sentry.metrics or any
   * metrics backend; core stays dependency-free.
   */
  onMetric?: (metric: MetricEvent) => void
}

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
} from "./providers/npm"
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
  getGitHubDownloadsAllAssetsAllReleases,
  getGitHubDownloadsAllAssetsLatest,
  getGitHubDownloadsAllAssetsTag,
  getGitHubDownloadsAssetAllReleases,
  getGitHubDownloadsAssetLatest,
  getGitHubDownloadsAssetTag,
  getGitHubFollowers,
  getGitHubUserStars,
  getGitHubSponsors,
  getGitHubSponsorsList,
  getGitHubFeaturedSponsors,
  getGitHubContributorsList,
  type SponsorEntry,
  githubRepoExists,
} from "./providers/github"
import { getDiscordOnline, getDiscordByInvite } from "./providers/discord"
import { getNbaTeamBadge } from "./providers/nba"
import { parseStaticBadgeContent, getDynamicJsonBadge, getFlagBadge } from "./providers/badge"
import { getRedditKarma, getRedditSubscribers } from "./providers/reddit"
import { getMemoBadge, upsertMemoBadge } from "./providers/memo"
import { getViewCount } from "./providers/views"
import { getPyPIVersion, getPyPIDownloads, getPyPILicense, getPyPIPythonVersion } from "./providers/pypi"
import { getCratesVersion, getCratesDownloads, getCratesLicense } from "./providers/crates"
import { getDockerPulls, getDockerStars, getDockerVersion, getDockerSize } from "./providers/docker"
import { getBlueskyFollowers, getBlueskyFollowing, getBlueskyPosts } from "./providers/bluesky"
import { getXFollow, getXMention } from "./providers/x"
import { getJSRVersion, getJSRScore } from "./providers/jsr"
import { getBundleMin, getBundleMinGzip, getBundleTreeShaking } from "./providers/bundlephobia"
import { getYouTubeSubscribers, getYouTubeChannelViews, getYouTubeVideoViews, getYouTubeLikes, getYouTubeComments } from "./providers/youtube"
import { getVSCodeInstalls, getVSCodeRating, getVSCodeVersion } from "./providers/vscode"
import { getOCBackers, getOCSponsors, getOCContributors, getOCBalance, getOCBudget } from "./providers/opencollective"
import { getHNKarma } from "./providers/hackernews"
import { getMastodonFollowers, getMastodonFollowing, getMastodonPosts } from "./providers/mastodon"
import { getLemmySubscribers, getLemmyPosts, getLemmyComments } from "./providers/lemmy"
import { getPackagistVersion, getPackagistDownloads, getPackagistLicense } from "./providers/packagist"
import { getRubyGemsVersion, getRubyGemsDownloads, getRubyGemsLicense } from "./providers/rubygems"
import { getNuGetVersion, getNuGetDownloads } from "./providers/nuget"
import { getPubVersion, getPubLikes, getPubPoints, getPubPopularity } from "./providers/pub"
import { getHomebrewVersion, getHomebrewCaskVersion, getHomebrewInstalls, getHomebrewFormulaDownloads, getHomebrewCaskDownloads } from "./providers/homebrew"
import { getMavenVersion } from "./providers/maven"
import { getCocoaPodsVersion } from "./providers/cocoapods"
import { getTwitchStatus, getTwitchFollowers } from "./providers/twitch"
import { getCodecovCoverage } from "./providers/codecov"
import { getWakaTimeCodingTime } from "./providers/wakatime"
import { getTokscaleTokens, getTokscaleCost, getTokscaleRank, getTokscaleActiveDays, getTokscaleStats } from "./providers/tokscale"
import { getSkillsInstalls, getSkillsRank, getSkillsTrending, getSkillsHot } from "./providers/skills"
import { getIndieDevsUser } from "./providers/indiedevs"
import { getGitLabStars, getGitLabForks, getGitLabIssues, getGitLabPipeline, getGitLabLicense, getGitLabLastCommit, getGitLabContributors, getGitLabRelease } from "./providers/gitlab"
import { getCondaVersion, getCondaDownloads, getCondaPlatform } from "./providers/conda"
import { getChromeVersion, getChromeUsers, getChromeRating } from "./providers/chrome"
import { getAMOVersion, getAMOUsers, getAMORating, getAMODownloads } from "./providers/amo"
import { getCoverallsCoverage } from "./providers/coveralls"
import { getSonarQualityGate, getSonarBugs, getSonarVulnerabilities, getSonarCodeSmells, getSonarCoverage, getSonarDuplicatedLines, getSonarMaintainability, getSonarReliability, getSonarSecurity } from "./providers/sonar"
import { getJsDelivrHits, getJsDelivrGHHits, getJsDelivrRank } from "./providers/jsdelivr"
import { getChocolateyVersion, getChocolateyDownloads } from "./providers/chocolatey"
import { getFlathubVersion, getFlathubDownloads } from "./providers/flathub"
import { getSnapcraftVersion } from "./providers/snapcraft"
import { getFDroidVersion } from "./providers/fdroid"
import { getDiscourseTopics, getDiscoursePosts, getDiscourseUsers, getDiscourseLikes } from "./providers/discourse"
import { getStackExchangeTagQuestions, getStackExchangeReputation } from "./providers/stackexchange"
import { getModrinthDownloads, getModrinthFollowers, getModrinthVersion, getModrinthGameVersions } from "./providers/modrinth"
import { getOpenVSXVersion, getOpenVSXDownloads, getOpenVSXRating } from "./providers/openvsx"
import { getLiberapayReceiving, getLiberapayPatrons, getLiberapayGoal } from "./providers/liberapay"
import { getMatrixMembers } from "./providers/matrix"
import { getWeblateTranslation, getWeblateLanguages } from "./providers/weblate"
import { getShipperClubMember } from "./providers/shipperclub"
import { cachedFetchStale, cachedFetch, isBackedOff } from "./cache"
import { raceTimeout } from "./provider-fetch"
import { safeFetch, UnsafeUrlError, ResponseTooLargeError } from "./safe-fetch"
import { checkRateLimit, getClientIdentifier } from "./rate-limit"

/** Response format. */
type Format = "svg" | "png" | "gif" | "json" | "shields"

/**
 * Parse gradient query param into a CSS linear-gradient value.
 *
 * Formats:
 *   ?gradient=ff6b6b,4ecdc4           → linear-gradient(90deg, #ff6b6b, #4ecdc4)
 *   ?gradient=ff6b6b,4ecdc4,135       → linear-gradient(135deg, #ff6b6b, #4ecdc4)
 *   ?gradient=ff6b6b,feca57,4ecdc4    → linear-gradient(90deg, #ff6b6b, #feca57, #4ecdc4)
 *   ?gradient=ff6b6b,feca57,4ecdc4,45 → linear-gradient(45deg, #ff6b6b, #feca57, #4ecdc4)
 *
 * The last segment is treated as an angle (degrees) if it parses as a number
 * between 0 and 360. Otherwise it's treated as another color stop.
 */
function parseGradient(raw: string | null): string | undefined {
  if (!raw) return undefined
  const parts = raw.split(",").map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return undefined

  // Check if last part is an angle (number 0-360)
  const lastNum = parseFloat(parts[parts.length - 1])
  let angle = 90
  let colorParts: string[]

  if (!isNaN(lastNum) && lastNum >= 0 && lastNum <= 360 && /^\d+(\.\d+)?$/.test(parts[parts.length - 1])) {
    angle = lastNum
    colorParts = parts.slice(0, -1)
  } else {
    colorParts = parts
  }

  if (colorParts.length < 2) return undefined

  // Validate each color is a valid hex (3, 4, 6, or 8 hex chars)
  const hexRegex = /^[0-9a-fA-F]{3,8}$/
  if (!colorParts.every(c => hexRegex.test(c))) return undefined

  const stops = colorParts.map(c => `#${c}`).join(", ")
  return `linear-gradient(${angle}deg, ${stops})`
}

/** Cache headers for successful badge responses. */
const CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
}

/**
 * Cache headers for error / "not found" responses.
 *
 * Deliberately short-lived with no long `stale-while-revalidate` window:
 * an error is almost always transient (rate limit, backoff, upstream blip),
 * so it must self-heal on the next request rather than being pinned at the
 * CDN/browser for an hour the way a success is. A genuine 404 just gets
 * re-checked every minute, which is cheap.
 */
const ERROR_CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
}

/**
 * 100x1 fully transparent SVG served for permanently retired image endpoints
 * (star-history charts) so existing READMEs render nothing instead of a
 * broken image or an error badge.
 */
const TRANSPARENT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="1" viewBox="0 0 100 1"></svg>'

/**
 * Cache headers for stateful view-counter badges.
 *
 * A view counter increments on every read, so its response must never be cached
 * by the CDN or the browser — otherwise GitHub's camo proxy serves a frozen
 * image and the count stops moving. `no-store` defeats both layers; `Pragma`
 * and `Expires` cover older proxies that ignore Cache-Control.
 */
const NO_STORE_HEADERS = {
  "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

/** GitHub last-known-good cache tuning (see cachedFetchStale). */
const GITHUB_FRESH_TTL = 300 // 5 min fresh copy
const GITHUB_STALE_TTL = 60 * 60 * 24 * 7 // 7 day last-known-good fallback
const GITHUB_ERROR_TTL = 60 // "invalid repository" verdict — short, self-healing

/**
 * Parse the format from the last URL segment.
 */
function parseFormat(segments: string[]): {
  format: Format
  cleanSegments: string[]
} {
  const last = segments[segments.length - 1]
  if (!last) return { format: "svg", cleanSegments: [] }

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

  // .gif extension (animated raster — animates inside GitHub READMEs)
  if (last.endsWith(".gif")) {
    const cleaned = [...segments]
    cleaned[cleaned.length - 1] = last.replace(/\.gif$/, "")
    return { format: "gif", cleanSegments: cleaned }
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
/**
 * Resolve a GitHub badge from the path segments after the "github" provider.
 * `rest` is `segments.slice(1)` (e.g. ["stars", "owner", "repo"] or
 * ["owner", "repo", "stars"]). Returns the live badge data, or null when the
 * upstream call fails / the path is malformed — the caller (cachedFetchStale)
 * supplies the last-known-good fallback for the failure case.
 */
async function resolveGitHubBadge(
  rest: string[],
  searchParams: URLSearchParams,
): Promise<BadgeData | null> {
  // User-level endpoints (2 segments: topic + username/login)
  const userTopics = new Set(["followers", "user-stars", "sponsors"])
  if (rest.length >= 2 && userTopics.has(rest[0])) {
    const username = rest[1]
    switch (rest[0]) {
      case "followers":  return getGitHubFollowers(username)
      case "user-stars": return getGitHubUserStars(username)
      case "sponsors":   return getGitHubSponsors(username)
      default: return null
    }
  }

  if (rest.length < 3) return null

  // Detect format: is rest[0] a known topic or an owner?
  const knownTopics = new Set([
    "stars", "forks", "watchers", "branches", "releases", "tags", "tag",
    "license", "release", "contributors", "ci", "checks",
    "issues", "open-issues", "closed-issues", "label-issues",
    "prs", "open-prs", "closed-prs", "merged-prs",
    "milestones", "commits", "last-commit",
    "assets-dl", "dt",
    "downloads", "downloads-all", "downloads-asset",
    "dependabot",
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

  const result: BadgeData | null = await (async (): Promise<BadgeData | null> => {
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

    // Downloads (legacy)
    case "assets-dl":
    case "dt":
      return getGitHubAssetsDl(owner, repo, extra[0])

    // Downloads — granular
    // /github/downloads/{owner}/{repo}              → all assets, all releases
    // /github/downloads/{owner}/{repo}/latest       → all assets, latest release
    // /github/downloads/{owner}/{repo}/{tag}        → all assets, specific tag
    // /github/downloads-all/{owner}/{repo}          → all assets, all releases (alias)
    // /github/downloads-all/{owner}/{repo}/latest   → all assets, latest release
    // /github/downloads-all/{owner}/{repo}/{tag}    → all assets, specific tag
    case "downloads":
    case "downloads-all": {
      if (!extra[0]) return getGitHubDownloadsAllAssetsAllReleases(owner, repo)
      if (extra[0] === "latest") return getGitHubDownloadsAllAssetsLatest(owner, repo)
      return getGitHubDownloadsAllAssetsTag(owner, repo, extra[0])
    }

    // /github/downloads-asset/{owner}/{repo}/{assetName}           → specific asset, all releases
    // /github/downloads-asset/{owner}/{repo}/{assetName}/latest    → specific asset, latest release
    // /github/downloads-asset/{owner}/{repo}/{assetName}/{tag}     → specific asset, specific tag
    case "downloads-asset": {
      if (!extra[0]) return null
      const assetName = extra[0]
      if (!extra[1]) return getGitHubDownloadsAssetAllReleases(owner, repo, assetName)
      if (extra[1] === "latest") return getGitHubDownloadsAssetLatest(owner, repo, assetName)
      return getGitHubDownloadsAssetTag(owner, repo, extra[1], assetName)
    }

    default: return null
  }
  })()

  if (result !== null) return result

  // The topic resolver returned nothing. Definitively distinguish a genuine
  // bad/typo'd repo from a transient upstream blip: a real 404 renders
  // "invalid repository" (a clear, terminal state), while anything we can't
  // confirm stays null so the caller serves last-known-good / a short-lived
  // "not found" that self-heals.
  const exists = await githubRepoExists(owner, repo)
  if (exists === false) {
    return {
      label: "github",
      value: "invalid repository",
      color: "failure",
      link: `https://github.com/${owner}/${repo}`,
      // Terminal error: short-cached, never persisted as last-known-good, and
      // served with short cache headers so it self-heals if the repo appears.
      error: true,
    }
  }

  // The existence probe couldn't reach GitHub either (rate limit, backoff,
  // network) — the failure is definitely transient, not a bad repo. Say so
  // honestly: a red "not found" on a valid repo reads as "your badge URL is
  // wrong" and destroys trust. Marked error:true → 60s cache, never
  // persisted as last-known-good.
  if (exists === null) {
    return GITHUB_UNAVAILABLE
  }

  return null
}

/**
 * Transient-failure verdict for GitHub badges with no last-known-good value.
 * Gray (not red), short-cached, self-heals as soon as the upstream recovers.
 */
const GITHUB_UNAVAILABLE: BadgeData = {
  label: "github",
  value: "unavailable",
  color: "cancelled",
  error: true,
}

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
      if (rest.length < 2) return null

      // Wrap GitHub resolution in a last-known-good cache. A transient
      // upstream failure (rate limit, 429/503 backoff, network blip, empty
      // token pool) then serves the previous good value instead of
      // collapsing the badge into a red "not found".
      const wf = searchParams.get("workflow")
      const br = searchParams.get("branch")
      const ghKey = rest.join("/") + (wf ? `|wf=${wf}` : "") + (br ? `|br=${br}` : "")
      let servedStale = false
      const ghData = await cachedFetchStale(
        "github",
        ghKey,
        () => resolveGitHubBadge(rest, searchParams),
        GITHUB_FRESH_TTL,
        GITHUB_STALE_TTL,
        // An "invalid repository" verdict is a terminal error, not a value:
        // cache it briefly and never persist it as last-known-good, so a repo
        // that later becomes available self-heals quickly.
        {
          isError: (d) => d.error === true,
          errorTtl: GITHUB_ERROR_TTL,
          onStale: () => { servedStale = true },
        },
      )
      if (ghData !== null) {
        // A last-known-good value is real and renderable, but possibly out of
        // date — flag it so the route serves it with short cache headers and it
        // refreshes within ~a minute of GitHub recovering instead of being
        // pinned at the CDN for the full success-cache window. Don't re-mark a
        // terminal-error verdict (already short-cached via `error`).
        if (servedStale && !ghData.error) return { ...ghData, stale: true }
        return ghData
      }

      // No data and no last-known-good. When GitHub is in a backoff window
      // the fetcher was never called, so the transient-failure verdict from
      // resolveGitHubBadge never got a chance to run — produce it here so a
      // brand-new badge during an outage reads "unavailable" (gray, 60s),
      // not "not found" (red, implies the badge URL is wrong).
      if (await isBackedOff("github")) return GITHUB_UNAVAILABLE
      return null
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

    // /nba/{team} → fan badge with team logo
    case "nba": {
      if (segments.length < 2) return getNbaTeamBadge("knicks", { label: "2026 champs", value: "Knicks" })
      return getNbaTeamBadge(segments.slice(1).join("/"))
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

    // GitHub view counters (stateful — increments on every read).
    // /views/repo/{owner}/{repo}      → repo views
    // /views/user/{username}          → profile views
    // /views/user/{username}/repos    → all-repos views
    // Migration: ?base=N is added to the live count at render (never stored).
    case "views": {
      const rest = segments.slice(1)
      const base = searchParams.get("base")
      if (rest[0] === "repo" && rest[1] && rest[2]) {
        return getViewCount("repo", `${rest[1]}/${rest[2]}`, base)
      }
      if (rest[0] === "user" && rest[1]) {
        if (rest[2] === "repos") return getViewCount("repos", rest[1], base)
        return getViewCount("user", rest[1], base)
      }
      return null
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

    // /flag/{countryCode}  → “built in {country}” with a flag inset
    case "flag": {
      if (segments.length < 2) return null
      return getFlagBadge(segments[1])
    }

    // /pypi/{topic}/{package}  or  /pypi/{package}
    case "pypi": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const pypiTopics = new Set(["v", "dd", "dw", "dm", "license", "python"])
      if (pypiTopics.has(rest[0])) {
        const topic = rest[0]
        const pkg = rest.slice(1).join("/")
        if (!pkg) return null

        switch (topic) {
          case "v": return getPyPIVersion(pkg)
          case "dd": return getPyPIDownloads(pkg, "day")
          case "dw": return getPyPIDownloads(pkg, "week")
          case "dm": return getPyPIDownloads(pkg, "month")
          case "license": return getPyPILicense(pkg)
          case "python": return getPyPIPythonVersion(pkg)
          default: return null
        }
      }

      return getPyPIVersion(rest.join("/"))
    }

    // /crates/{topic}/{crate}  or  /crates/{crate}
    case "crates": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const cratesTopics = new Set(["v", "d", "dr", "license"])
      if (cratesTopics.has(rest[0])) {
        const topic = rest[0]
        const crate = rest.slice(1).join("/")
        if (!crate) return null

        switch (topic) {
          case "v": return getCratesVersion(crate)
          case "d": return getCratesDownloads(crate, "total")
          case "dr": return getCratesDownloads(crate, "recent")
          case "license": return getCratesLicense(crate)
          default: return null
        }
      }

      return getCratesVersion(rest.join("/"))
    }

    // /docker/{topic}/{image...}
    // e.g. /docker/pulls/library/nginx or /docker/pulls/grafana/grafana
    case "docker": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const dockerTopics = new Set(["pulls", "stars", "v", "size"])
      if (dockerTopics.has(rest[0])) {
        const topic = rest[0]
        const image = rest.slice(1).join("/")

        switch (topic) {
          case "pulls": return getDockerPulls(image)
          case "stars": return getDockerStars(image)
          case "v": return getDockerVersion(image)
          case "size": return getDockerSize(image)
          default: return null
        }
      }

      // Default: /docker/{image...} → pulls
      return getDockerPulls(rest.join("/"))
    }

    // /bluesky/{topic}/{handle}
    // e.g. /bluesky/followers/chitvs.bsky.social
    case "bluesky": {
      const rest = segments.slice(1)
      if (rest.length < 1) return null

      const bskyTopics = new Set(["followers", "following", "posts"])
      if (bskyTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "followers": return getBlueskyFollowers(rest[1])
          case "following": return getBlueskyFollowing(rest[1])
          case "posts": return getBlueskyPosts(rest[1])
          default: return null
        }
      }

      // Default: /bluesky/{handle} → followers
      return getBlueskyFollowers(rest[0])
    }

    // /x/{topic}/{username} or /x/{username}
    // Static CTA badges — no API token required
    case "x":
    case "twitter": {
      const rest = segments.slice(1)
      if (rest.length < 1) return null

      const xTopics = new Set(["follow", "mention"])
      if (xTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "follow": return getXFollow(rest[1])
          case "mention": return getXMention(rest[1])
          default: return null
        }
      }

      // Default: /x/{username} → follow
      return getXFollow(rest[0])
    }

    // /jsr/{topic}/{@scope}/{name}
    // e.g. /jsr/v/@std/path or /jsr/@std/path
    case "jsr": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const jsrTopics = new Set(["v", "score"])
      if (jsrTopics.has(rest[0])) {
        const topic = rest[0]
        const scope = rest[1]
        const name = rest[2]
        if (!scope || !name) return null

        switch (topic) {
          case "v": return getJSRVersion(scope, name)
          case "score": return getJSRScore(scope, name)
          default: return null
        }
      }

      // Default: /jsr/{@scope}/{name} → version
      return getJSRVersion(rest[0], rest[1])
    }

    // /bundlephobia/{topic}/{package}
    // e.g. /bundlephobia/min/react or /bundlephobia/minzip/lodash
    case "bundlephobia": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const pkg = rest.slice(1).join("/")

      switch (topic) {
        case "min": return getBundleMin(pkg)
        case "minzip": return getBundleMinGzip(pkg)
        case "tree-shaking": return getBundleTreeShaking(pkg)
        default: return getBundleMinGzip(rest.join("/"))
      }
    }

    // /youtube/{topic}/{id}
    // e.g. /youtube/subscribers/UCxxxxxx or /youtube/views/dQw4w9WgXcQ
    case "youtube": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const id = rest[1]

      switch (topic) {
        case "subscribers": return getYouTubeSubscribers(id)
        case "channel-views": return getYouTubeChannelViews(id)
        case "views": return getYouTubeVideoViews(id)
        case "likes": return getYouTubeLikes(id)
        case "comments": return getYouTubeComments(id)
        default: return null
      }
    }

    // /vscode/{topic}/{publisher}/{extension}
    // e.g. /vscode/installs/esbenp/prettier-vscode
    case "vscode": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const publisher = rest[1]
      const extension = rest[2]

      switch (topic) {
        case "installs": return getVSCodeInstalls(publisher, extension)
        case "rating": return getVSCodeRating(publisher, extension)
        case "v": return getVSCodeVersion(publisher, extension)
        default: return null
      }
    }

    // /opencollective/{topic}/{slug}
    // e.g. /opencollective/backers/webpack
    case "opencollective": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const slug = rest[1]

      switch (topic) {
        case "backers": return getOCBackers(slug)
        case "sponsors": return getOCSponsors(slug)
        case "contributors": return getOCContributors(slug)
        case "balance": return getOCBalance(slug)
        case "budget": return getOCBudget(slug)
        default: return getOCBackers(rest.join("/"))
      }
    }

    // /hackernews/{userId} or /hackernews/karma/{userId}
    case "hackernews": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      if (rest[0] === "karma" && rest[1]) {
        return getHNKarma(rest[1])
      }
      return getHNKarma(rest[0])
    }

    // /mastodon/{topic}/{instance}/{acct}
    // e.g. /mastodon/followers/mastodon.social/Gargron
    case "mastodon": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const instance = rest[1]
      const acct = rest[2]

      switch (topic) {
        case "followers": return getMastodonFollowers(instance, acct)
        case "following": return getMastodonFollowing(instance, acct)
        case "posts": return getMastodonPosts(instance, acct)
        default: return null
      }
    }

    // /lemmy/{topic}/{instance}/{community}
    // e.g. /lemmy/subscribers/lemmy.ml/asklemmy
    case "lemmy": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const instance = rest[1]
      const community = rest[2]

      switch (topic) {
        case "subscribers": return getLemmySubscribers(instance, community)
        case "posts": return getLemmyPosts(instance, community)
        case "comments": return getLemmyComments(instance, community)
        default: return null
      }
    }

    // /packagist/{topic}/{vendor}/{package}
    // e.g. /packagist/v/laravel/framework
    case "packagist": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const vendor = rest[1]
      const pkg = rest[2]

      switch (topic) {
        case "v": return getPackagistVersion(vendor, pkg)
        case "dt": return getPackagistDownloads(vendor, pkg, "total")
        case "dm": return getPackagistDownloads(vendor, pkg, "monthly")
        case "dd": return getPackagistDownloads(vendor, pkg, "daily")
        case "license": return getPackagistLicense(vendor, pkg)
        default: return null
      }
    }

    // /rubygems/{topic}/{gem}
    // e.g. /rubygems/v/rails
    case "rubygems": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const rubyTopics = new Set(["v", "dt", "dv", "license", "platform"])
      if (rubyTopics.has(rest[0]) && rest[1]) {
        const topic = rest[0]
        const gem = rest[1]

        switch (topic) {
          case "v": return getRubyGemsVersion(gem)
          case "dt": return getRubyGemsDownloads(gem, "total")
          case "dv": return getRubyGemsDownloads(gem, "version")
          case "license": return getRubyGemsLicense(gem)
          default: return null
        }
      }

      return getRubyGemsVersion(rest[0])
    }

    // /nuget/{topic}/{package}
    // e.g. /nuget/v/Newtonsoft.Json
    case "nuget": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const nugetTopics = new Set(["v", "dt"])
      if (nugetTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "v": return getNuGetVersion(rest[1])
          case "dt": return getNuGetDownloads(rest[1])
          default: return null
        }
      }

      return getNuGetVersion(rest[0])
    }

    // /pub/{topic}/{package}
    // e.g. /pub/v/flutter_bloc or /pub/likes/riverpod
    case "pub": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const pubTopics = new Set(["v", "likes", "points", "popularity"])
      if (pubTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "v": return getPubVersion(rest[1])
          case "likes": return getPubLikes(rest[1])
          case "points": return getPubPoints(rest[1])
          case "popularity": return getPubPopularity(rest[1])
          default: return null
        }
      }

      return getPubVersion(rest[0])
    }

    // /homebrew/{topic}/{formula}
    // e.g. /homebrew/v/node or /homebrew/cask/firefox
    case "homebrew": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const brewTopics = new Set(["v", "cask", "installs", "dm", "dq", "dy", "cask-dm", "cask-dq", "cask-dy"])
      if (brewTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "v": return getHomebrewVersion(rest[1])
          case "cask": return getHomebrewCaskVersion(rest[1])
          case "installs": return getHomebrewInstalls(rest[1], rest[2] || "30")
          // Formula downloads: /homebrew/dm/{formula}, /homebrew/dq/{formula}, /homebrew/dy/{formula}
          case "dm": return getHomebrewFormulaDownloads(rest[1], "dm")
          case "dq": return getHomebrewFormulaDownloads(rest[1], "dq")
          case "dy": return getHomebrewFormulaDownloads(rest[1], "dy")
          // Cask downloads: /homebrew/cask-dm/{cask}, /homebrew/cask-dq/{cask}, /homebrew/cask-dy/{cask}
          case "cask-dm": return getHomebrewCaskDownloads(rest[1], "dm")
          case "cask-dq": return getHomebrewCaskDownloads(rest[1], "dq")
          case "cask-dy": return getHomebrewCaskDownloads(rest[1], "dy")
          default: return null
        }
      }

      return getHomebrewVersion(rest[0])
    }

    // /maven/{topic}/{groupId}/{artifactId}
    // e.g. /maven/v/com.google.guava/guava
    case "maven": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      if (rest[0] === "v" && rest.length >= 3) {
        return getMavenVersion(rest[1], rest[2])
      }

      // Default: treat as groupId/artifactId
      return getMavenVersion(rest[0], rest[1])
    }

    // /cocoapods/{topic}/{pod}
    // e.g. /cocoapods/v/Alamofire
    case "cocoapods": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      if (rest[0] === "v" && rest[1]) {
        return getCocoaPodsVersion(rest[1])
      }

      return getCocoaPodsVersion(rest[0])
    }

    // /twitch/{topic}/{login}
    // e.g. /twitch/status/shroud or /twitch/followers/ninja
    // e.g. /twitch/shroud → status (default)
    // Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET — providers/twitch.ts
    // returns null gracefully (same as any other misconfigured provider) when
    // those aren't set, so this is safe to route unconditionally.
    case "twitch": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const twitchTopics = new Set(["status", "followers"])
      if (twitchTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "status": return getTwitchStatus(rest[1])
          case "followers": return getTwitchFollowers(rest[1])
          default: return null
        }
      }

      return getTwitchStatus(rest[0])
    }

    // /codecov/{service}/{owner}/{repo}[/{branch}]
    // e.g. /codecov/github/codecov/codecov-cli
    case "codecov": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      return getCodecovCoverage(rest[0], rest[1], rest[2], rest[3])
    }

    // /wakatime/{username}
    // e.g. /wakatime/willfarrell
    case "wakatime": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      return getWakaTimeCodingTime(rest[0])
    }

    // /tokscale/{topic}/{username}
    // e.g. /tokscale/tokens/junhoyeo or /tokscale/cost/junhoyeo
    case "tokscale": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const tokTopics = new Set(["tokens", "cost", "rank", "active-days", "stats"])
      if (tokTopics.has(rest[0])) {
        switch (rest[0]) {
          case "tokens": return rest[1] ? getTokscaleTokens(rest[1]) : null
          case "cost": return rest[1] ? getTokscaleCost(rest[1]) : null
          case "rank": return rest[1] ? getTokscaleRank(rest[1]) : null
          case "active-days": return rest[1] ? getTokscaleActiveDays(rest[1]) : null
          case "stats": return getTokscaleStats()
          default: return null
        }
      }

      // Default: /tokscale/{username} → tokens
      return getTokscaleTokens(rest[0])
    }

    // /skills/{topic}/{owner}/{repo}/{skill}
    // e.g. /skills/installs/vercel-labs/agent-skills/vercel-react-best-practices
    case "skills": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const skillTopics = new Set(["installs", "rank", "trending", "hot"])
      if (skillTopics.has(rest[0])) {
        if (rest.length < 4) return null
        const [topic, owner, repo, skill] = rest
        switch (topic) {
          case "installs": return getSkillsInstalls(owner, repo, skill)
          case "rank": return getSkillsRank(owner, repo, skill)
          case "trending": return getSkillsTrending(owner, repo, skill)
          case "hot": return getSkillsHot(owner, repo, skill)
          default: return null
        }
      }

      // Default: /skills/{owner}/{repo}/{skill} → installs
      if (rest.length < 3) return null
      return getSkillsInstalls(rest[0], rest[1], rest[2])
    }

    // /indiedevs/{username}
    // e.g. /indiedevs/jalco
    case "indiedevs": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null
      return getIndieDevsUser(rest[0])
    }

    // /gitlab/{owner}/{repo}/{topic}
    // e.g. /gitlab/inkscape/inkscape/stars
    case "gitlab": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const owner = rest[0]
      const repo = rest[1]
      const topic = rest[2]

      switch (topic) {
        case "stars": return getGitLabStars(owner, repo)
        case "forks": return getGitLabForks(owner, repo)
        case "issues": return getGitLabIssues(owner, repo, "opened")
        case "open-issues": return getGitLabIssues(owner, repo, "opened")
        case "closed-issues": return getGitLabIssues(owner, repo, "closed")
        case "pipeline": return getGitLabPipeline(owner, repo, searchParams.get("branch") ?? undefined)
        case "license": return getGitLabLicense(owner, repo)
        case "last-commit": return getGitLabLastCommit(owner, repo)
        case "contributors": return getGitLabContributors(owner, repo)
        case "release": return getGitLabRelease(owner, repo)
        default: return null
      }
    }

    // /conda/{topic}/{channel}/{package}
    // e.g. /conda/v/conda-forge/numpy
    case "conda": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const channel = rest[1]
      const pkg = rest[2]

      switch (topic) {
        case "v": return getCondaVersion(channel, pkg)
        case "d": return getCondaDownloads(channel, pkg)
        case "platform": return getCondaPlatform(channel, pkg)
        default: return getCondaVersion(rest[0], rest[1])
      }
    }

    // /chrome/{topic}/{extensionId}
    // e.g. /chrome/v/cjpalhdlnbpafiamejdnhcphjbkeiagm
    case "chrome": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const id = rest[1]

      switch (topic) {
        case "v": return getChromeVersion(id)
        case "users": return getChromeUsers(id)
        case "rating": return getChromeRating(id)
        default: return getChromeVersion(rest[0])
      }
    }

    // /amo/{topic}/{slug}
    // e.g. /amo/v/ublock-origin
    case "amo": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const amoTopics = new Set(["v", "users", "rating", "d"])
      if (amoTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "v": return getAMOVersion(rest[1])
          case "users": return getAMOUsers(rest[1])
          case "rating": return getAMORating(rest[1])
          case "d": return getAMODownloads(rest[1])
          default: return null
        }
      }

      return getAMOVersion(rest[0])
    }

    // /coveralls/{service}/{owner}/{repo}[/{branch}]
    // e.g. /coveralls/github/lemurheavy/coveralls-ruby
    case "coveralls": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      return getCoverallsCoverage(rest[0], rest[1], rest[2], rest[3])
    }

    // /sonar/{topic}/{component}[?server=host]
    // e.g. /sonar/quality-gate/org.sonarsource.sonarqube:sonarqube
    case "sonar": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const component = rest.slice(1).join("/")
      const server = searchParams.get("server") ?? undefined

      switch (topic) {
        case "quality-gate": return getSonarQualityGate(component, server)
        case "bugs": return getSonarBugs(component, server)
        case "vulnerabilities": return getSonarVulnerabilities(component, server)
        case "code-smells": return getSonarCodeSmells(component, server)
        case "coverage": return getSonarCoverage(component, server)
        case "duplicated-lines": return getSonarDuplicatedLines(component, server)
        case "maintainability": return getSonarMaintainability(component, server)
        case "reliability": return getSonarReliability(component, server)
        case "security": return getSonarSecurity(component, server)
        default: return null
      }
    }

    // /jsdelivr/{topic}/{type}/{package}
    // e.g. /jsdelivr/hits/npm/react or /jsdelivr/rank/npm/lodash
    case "jsdelivr": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const type = rest[1]

      if (topic === "hits" || topic === "dm" || topic === "dy") {
        const period = topic === "dy" ? "year" : "month"
        if (type === "npm") return getJsDelivrHits(rest[2], period)
        if (type === "gh" && rest[3]) return getJsDelivrGHHits(rest[2], rest[3], period)
        return null
      }

      if (topic === "rank" && type === "npm") {
        return getJsDelivrRank(rest[2])
      }

      return null
    }

    // /chocolatey/{topic}/{package}
    // e.g. /chocolatey/v/git or /chocolatey/dt/nodejs
    case "chocolatey": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const chocoTopics = new Set(["v", "dt"])
      if (chocoTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "v": return getChocolateyVersion(rest[1])
          case "dt": return getChocolateyDownloads(rest[1])
          default: return null
        }
      }

      return getChocolateyVersion(rest[0])
    }

    // /flathub/{topic}/{appId}
    // e.g. /flathub/v/org.gimp.GIMP
    case "flathub": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const flatTopics = new Set(["v", "downloads"])
      if (flatTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "v": return getFlathubVersion(rest[1])
          case "downloads": return getFlathubDownloads(rest[1])
          default: return null
        }
      }

      return getFlathubVersion(rest[0])
    }

    // /snapcraft/v/{snap}
    // e.g. /snapcraft/v/vlc
    case "snapcraft": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      if (rest[0] === "v" && rest[1]) {
        return getSnapcraftVersion(rest[1])
      }

      return getSnapcraftVersion(rest[0])
    }

    // /fdroid/v/{appId}
    // e.g. /fdroid/v/org.mozilla.firefox
    case "fdroid": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      if (rest[0] === "v" && rest[1]) {
        return getFDroidVersion(rest[1])
      }

      return getFDroidVersion(rest[0])
    }

    // /discourse/{topic}/{server}
    // e.g. /discourse/topics/meta.discourse.org
    case "discourse": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const server = rest[1]

      switch (topic) {
        case "topics": return getDiscourseTopics(server)
        case "posts": return getDiscoursePosts(server)
        case "users": return getDiscourseUsers(server)
        case "likes": return getDiscourseLikes(server)
        default: return null
      }
    }

    // /stackexchange/{topic}/{tag-or-userId}[?site=stackoverflow]
    // e.g. /stackexchange/tag/javascript or /stackexchange/reputation/22656
    case "stackexchange": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const topic = rest[0]
      const site = searchParams.get("site") ?? "stackoverflow"

      switch (topic) {
        case "tag": return getStackExchangeTagQuestions(rest[1], site)
        case "reputation": return getStackExchangeReputation(rest[1], site)
        default: return null
      }
    }

    // /modrinth/{topic}/{slug}
    // e.g. /modrinth/downloads/sodium or /modrinth/v/fabric-api
    case "modrinth": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null

      const mrTopics = new Set(["downloads", "followers", "v", "game-versions"])
      if (mrTopics.has(rest[0]) && rest[1]) {
        switch (rest[0]) {
          case "downloads": return getModrinthDownloads(rest[1])
          case "followers": return getModrinthFollowers(rest[1])
          case "v": return getModrinthVersion(rest[1])
          case "game-versions": return getModrinthGameVersions(rest[1])
          default: return null
        }
      }

      return getModrinthDownloads(rest[0])
    }

    // /openvsx/{topic}/{namespace}/{extension}
    // e.g. /openvsx/v/jeanp413/open-remote-ssh
    case "openvsx": {
      const rest = segments.slice(1)
      if (rest.length < 3) return null

      const topic = rest[0]
      const namespace = rest[1]
      const extension = rest[2]

      switch (topic) {
        case "v": return getOpenVSXVersion(namespace, extension)
        case "downloads": return getOpenVSXDownloads(namespace, extension)
        case "rating": return getOpenVSXRating(namespace, extension)
        default: return null
      }
    }

    // /liberapay/{topic}/{username}
    // e.g. /liberapay/receiving/Changaco
    case "liberapay": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      switch (rest[0]) {
        case "receiving": return getLiberapayReceiving(rest[1])
        case "patrons": return getLiberapayPatrons(rest[1])
        case "goal": return getLiberapayGoal(rest[1])
        default: return getLiberapayPatrons(rest[0])
      }
    }

    // /matrix/{topic}/{roomAlias}[?server=matrix.org]
    // e.g. /matrix/members/rust:matrix.org
    case "matrix": {
      const rest = segments.slice(1)
      if (rest.length < 2) return null

      const server = searchParams.get("server") ?? "matrix.org"

      switch (rest[0]) {
        case "members": return getMatrixMembers(rest[1], server)
        default: return getMatrixMembers(rest[0], server)
      }
    }

    // /weblate/{topic}/{server}/{project}/{component}
    // e.g. /weblate/translation/hosted.weblate.org/weblate/application
    case "weblate": {
      const rest = segments.slice(1)
      if (rest.length < 4) return null

      const topic = rest[0]
      const server = rest[1]
      const project = rest[2]
      const component = rest[3]

      switch (topic) {
        case "translation": return getWeblateTranslation(server, project, component)
        case "languages": return getWeblateLanguages(server, project, component)
        default: return null
      }
    }

    // /shipperclub
    // Static shipper.club membership badge
    case "shipperclub": {
      return getShipperClubMember()
    }

    // /https/{hostname}/{pathname...}
    // Proxy an HTTPS endpoint that returns { label/subject, value/status, color }
    case "https": {
      const rest = segments.slice(1)
      if (rest.length === 0) return null
      const endpointUrl = `https://${rest.join("/")}`

      // Cached + backoff/budget-tracked like every other provider (this proxy
      // previously hit the arbitrary upstream on every CDN miss with no
      // protection).
      return cachedFetch<BadgeData>("https-proxy", `${endpointUrl}?${searchParams.toString()}`, async () => {
        try {
          const response = await raceTimeout(safeFetch(endpointUrl, {
            headers: { Accept: "application/json", "User-Agent": "shieldcn/1.0" },
          }))
          // Failure verdicts carry `error: true` so they get short error cache
          // headers and self-heal instead of being pinned at the CDN like a
          // success.
          if (!response) {
            return { label: "endpoint", value: "timeout", color: "red", error: true }
          }
          if (!response.ok) {
            return { label: "endpoint", value: `${response.status}`, color: "red", error: true }
          }
          const data = await response.json()

          // Support both badgen format (subject/status) and our format
          // (label/value). The endpoint is arbitrary user-supplied JSON — coerce
          // to strings so an object can never paint "[object Object]" or crash
          // the renderer, and accept legitimate falsy values like 0.
          const asText = (v: unknown): string | undefined => {
            if (v === null || v === undefined) return undefined
            if (typeof v === "string") return v || undefined
            if (typeof v === "number" || typeof v === "boolean") return String(v)
            return undefined
          }
          const label = asText(data.label) ?? asText(data.subject) ?? "badge"
          const value = asText(data.value) ?? asText(data.status) ?? asText(data.message) ?? "unknown"
          const color = typeof data.color === "string" ? data.color : undefined

          return { label, value, color } as BadgeData
        } catch (err) {
          return {
            label: "endpoint",
            value: err instanceof UnsafeUrlError ? "blocked url"
              : err instanceof ResponseTooLargeError ? "too large"
              : "error",
            color: "red",
            error: true,
          }
        }
      }, 300)
    }

    default:
      return null
  }
}

/**
 * Map a provider/badge combination to a SimpleIcons slug and optional
 * React Icons name for the default icon.
 *
 * Returns { simpleIcon, reactIcon } — one or both may be set.
 * simpleIcon is tried first, reactIcon is fallback.
 */
function getDefaultLogoSlug(segments: string[]): { simpleIcon?: string; reactIcon?: string } | null {
  const provider = segments[0]

  // Static / dynamic badges have no default icon
  if (provider === "badge") return null
  // Flag badges render a full-color flag inset instead of a monochrome icon.
  if (provider === "flag") return null

  if (provider === "npm") return { simpleIcon: "npm" }
  if (provider === "discord") return { simpleIcon: "discord" }
  if (provider === "nba") return null // NBA badges render the team logo as full-color art.
  if (provider === "pypi") return { simpleIcon: "pypi" }
  if (provider === "crates") return { simpleIcon: "rust" }
  if (provider === "docker") return { simpleIcon: "docker" }
  if (provider === "bluesky") return { simpleIcon: "bluesky" }
  if (provider === "x" || provider === "twitter") return { simpleIcon: "x", reactIcon: "BsTwitterX" }
  if (provider === "jsr") return { simpleIcon: "jsr" }
  if (provider === "bundlephobia") return { reactIcon: "GoPackage" }
  if (provider === "youtube") return { simpleIcon: "youtube" }
  if (provider === "vscode") return { simpleIcon: "visualstudiocode" }
  if (provider === "opencollective") return { simpleIcon: "opencollective" }
  if (provider === "hackernews") return { simpleIcon: "ycombinator" }
  if (provider === "mastodon") return { simpleIcon: "mastodon" }
  if (provider === "lemmy") return { simpleIcon: "lemmy" }
  if (provider === "packagist") return { simpleIcon: "packagist" }
  if (provider === "rubygems") return { simpleIcon: "rubygems" }
  if (provider === "nuget") return { simpleIcon: "nuget" }
  if (provider === "pub") return { simpleIcon: "dart" }
  if (provider === "homebrew") return { simpleIcon: "homebrew" }
  if (provider === "maven") return { simpleIcon: "apachemaven" }
  if (provider === "cocoapods") return { simpleIcon: "cocoapods" }
  if (provider === "twitch") return { simpleIcon: "twitch" }
  if (provider === "codecov") return { simpleIcon: "codecov" }
  if (provider === "wakatime") return { simpleIcon: "wakatime" }
  if (provider === "reddit") return { simpleIcon: "reddit" }
  if (provider === "tokscale") return { reactIcon: "GoRocket" }
  if (provider === "skills") return { simpleIcon: "vercel" }
  if (provider === "indiedevs") return { simpleIcon: "indiedevs" }
  if (provider === "gitlab") return { simpleIcon: "gitlab" }
  if (provider === "conda") return { simpleIcon: "anaconda" }
  if (provider === "chrome") return { simpleIcon: "googlechrome" }
  if (provider === "amo") return { simpleIcon: "firefox" }
  if (provider === "coveralls") return { simpleIcon: "coveralls" }
  if (provider === "sonar") return { simpleIcon: "sonarqube" }
  if (provider === "jsdelivr") return { simpleIcon: "jsdelivr" }
  if (provider === "chocolatey") return { simpleIcon: "chocolatey" }
  if (provider === "flathub") return { simpleIcon: "flathub" }
  if (provider === "snapcraft") return { simpleIcon: "snapcraft" }
  if (provider === "fdroid") return { simpleIcon: "fdroid" }
  if (provider === "discourse") return { simpleIcon: "discourse" }
  if (provider === "stackexchange") return { simpleIcon: "stackoverflow" }
  if (provider === "modrinth") return { simpleIcon: "modrinth" }
  if (provider === "openvsx") return { simpleIcon: "eclipse" }
  if (provider === "liberapay") return { simpleIcon: "liberapay" }
  if (provider === "matrix") return { simpleIcon: "matrix" }
  if (provider === "weblate") return { simpleIcon: "weblate" }
  if (provider === "shipperclub") return { simpleIcon: "shipperclub" }
  if (provider === "views") return { reactIcon: "GoEye" }

  if (provider === "github") {
    // Find the topic from either /github/{topic}/owner/repo or /github/owner/repo/{topic}
    const rest = segments.slice(1)
    const knownTopics = new Set(["stars","forks","watchers","branches","releases","tags","tag",
      "license","release","contributors","ci","checks","issues","open-issues","closed-issues",
      "label-issues","prs","open-prs","closed-prs","merged-prs","milestones","commits",
      "last-commit","assets-dl","dt","downloads","downloads-all","downloads-asset",
      "dependabot","sponsors"])
    const topic = knownTopics.has(rest[0]) ? rest[0] : rest[2]

    if (topic === "sponsors") return { simpleIcon: "githubsponsors" }
    if (topic === "stars") return { reactIcon: "GoStarFill" }
    if (topic === "forks") return { reactIcon: "GoRepoForked" }
    if (topic === "release" || topic === "tag") return { reactIcon: "GoTag" }
    if (topic === "ci" || topic === "checks") return null // uses status dot
    if (topic === "license") return { reactIcon: "FaBalanceScale" }
    if (topic === "contributors") return { reactIcon: "GoPeople" }
    if (topic === "issues" || topic === "open-issues" || topic === "closed-issues" || topic === "label-issues") return { reactIcon: "GoIssueDraft" }
    if (topic === "prs" || topic === "open-prs" || topic === "closed-prs" || topic === "merged-prs") return { reactIcon: "GoGitPullRequest" }
    if (topic === "commits" || topic === "last-commit") return { reactIcon: "GoGitCommit" }
    if (topic === "assets-dl" || topic === "dt" || topic === "downloads" || topic === "downloads-all" || topic === "downloads-asset") return { reactIcon: "GoDownload" }
    return { simpleIcon: "github" }
  }

  return null
}

/**
 * Handle a badge group request.
 *
 * URL format: /group/{badge1}+{badge2}+{badge3}.svg
 * Each badge path is a normal badge endpoint (e.g. npm/react, github/stars/vercel/next.js).
 * The + delimiter separates badge paths within the group.
 * Query params apply globally to all segments.
 */
async function handleBadgeGroup(
  cleanSegments: string[],
  searchParams: URLSearchParams,
  format: Format,
  options?: BadgeRequestOptions,
): Promise<Response> {
  // Reconstruct the raw path after "group/" and split on "+"
  const rawPath = cleanSegments.slice(1).join("/")
  const badgePaths = rawPath.split("+").map(p => p.trim()).filter(Boolean)

  if (badgePaths.length === 0) {
    if (format === "svg") {
      return new Response(await renderErrorBadge("group", "no badges specified"), {
        headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
      })
    }
    return Response.json({ error: "no badges specified" }, { status: 400, headers: ERROR_CACHE_HEADERS })
  }

  // Cap segment count — each one fans out to a parallel upstream fetch, so an
  // unbounded group is a DoS-amplification vector (one request, N upstream
  // hits).
  const MAX_GROUP_SEGMENTS = 10
  if (badgePaths.length > MAX_GROUP_SEGMENTS) {
    const msg = `too many badges in group (max ${MAX_GROUP_SEGMENTS})`
    if (format === "svg") {
      return new Response(await renderErrorBadge("group", msg), {
        headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
      })
    }
    return Response.json({ error: msg }, { status: 400, headers: ERROR_CACHE_HEADERS })
  }

  // JSON: return array of badge data
  if (format === "json") {
    let hadError = false
    const results = await Promise.all(
      badgePaths.map(async (bp) => {
        const segs = bp.split("/").filter(Boolean)
        const data = await fetchBadgeData(segs, searchParams)
        if (!data) hadError = true
        return data || { label: segs[0] || "error", value: "not found" }
      })
    )
    return Response.json(results, { headers: hadError ? ERROR_CACHE_HEADERS : CACHE_HEADERS })
  }

  // SVG/PNG: resolve each segment
  // Style applies uniformly across the whole group, so validate it against
  // the first segment's provider as a representative check — same
  // resolveVariant() the single-badge path uses, instead of an unchecked
  // `as BadgeStyle` cast that let an invalid variant reach the renderer.
  const firstSegs = badgePaths[0]!.split("/").filter(Boolean)
  const style = resolveVariant(
    firstSegs[0] ?? "",
    firstSegs.slice(1),
    searchParams.get("style") || searchParams.get("variant") || undefined,
  )
  const size = (searchParams.get("size") || undefined) as BadgeSize | undefined
  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const theme = searchParams.get("theme") ?? undefined
  const fontParam = searchParams.get("font") ?? undefined
  const font = (fontParam && ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"].includes(fontParam) ? fontParam : undefined) as GroupConfig["font"]
  const logoColor = resolveColor(searchParams.get("logoColor"))

  const colorOverride = resolveColor(searchParams.get("color"))
  const labelColorOverride = resolveColor(searchParams.get("labelColor"))
  const hasThemeOverride = !!(theme || colorOverride || labelColorOverride)
  let colors = resolveTheme(theme)
  colors = applyColorOverrides(colors, { color: colorOverride, labelColor: labelColorOverride })

  // Fetch all badge data in parallel
  const allData = await Promise.all(
    badgePaths.map(async (bp) => {
      const segs = bp.split("/").filter(Boolean)
      const data = await fetchBadgeData(segs, searchParams)
      return { segs, data }
    })
  )

  // If any segment fell back to "not found", carries a terminal-error verdict
  // (e.g. "unavailable"), or is a last-known-good value served because the live
  // fetch failed (`stale`), treat the whole group as an error response so it
  // self-heals quickly instead of being pinned at the CDN for an hour.
  const groupCacheHeaders = allData.some(({ data }) => !data || data.error || data.stale)
    ? ERROR_CACHE_HEADERS
    : CACHE_HEADERS

  // Resolve each segment with its icon
  const segments: GroupSegment[] = await Promise.all(
    allData.map(async ({ segs, data }) => {
      const badgeData = data || { label: segs[0] || "error", value: "not found" }

      // Resolve icon for this segment
      let iconPath: string | undefined
      let iconPaths: string[] | undefined
      let iconViewBox: string | undefined
      let iconFillRule: string | undefined
      let iconFill: string | undefined
      let iconIsStroke: boolean | undefined
      let iconStrokeWidth: number | undefined
      let iconStrokeLinecap: string | undefined
      let iconStrokeLinejoin: string | undefined
      let iconRotation: number | undefined
      let brandColor: string | undefined

      const provider = segs[0]
      const providerBrand = provider ? getProviderBrandColor(provider) : undefined

      // Use default provider icon
      const defaultLogo = getDefaultLogoSlug(segs)
      if (defaultLogo) {
        const sources = [
          defaultLogo.simpleIcon,
          defaultLogo.reactIcon ? `ri:${defaultLogo.reactIcon}` : null,
        ].filter(Boolean) as string[]

        for (const source of sources) {
          const si = await getSimpleIcon(source, logoColor)
          if (si) {
            iconPath = si.icon.path
            iconPaths = si.icon.paths
            iconViewBox = si.icon.viewBox
            iconFillRule = si.icon.fillRule
            iconIsStroke = si.icon.isStroke
            iconStrokeWidth = si.icon.strokeWidth
            iconStrokeLinecap = si.icon.strokeLinecap
            iconStrokeLinejoin = si.icon.strokeLinejoin
            iconRotation = si.icon.rotation
            if (si.defaultColor && si.defaultColor !== "currentColor") {
              brandColor = si.defaultColor
            }
            break
          }
        }
      }

      if (!brandColor && providerBrand) brandColor = providerBrand

      // For branded variant, pick contrast-aware icon color
      if (style === "branded" && !logoColor) {
        iconFill = brandedFg(brandColor)
      }

      const statusColor = badgeData.color && statusColors[badgeData.color]
        ? statusColors[badgeData.color]
        : undefined

      return {
        label: searchParams.get("label") || badgeData.label,
        value: badgeData.value,
        icon: iconPath,
        iconPaths,
        iconViewBox,
        iconFillRule,
        iconFill,
        iconIsStroke,
        iconStrokeWidth,
        iconStrokeLinecap,
        iconStrokeLinejoin,
        iconRotation,
        brandColor,
        statusColor,
        statusDot: !!statusColor,
      } satisfies GroupSegment
    })
  )

  const groupConfig: GroupConfig = {
    segments,
    style,
    size,
    mode,
    font,
    hasThemeOverride,
    colors,
  }

  const svg = await renderBadgeGroup(groupConfig)

  if (options?.onTrack) {
    void options.onTrack({
      name: "badge_group_rendered",
      data: {
        count: segments.length,
        format,
        style,
        size: size ?? "sm",
        mode,
        font: font ?? "inter",
      },
    })
  }

  // PNG response
  if (format === "png") {
    const { Resvg } = await ensureResvg()
    const resvg = new Resvg(svg)
    const png = resvg.render().asPng()
    return new Response(Buffer.from(png), {
      headers: { "Content-Type": "image/png", ...groupCacheHeaders },
    })
  }

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", ...groupCacheHeaders },
  })
}

/**
 * Clamp a numeric query param to a sane range, with a default.
 */
function clampNum(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null) return fallback
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * Handle a chart request.
 *
 * URL format: /chart/github/issues/{owner}/{repo}.svg
 * (star history is retired — star URLs return a 100x1 transparent image)
 * Query params: width, height, mode, theme, color, area, title.
 */
async function handleChart(
  cleanSegments: string[],
  searchParams: URLSearchParams,
  format: Format,
  options?: BadgeRequestOptions,
): Promise<Response> {
  const rest = cleanSegments.slice(1) // after "chart"

  // Star-history charts are permanently unavailable: GitHub restricted the
  // stargazers list endpoint (`/repos/{owner}/{repo}/stargazers`) to repo
  // admins/collaborators in mid-2026, so timestamped star data can no longer
  // be fetched for arbitrary repos. To avoid breaking READMEs with error
  // badges, star chart URLs now render a 100x1 transparent image.
  // https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/
  const isStarChart =
    rest[0] === "stars" || (rest[0] === "github" && rest[1] === "stars")
  if (isStarChart) {
    if (format === "json") {
      return Response.json(
        {
          error:
            "star history charts are no longer available: GitHub restricted the stargazers API to repo admins/collaborators",
          docs: "https://github.blog/changelog/2026-06-30-upcoming-access-restrictions-to-public-api-endpoints-and-ui-views/",
        },
        { status: 410, headers: CACHE_HEADERS },
      )
    }
    if (format === "png") {
      const { Resvg } = await ensureResvg()
      const png = new Resvg(TRANSPARENT_SVG).render().asPng()
      return new Response(Buffer.from(png), {
        headers: { "Content-Type": "image/png", ...CACHE_HEADERS },
      })
    }
    return new Response(TRANSPARENT_SVG, {
      headers: { "Content-Type": "image/svg+xml", ...CACHE_HEADERS },
    })
  }

  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const width = clampNum(searchParams.get("width"), 200, 2000, 800)
  const height = clampNum(searchParams.get("height"), 120, 1200, 400)
  const areaParam = searchParams.get("area")
  const accent = resolveAccent(searchParams.get("theme"), searchParams.get("color"))
  const fillParam = resolveColor(searchParams.get("fill"))
  const fill = fillParam ? `#${fillParam}` : undefined
  const fontFamily = resolveFontFamily(searchParams.get("font"))
  const logoParam = searchParams.get("logo")
  const logo = logoParam !== "false" && logoParam !== "0" && logoParam !== "none"
  const logoColorParam = resolveColor(searchParams.get("logoColor"))
  const logoColor = logoColorParam ? `#${logoColorParam}` : undefined
  const borderParam = searchParams.get("border")
  const border = borderParam !== "false" && borderParam !== "0"
  // Background: `transparent`, a hex color, or undefined (mode default surface).
  const bgParam = searchParams.get("background") ?? searchParams.get("bg")
  // Axis scale controls.
  const yScale = searchParams.get("yScale") === "log" ? "log" as const : "linear" as const
  const yMinRaw = searchParams.get("yMin")
  const yMaxRaw = searchParams.get("yMax")
  const yMin = yMinRaw !== null && Number.isFinite(parseFloat(yMinRaw)) ? parseFloat(yMinRaw) : undefined
  const yMax = yMaxRaw !== null && Number.isFinite(parseFloat(yMaxRaw)) ? parseFloat(yMaxRaw) : undefined
  const yTicks = searchParams.get("yTicks") !== null ? clampNum(searchParams.get("yTicks"), 1, 10, 4) : undefined
  const xTicks = searchParams.get("xTicks") !== null ? clampNum(searchParams.get("xTicks"), 2, 12, 3) : undefined
  let background: string | undefined
  if (bgParam === "transparent" || bgParam === "none") {
    background = "transparent"
  } else {
    const bgHex = resolveColor(bgParam)
    if (bgHex) background = `#${bgHex}`
  }

  const fail = (msg: string, status: number): Response => {
    if (format === "json") {
      return Response.json({ error: msg }, { status, headers: ERROR_CACHE_HEADERS })
    }
    const svg = renderChart({
      title: "chart",
      subtitle: msg,
      series: [],
      width,
      height,
      mode,
      area: false,
      background,
      border,
      fontFamily,
    })
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
    })
  }

  // Resolve the chart kind → data series.
  const resolved = await resolveChartData(rest, searchParams)
  if (!resolved.ok) return fail(resolved.msg, resolved.status)

  if (format === "json") {
    return Response.json(resolved.json, { headers: CACHE_HEADERS })
  }

  // Resolve an optional leading title icon. Explicit `?icon=` wins; otherwise
  // a sensible per-kind default (github mark, npm mark). `?icon=false` hides it.
  const iconParam = searchParams.get("icon")
  const iconColorParam = resolveColor(searchParams.get("iconColor"))
  let titleIcon:
    | { path?: string; paths?: string[]; viewBox?: string; fillRule?: string; isStroke?: boolean; strokeWidth?: number; strokeLinecap?: string; strokeLinejoin?: string }
    | undefined
  if (iconParam !== "false" && iconParam !== "0" && iconParam !== "none") {
    const defaultIcon =
      resolved.provider === "github" ? "github"
      : resolved.provider === "npm" ? "npm"
      : undefined
    const slug = iconParam || defaultIcon
    if (slug) {
      const si = await getSimpleIcon(slug, iconColorParam)
      if (si) titleIcon = {
        path: si.icon.path,
        paths: si.icon.paths,
        viewBox: si.icon.viewBox,
        fillRule: si.icon.fillRule,
        isStroke: si.icon.isStroke,
        strokeWidth: si.icon.strokeWidth,
        strokeLinecap: si.icon.strokeLinecap,
        strokeLinejoin: si.icon.strokeLinejoin,
      }
    }
  }
  const titleIconColor = iconColorParam ? `#${iconColorParam}` : undefined

  // Area fill defaults on for a single line, off when comparing multiple
  // series (overlapping fills get muddy) — an explicit ?area= always wins.
  const isCompare = !!(resolved.multiSeries && resolved.multiSeries.length > 1)
  const area = areaParam !== null ? areaParam !== "false" && areaParam !== "0" : !isCompare

  const series: ChartSeries[] =
    resolved.multiSeries && resolved.multiSeries.length
      ? resolved.multiSeries.map((s, i) => ({
          label: s.label,
          points: s.points,
          color: i === 0 ? accent : COMPARE_PALETTE[(i - 1) % COMPARE_PALETTE.length],
          fill: i === 0 ? fill : undefined,
        }))
      : [{ label: resolved.seriesLabel, points: resolved.points, color: accent, fill }]
  const svg = renderChart({
    title: searchParams.get("title") || resolved.title,
    subtitle: resolved.subtitle,
    series,
    width,
    height,
    mode,
    area,
    background,
    border,
    fontFamily,
    yScale,
    yMin,
    yMax,
    yTicks,
    xTicks,
    logo,
    logoColor,
    titleIcon,
    titleIconColor,
    link: resolved.link,
  })

  if (options?.onTrack) {
    void options.onTrack({
      name: "chart_rendered",
      data: { provider: resolved.provider, kind: resolved.kind, format, mode, points: resolved.points.length },
    })
  }

  if (format === "png") {
    const { Resvg } = await ensureResvg()
    const resvg = new Resvg(svg)
    const png = resvg.render().asPng()
    return new Response(Buffer.from(png), {
      headers: { "Content-Type": "image/png", ...CACHE_HEADERS },
    })
  }

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", ...CACHE_HEADERS },
  })
}

// ---------------------------------------------------------------------------
// Repository headers
// ---------------------------------------------------------------------------

/**
 * Named canvas size presets [width, height]. `banner` (the default) is sized to
 * the GitHub README content column (~750px) so it renders crisp without being
 * downscaled; the larger presets are explicit opt-ins for full-width heroes and
 * social cards.
 */
const HEADER_SIZE_PRESETS: Record<string, [number, number]> = {
  banner: [750, 260], // default — README header at content width
  wide: [1280, 400], // full-width hero
  social: [1280, 640], // GitHub repository social-preview slot (2:1)
  square: [640, 640],
}

/**
 * Resolve a `?logo=` value into renderable logo data for a header.
 * Supports: SimpleIcons/React Icons/Lucide slugs, `data:` URIs (svg or raster),
 * and remote `http(s)` image/SVG URLs (fetched + embedded). `false`/`none`
 * hides the logo.
 */
async function resolveHeaderLogo(
  logoParam: string | null,
  logoColorRaw: string | null,
): Promise<HeaderLogoInput | undefined> {
  if (!logoParam || logoParam === "false" || logoParam === "none" || logoParam === "0") {
    return undefined
  }
  const logoColor = resolveColor(logoColorRaw)

  // Inline data URI.
  if (logoParam.startsWith("data:")) {
    if (logoParam.startsWith("data:image/svg+xml")) {
      const decoded = decodeSvgDataUri(logoParam)
      const parsed = decoded ? parseSvg(decoded) : null
      if (parsed) return { icon: parsed.icon, color: logoColor }
    }
    return { imageDataUri: logoParam }
  }

  // Remote image / SVG — fetch and embed (never hot-link from a sandboxed img).
  if (/^https?:\/\//.test(logoParam)) {
    try {
      const res = await raceTimeout(
        safeFetch(logoParam, {
          headers: { Accept: "image/svg+xml,image/png,image/*", "User-Agent": "shieldcn/1.0" },
          maxBytes: MAX_HEADER_IMAGE_BYTES,
        }),
      )
      if (res?.ok) {
        const ct = res.headers.get("content-type")?.split(";")[0] || "image/png"
        if (ct.includes("svg")) {
          const text = await res.text()
          const parsed = parseSvg(text)
          if (parsed) return { icon: parsed.icon, color: logoColor }
          return { imageDataUri: `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}` }
        }
        const bytes = Buffer.from(await res.arrayBuffer())
        if (bytes.byteLength > MAX_HEADER_IMAGE_BYTES) return undefined
        return { imageDataUri: `data:${ct};base64,${bytes.toString("base64")}` }
      }
    } catch {
      // No logo art — render without a logo (blocked URL, too large, timeout, etc).
    }
    return undefined
  }

  // Icon slug (SimpleIcons / React Icons / Lucide / custom).
  const si = await getSimpleIcon(logoParam, logoColor)
  if (!si) return undefined
  // `?logoColor=brand` paints the icon in its SimpleIcons brand color.
  let color = logoColor
  if (logoColorRaw === "brand") color = si.defaultColor.replace(/^#/, "")
  return { icon: si.icon, color }
}

/** Max bytes for a fetched/inlined header background photo (~4 MB). */
const MAX_HEADER_IMAGE_BYTES = 4_000_000
/** Raster image types allowed as a header background (no SVG — photos only). */
const HEADER_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
/**
 * Strict raster `data:` image URI. The value is embedded into an SVG attribute,
 * so it must match exactly — `data:image/<type>;base64,<base64>` with nothing
 * else — to rule out attribute-breakout payloads (e.g. an embedded `"`).
 */
const DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/

/**
 * Resolve a `?image=` value into an inlined data URI for a header background.
 * Supports a `data:image/*` URI (used as-is) or an `http(s)` URL that is fetched
 * and base64-embedded (never hot-linked from a sandboxed `<img>` SVG). For
 * `images.unsplash.com` URLs we request a sized JPEG via Unsplash's imgix
 * params so the inlined payload stays small. Returns undefined on any failure.
 */
async function resolveHeaderImage(imageParam: string | null): Promise<string | undefined> {
  if (!imageParam || imageParam === "false" || imageParam === "none" || imageParam === "0") {
    return undefined
  }

  // Pre-inlined data URI — accept only a well-formed base64 raster URI. The
  // strict regex (not a `startsWith` check) ensures the value cannot contain
  // characters that would break out of the SVG `href` attribute it's placed in.
  if (imageParam.startsWith("data:")) {
    if (imageParam.length > MAX_HEADER_IMAGE_BYTES * 1.4) return undefined
    return DATA_IMAGE_RE.test(imageParam) ? imageParam : undefined
  }

  if (!/^https?:\/\//.test(imageParam)) return undefined

  // Build the fetch URL; ask Unsplash for a banner-sized JPEG.
  let fetchUrl = imageParam
  try {
    const u = new URL(imageParam)
    if (u.hostname === "images.unsplash.com") {
      if (!u.searchParams.has("w")) u.searchParams.set("w", "1600")
      if (!u.searchParams.has("q")) u.searchParams.set("q", "70")
      if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop")
      u.searchParams.set("fm", "jpg")
      fetchUrl = u.toString()
    }
  } catch {
    return undefined
  }

  try {
    const res = await raceTimeout(
      safeFetch(fetchUrl, {
        headers: { Accept: "image/*", "User-Agent": "shieldcn/1.0" },
        maxBytes: MAX_HEADER_IMAGE_BYTES,
      }),
    )
    if (!res?.ok) return undefined
    const ct = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || ""
    if (!HEADER_IMAGE_TYPES.has(ct)) return undefined
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_HEADER_IMAGE_BYTES) return undefined
    return `data:${ct};base64,${bytes.toString("base64")}`
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Sponsors image (/sponsors/{login}.svg) — public active-sponsor avatar grid.
// ---------------------------------------------------------------------------

/** Max bytes for a single inlined avatar (~200 KB). */
const MAX_AVATAR_BYTES = 200_000
/** Avatar image types we inline (GitHub serves png/jpeg/webp/gif). */
const AVATAR_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"])
/** Hard cap on how many avatars a single sponsors image will inline. */
const SPONSORS_RENDER_CAP = 80
/** Sponsors-image cache tuning (sponsor lists change slowly). */
const SPONSORS_FRESH_TTL = 60 * 30 // 30 min fresh copy
const SPONSORS_STALE_TTL = 60 * 60 * 24 * 7 // 7 day last-known-good fallback

// ---------------------------------------------------------------------------
// resvg-wasm init (shared across every PNG render path)
// ---------------------------------------------------------------------------
//
// Every PNG-rendering call site used to run its own copy of this init logic,
// re-running fs.existsSync/readFileSync (or re-fetching the CDN fallback)
// on every single request even after the wasm module was already
// initialized — initWasm() only needs to run once per process. ensureResvg()
// memoizes that with a single module-level promise so concurrent/subsequent
// calls reuse the already-initialized module instead of redoing the work.
//
// The CDN fallback URL is pinned to the exact installed @resvg/resvg-wasm
// version (keep this in sync with the dependency in package.json) — an
// unversioned unpkg URL would silently serve whatever is "latest" there,
// which can drift out of sync with the installed JS bindings.
const RESVG_WASM_VERSION = "2.6.2"
const RESVG_WASM_CDN_URL = `https://unpkg.com/@resvg/resvg-wasm@${RESVG_WASM_VERSION}/index_bg.wasm`

let resvgModulePromise: Promise<typeof import("@resvg/resvg-wasm")> | null = null

async function ensureResvg(): Promise<typeof import("@resvg/resvg-wasm")> {
  if (!resvgModulePromise) {
    resvgModulePromise = (async () => {
      const mod = await import("@resvg/resvg-wasm")
      let wasmLoaded = false
      if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        try {
          const fs = await import("node:fs")
          const path = await import("node:path")
          // In standalone mode, WASM is copied to node_modules/@resvg/resvg-wasm/
          const candidate = path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm")
          if (fs.existsSync(candidate)) {
            await mod.initWasm(fs.readFileSync(candidate))
            wasmLoaded = true
          }
        } catch { /* fs not available or file not found */ }
      }
      if (!wasmLoaded) {
        try {
          await mod.initWasm(fetch(RESVG_WASM_CDN_URL))
        } catch (err) {
          // initWasm throws if the module is already initialized — that's fine.
          // Anything else (e.g. a transient CDN fetch failure) must reject so
          // the cache below is cleared and the next request retries.
          if (!/already/i.test(String(err))) throw err
        }
      }
      return mod
    })()
    // Never cache a failure: a rejected promise stored here would otherwise
    // make every future PNG render fail until the process restarts.
    resvgModulePromise.catch(() => { resvgModulePromise = null })
  }
  return resvgModulePromise
}

/**
 * Rasterize an SVG string to PNG bytes via resvg-wasm, with the bundled fonts
 * supplied so text (sponsor names, titles) renders in the wasm sandbox (which
 * has no system fonts). Mirrors the header PNG path.
 */
async function rasterizeToPng(svg: string): Promise<Uint8Array> {
  const { Resvg } = await ensureResvg()
  const { getFontBuffers, DEFAULT_FONT_FAMILY } = await import("./badges/fonts")
  const resvg = new Resvg(svg, {
    font: {
      fontBuffers: getFontBuffers(),
      defaultFontFamily: DEFAULT_FONT_FAMILY,
      loadSystemFonts: false,
    },
  })
  return resvg.render().asPng()
}

/** Default avatar diameters (px) per tier, scaled from the base `size`. */
function tierSizes(base: number): { special: number; sponsors: number; backers: number } {
  return {
    special: Math.round(base * 1.35),
    sponsors: base,
    backers: Math.round(base * 0.72),
  }
}

/**
 * Fetch a GitHub avatar URL and return it as a base64 `data:` URI, or undefined
 * on any failure. Never hot-links — a sandboxed `<img>` SVG cannot load remote
 * images, so every avatar must be inlined.
 */
async function inlineAvatar(rawUrl: string): Promise<string | undefined> {
  if (!/^https?:\/\//.test(rawUrl)) return undefined
  try {
    const res = await raceTimeout(
      fetch(rawUrl, {
        next: { revalidate: 86400 },
        headers: { Accept: "image/*", "User-Agent": "shieldcn/1.0" },
      }),
    )
    if (!res?.ok) return undefined
    const ct = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || ""
    if (!AVATAR_IMAGE_TYPES.has(ct)) return undefined
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_AVATAR_BYTES) return undefined
    return `data:${ct};base64,${bytes.toString("base64")}`
  } catch {
    return undefined
  }
}

/** Inline a batch of avatars with bounded concurrency. */
async function inlineAvatars(entries: { login: string; avatarUrl: string }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const CONCURRENCY = 8
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map((e) => inlineAvatar(e.avatarUrl)))
    results.forEach((uri, j) => {
      if (uri) out.set(batch[j].login, uri)
    })
  }
  return out
}

/** Parse a comma-separated login list into a lowercased, de-duped array. */
function parseLoginList(raw: string | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(",")) {
    const login = part.trim().toLowerCase().replace(/^@/, "")
    if (login && !seen.has(login)) {
      seen.add(login)
      out.push(login)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Contributors image (/contributors/{owner}/{repo}.svg) — a contrib.rocks-style
// grid of a repository's top contributors' avatars. Reuses the sponsors grid
// renderer (a single tier) and the same background/customization system.
// ---------------------------------------------------------------------------

/** Hard cap on how many contributor avatars a single image will inline. */
const CONTRIBUTORS_RENDER_CAP = 100
const CONTRIBUTORS_FRESH_TTL = 60 * 60 // 1 hour fresh copy
const CONTRIBUTORS_STALE_TTL = 60 * 60 * 24 * 7 // 7 day last-known-good fallback

async function handleContributors(
  cleanSegments: string[],
  searchParams: URLSearchParams,
  format: Format,
  options?: BadgeRequestOptions,
): Promise<Response> {
  const rest = cleanSegments.slice(1) // after "contributors"
  const owner = (rest[0] ?? "").trim().replace(/^@/, "")
  const repo = (rest[1] ?? "").trim()

  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const width = clampNum(searchParams.get("width"), 320, 2000, 800)
  const radius = clampNum(searchParams.get("radius"), 0, 80, 12)
  const baseSize = clampNum(searchParams.get("size"), 24, 140, 64)
  const limit = clampNum(searchParams.get("limit"), 1, CONTRIBUTORS_RENDER_CAP, 60)
  const minContrib = clampNum(searchParams.get("min"), 0, 1_000_000, 0)
  const fontFamily = resolveFontFamily(searchParams.get("font"))
  const falsy = (v: string | null) => v === "false" || v === "0" || v === "none"
  const border = !falsy(searchParams.get("border"))
  const watermark = searchParams.get("watermark") === "true" || searchParams.get("watermark") === "1"
  // Names default OFF for contributors (contrib.rocks shows a dense avatar grid).
  const showNames = searchParams.get("names") === "true" || searchParams.get("names") === "1"
  // Include bot accounts ([bot] / type:Bot) only when explicitly opted in.
  const includeBots = searchParams.get("bots") === "true" || searchParams.get("bots") === "1"

  // Title: defaults to "Contributors"; `title=false`/empty hides it.
  const titleRaw = searchParams.get("title")
  const title = titleRaw === null ? "Contributors" : falsy(titleRaw) ? undefined : titleRaw

  const bgRaw = searchParams.get("bg") ?? searchParams.get("background")
  const transparent = bgRaw === "transparent" || bgRaw === "none"
  const imageDataUri = await resolveHeaderImage(searchParams.get("image") ?? searchParams.get("bgImage"))
  const bgParams = {
    preset: searchParams.get("preset"),
    theme: searchParams.get("theme"),
    bg: transparent ? null : resolveColor(bgRaw),
    transparent,
    gradient: searchParams.get("gradient"),
    pattern: searchParams.get("pattern"),
    glow: resolveColor(searchParams.get("glow")),
    accent: resolveColor(searchParams.get("accent")),
    imageDataUri,
    overlay: searchParams.has("overlay") ? clampNum(searchParams.get("overlay"), 0, 1, 0.45) : undefined,
    tint: resolveColor(searchParams.get("tint")),
  }

  const alignOf = (v: string | null, fallback: "left" | "center" | "right") =>
    v === "left" || v === "center" || v === "right" ? v : fallback
  const titleAlign = alignOf(searchParams.get("titleAlign"), "left")
  const avatarAlign = alignOf(searchParams.get("align"), "center")

  const imageResponse = async (svg: string, headers: Record<string, string>): Promise<Response> => {
    if (format === "png") {
      const png = await rasterizeToPng(svg)
      return new Response(Buffer.from(png), { headers: { "Content-Type": "image/png", ...headers } })
    }
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", ...headers } })
  }

  const fallbackCard = (message: string): Promise<Response> => {
    const { svg } = renderSponsors({
      title,
      tiers: [{ size: baseSize, avatars: [] }],
      width,
      mode,
      radius,
      fontFamily,
      border,
      watermark,
      showNames,
      titleAlign,
      avatarAlign,
      ...bgParams,
      ariaLabel: title ? `${title} — GitHub contributors` : "GitHub contributors",
      emptyText: message,
    })
    return imageResponse(svg, ERROR_CACHE_HEADERS)
  }

  if (!owner || !repo) {
    if (format === "json") {
      return Response.json({ error: "missing owner/repo" }, { status: 400, headers: ERROR_CACHE_HEADERS })
    }
    return fallbackCard("Provide a GitHub owner and repo")
  }

  let servedStale = false
  const list = await cachedFetchStale(
    "github",
    `contributors-list/${owner.toLowerCase()}/${repo.toLowerCase()}`,
    () => getGitHubContributorsList(owner, repo, CONTRIBUTORS_RENDER_CAP),
    CONTRIBUTORS_FRESH_TTL,
    CONTRIBUTORS_STALE_TTL,
    { onStale: () => { servedStale = true } },
  )

  if (!list) {
    if (format === "json") {
      return Response.json({ error: "not found" }, { status: 404, headers: ERROR_CACHE_HEADERS })
    }
    return fallbackCard(`No contributors to show for ${owner}/${repo}`)
  }

  const cacheHeaders = servedStale ? ERROR_CACHE_HEADERS : CACHE_HEADERS

  // Filter (bots / min contributions), then cap to the render budget.
  const filtered = list.contributors.filter((c) => {
    if (!includeBots && c.type === "Bot") return false
    if (c.contributions < minContrib) return false
    return true
  })
  const shown = filtered.slice(0, limit)

  if (format === "json") {
    return Response.json(
      {
        type: "contributors",
        owner,
        repo,
        totalShown: shown.length,
        contributors: shown.map((c) => ({
          login: c.login,
          url: c.url,
          contributions: c.contributions,
          type: c.type,
        })),
      },
      { headers: cacheHeaders },
    )
  }

  const avatarMap = await inlineAvatars(shown)
  const avatars: SponsorAvatar[] = shown.map((c) => ({
    login: c.login,
    name: null,
    url: c.url,
    imageDataUri: avatarMap.get(c.login),
  }))

  const { svg } = renderSponsors({
    title,
    tiers: [{ size: baseSize, avatars }],
    width,
    mode,
    radius,
    fontFamily,
    border,
    watermark,
    showNames,
    titleAlign,
    avatarAlign,
    ...bgParams,
    ariaLabel: title ? `${title} — GitHub contributors` : "GitHub contributors",
    emptyText: `No contributors to show for ${owner}/${repo}`,
  })

  if (options?.onTrack) {
    void options.onTrack({
      name: "contributors_rendered",
      data: { owner, repo, format, mode, shown: shown.length },
    })
  }

  return imageResponse(svg, cacheHeaders)
}

async function handleSponsors(
  cleanSegments: string[],
  searchParams: URLSearchParams,
  format: Format,
  options?: BadgeRequestOptions,
): Promise<Response> {
  const rest = cleanSegments.slice(1) // after "sponsors"
  // Normalize the login the same way the tier params (parseLoginList) and the
  // URL generator (buildSponsorsUrl) do: a leading `@` is intuitive in a
  // hand-written URL (/sponsors/@vercel.svg) but GitHub logins never contain
  // one, so passing it to the GraphQL `repositoryOwner(login:)` lookup would
  // miss and fall back to the empty card.
  const login = (rest[0] ?? "").trim().replace(/^@/, "")

  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const width = clampNum(searchParams.get("width"), 320, 2000, 800)
  const radius = clampNum(searchParams.get("radius"), 0, 80, 12)
  const baseSize = clampNum(searchParams.get("size"), 32, 140, 64)
  const limit = clampNum(searchParams.get("limit"), 1, SPONSORS_RENDER_CAP, 60)
  const fontFamily = resolveFontFamily(searchParams.get("font"))
  const falsy = (v: string | null) => v === "false" || v === "0" || v === "none"
  const border = !falsy(searchParams.get("border"))
  const watermark = searchParams.get("watermark") === "true" || searchParams.get("watermark") === "1"
  const showNames = !falsy(searchParams.get("names"))

  // Title: defaults to "Sponsors"; `title=false`/empty hides it.
  const titleRaw = searchParams.get("title")
  const title = titleRaw === null ? "Sponsors" : falsy(titleRaw) ? undefined : titleRaw

  // Background: the same premade system as headers — presets, gradients,
  // patterns, glow, themes, and photo backgrounds — so the sponsors card is as
  // customizable as a header banner. `transparent`/`none` blends into the page.
  const bgRaw = searchParams.get("bg") ?? searchParams.get("background")
  const transparent = bgRaw === "transparent" || bgRaw === "none"
  const imageDataUri = await resolveHeaderImage(searchParams.get("image") ?? searchParams.get("bgImage"))
  const bgParams = {
    preset: searchParams.get("preset"),
    theme: searchParams.get("theme"),
    bg: transparent ? null : resolveColor(bgRaw),
    transparent,
    gradient: searchParams.get("gradient"),
    pattern: searchParams.get("pattern"),
    glow: resolveColor(searchParams.get("glow")),
    accent: resolveColor(searchParams.get("accent")),
    imageDataUri,
    overlay: searchParams.has("overlay") ? clampNum(searchParams.get("overlay"), 0, 1, 0.45) : undefined,
    tint: resolveColor(searchParams.get("tint")),
  }

  // Manual tiers: owner pins logins into a larger "special" row and/or a
  // smaller "backers" row; everyone else falls into the default "Sponsors" row.
  const specialLogins = parseLoginList(searchParams.get("special"))
  const backerLogins = parseLoginList(searchParams.get("backers"))
  const specialTitleParam = searchParams.get("specialTitle")
  const sponsorsTitle = searchParams.get("sponsorsTitle") ?? "Sponsors"
  const backersTitle = searchParams.get("backersTitle") ?? "Backers"
  // Auto-featured tier: unless the maintainer pins `special` manually, the top
  // tier is populated from GitHub's public "Featured sponsors" selection
  // (scraped from the sponsors page — the only public source for it). Opt out
  // with `?featured=false`.
  const featuredEnabled = !falsy(searchParams.get("featured"))
  // Alignment of the title and of the avatar rows (inside the image).
  const alignOf = (v: string | null, fallback: "left" | "center" | "right") =>
    v === "left" || v === "center" || v === "right" ? v : fallback
  const titleAlign = alignOf(searchParams.get("titleAlign"), "left")
  const avatarAlign = alignOf(searchParams.get("align"), "center")
  // Tier separator style: text headings (default), a hairline, or just spacing.
  const sepRaw = searchParams.get("separator")
  const separator = sepRaw === "line" ? "line" : sepRaw === "none" ? "none" : "label"
  const separatorColor = resolveColor(searchParams.get("separatorColor"))
  // Optional tier filter: `?tiers=featured,sponsors` shows only those rows
  // (keys: featured/special, sponsors, backers). Omitted = all tiers.
  const tiersParam = searchParams.get("tiers")
  const tiersAllow = tiersParam !== null ? new Set(parseLoginList(tiersParam)) : null
  const tierAllowed = (...keys: string[]) => !tiersAllow || keys.some((k) => tiersAllow.has(k))

  // Image response helper (svg or png), shared by the success + fallback paths.
  const imageResponse = async (svg: string, headers: Record<string, string>): Promise<Response> => {
    if (format === "png") {
      const png = await rasterizeToPng(svg)
      return new Response(Buffer.from(png), { headers: { "Content-Type": "image/png", ...headers } })
    }
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", ...headers } })
  }

  // A sponsors image is a large element — a failure must degrade to a full,
  // card-shaped empty state (same chrome as the grid), never a tiny badge
  // pill scaled up huge. Short-cached so it self-heals when data appears.
  const fallbackCard = (message: string): Promise<Response> => {
    const { svg } = renderSponsors({
      title,
      tiers: [{ size: tierSizes(baseSize).sponsors, avatars: [] }],
      width,
      mode,
      radius,
      fontFamily,
      border,
      watermark,
      showNames,
      titleAlign,
      avatarAlign,
      separator,
      separatorColor,
      ...bgParams,
      emptyText: message,
    })
    return imageResponse(svg, ERROR_CACHE_HEADERS)
  }

  if (!login) {
    if (format === "json") {
      return Response.json({ error: "missing login" }, { status: 400, headers: ERROR_CACHE_HEADERS })
    }
    return fallbackCard("Provide a GitHub username or org")
  }

  // Fetch the public sponsor list (last-known-good on transient failure).
  let servedStale = false
  const list = await cachedFetchStale(
    "github",
    `sponsors-list/${login.toLowerCase()}`,
    () => getGitHubSponsorsList(login),
    SPONSORS_FRESH_TTL,
    SPONSORS_STALE_TTL,
    { onStale: () => { servedStale = true } },
  )

  if (!list) {
    if (format === "json") {
      return Response.json({ error: "not found" }, { status: 404, headers: ERROR_CACHE_HEADERS })
    }
    // No list: the account has no GitHub Sponsors program, doesn't exist, or
    // the upstream is transiently unavailable. All three read better as a
    // calm card than a red error — and the short cache lets it self-heal.
    return fallbackCard(`No public sponsors to show for @${login}`)
  }

  const cacheHeaders = servedStale ? ERROR_CACHE_HEADERS : CACHE_HEADERS

  // When no `special` set is pinned, auto-derive the featured tier from the
  // public "Featured sponsors" section. Best-effort: yields [] on any failure.
  let autoFeatured: string[] = []
  if (featuredEnabled && specialLogins.length === 0) {
    autoFeatured = await getGitHubFeaturedSponsors(login)
  }
  const effectiveSpecial = specialLogins.length ? specialLogins : autoFeatured
  const usingFeatured = specialLogins.length === 0 && autoFeatured.length > 0
  const specialTitle = specialTitleParam ?? (usingFeatured ? "Featured Sponsors" : "Special Sponsors")

  // Partition the public sponsors into tiers.
  const specialSet = new Set(effectiveSpecial)
  const backerSet = new Set(backerLogins)
  const byLogin = new Map(list.sponsors.map((s) => [s.login.toLowerCase(), s]))

  const special: SponsorEntry[] = effectiveSpecial.map((l) => byLogin.get(l)).filter((s): s is SponsorEntry => !!s)
  const backers: SponsorEntry[] = backerLogins.map((l) => byLogin.get(l)).filter((s): s is SponsorEntry => !!s)
  const middle: SponsorEntry[] = list.sponsors.filter(
    (s) => !specialSet.has(s.login.toLowerCase()) && !backerSet.has(s.login.toLowerCase()),
  )

  // Cap the middle tier so the whole image stays bounded; pinned tiers are
  // always shown (the owner chose them explicitly).
  const middleBudget = Math.max(0, limit - special.length - backers.length)
  const middleShown = middle.slice(0, middleBudget)

  if (format === "json") {
    return Response.json(
      {
        type: "sponsors",
        login,
        totalCount: list.totalCount,
        publicCount: list.sponsors.length,
        featured: effectiveSpecial,
        shown: special.length + middleShown.length + backers.length,
        sponsors: list.sponsors.map((s) => ({ login: s.login, name: s.name, url: s.url, type: s.type })),
      },
      { headers: cacheHeaders },
    )
  }

  // Inline avatars for everyone we'll actually render.
  const toRender = [...special, ...middleShown, ...backers]
  const avatarMap = await inlineAvatars(toRender)
  const toAvatar = (s: SponsorEntry): SponsorAvatar => ({
    login: s.login,
    name: s.name,
    url: s.url,
    imageDataUri: avatarMap.get(s.login),
  })

  const sizes = tierSizes(baseSize)
  const tiers: SponsorTier[] = []
  const hasPinned = special.length > 0 || backers.length > 0
  if (special.length && tierAllowed("featured", "special")) {
    tiers.push({ title: specialTitle, size: sizes.special, avatars: special.map(toAvatar) })
  }
  if (middleShown.length && tierAllowed("sponsors")) {
    tiers.push({
      title: hasPinned ? sponsorsTitle : undefined,
      size: sizes.sponsors,
      avatars: middleShown.map(toAvatar),
    })
  }
  if (backers.length && tierAllowed("backers")) {
    tiers.push({ title: backersTitle, size: sizes.backers, avatars: backers.map(toAvatar) })
  }
  if (tiers.length === 0) tiers.push({ size: sizes.sponsors, avatars: [] })

  const { svg } = renderSponsors({
    title,
    tiers,
    width,
    mode,
    radius,
    fontFamily,
    border,
    watermark,
    showNames,
    titleAlign,
    avatarAlign,
    separator,
    separatorColor,
    ...bgParams,
    emptyText: `No public sponsors yet — sponsor @${login}`,
  })

  if (options?.onTrack) {
    void options.onTrack({
      name: "sponsors_rendered",
      data: { login, format, mode, shown: toRender.length, total: list.totalCount },
    })
  }

  return imageResponse(svg, cacheHeaders)
}

async function handleHeader(
  cleanSegments: string[],
  searchParams: URLSearchParams,
  format: Format,
  options?: BadgeRequestOptions,
): Promise<Response> {
  const rest = cleanSegments.slice(1) // after "header"
  const preset = rest[0] || searchParams.get("preset") || undefined
  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"

  // Canvas: size preset (default "banner") + width/height overrides.
  const sizeParam = searchParams.get("size")
  const [baseW, baseH] = (sizeParam && HEADER_SIZE_PRESETS[sizeParam]) || HEADER_SIZE_PRESETS.banner
  const width = clampNum(searchParams.get("width"), 240, 2400, baseW)
  const height = clampNum(searchParams.get("height"), 100, 1600, baseH)

  const align = (searchParams.get("align") === "left" ? "left" : "center") as "left" | "center"
  const radius = clampNum(searchParams.get("radius"), 0, 120, 12)
  const fontFamily = resolveFontFamily(searchParams.get("font"))
  const falsy = (v: string | null) => v === "false" || v === "0"
  const truthy = (v: string | null) => v === "true" || v === "1"
  // Border defaults ON (shadcn card hairline); watermark defaults OFF.
  const border = !falsy(searchParams.get("border"))
  const watermark = truthy(searchParams.get("watermark"))

  const title = searchParams.get("title") ?? ""
  const subtitle = searchParams.get("subtitle") ?? searchParams.get("description") ?? undefined
  const titleColor = resolveColor(searchParams.get("titleColor"))
  const subtitleColor = resolveColor(searchParams.get("subtitleColor"))

  // Background color: `transparent`/`none` blends into the host page; otherwise
  // a named/hex color resolves to hex. Checked before resolveColor (which only
  // understands colors, not the transparent keyword).
  const bgRaw = searchParams.get("bg") ?? searchParams.get("background")
  const transparent = bgRaw === "transparent" || bgRaw === "none"

  // Photo background (Unsplash or any image URL / data URI), fetched + inlined.
  const imageDataUri = await resolveHeaderImage(searchParams.get("image") ?? searchParams.get("bgImage"))
  const overlay = searchParams.has("overlay")
    ? clampNum(searchParams.get("overlay"), 0, 1, 0.45)
    : undefined

  const background = resolveHeaderBackground({
    preset,
    mode,
    width,
    height,
    radius,
    theme: searchParams.get("theme"),
    transparent,
    bg: transparent ? null : resolveColor(bgRaw),
    gradient: searchParams.get("gradient"),
    pattern: searchParams.get("pattern"),
    glow: resolveColor(searchParams.get("glow")),
    accent: resolveColor(searchParams.get("accent")),
    imageDataUri,
    overlay,
    tint: resolveColor(searchParams.get("tint")),
  })

  const logo = await resolveHeaderLogo(searchParams.get("logo"), searchParams.get("logoColor"))

  if (format === "json") {
    return Response.json(
      {
        type: "header",
        preset: preset ?? "surface",
        title,
        subtitle: subtitle ?? null,
        width,
        height,
        mode,
        align,
        hasLogo: !!logo,
      },
      { headers: CACHE_HEADERS },
    )
  }

  const svg = renderHeader({
    title,
    subtitle,
    width,
    height,
    mode,
    align,
    radius,
    background,
    logo,
    fontFamily,
    titleColor,
    subtitleColor,
    border,
    watermark,
  })

  if (options?.onTrack) {
    void options.onTrack({
      name: "header_rendered",
      data: { preset: preset ?? "surface", format, mode, size: sizeParam ?? "banner", hasLogo: !!logo },
    })
  }

  if (format === "png") {
    // Headers are text-centric: rasterizeToPng() supplies the bundled fonts
    // so resvg can render the title/subtitle (the wasm sandbox has no
    // system fonts).
    const png = await rasterizeToPng(svg)
    return new Response(Buffer.from(png), {
      headers: { "Content-Type": "image/png", ...CACHE_HEADERS },
    })
  }

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", ...CACHE_HEADERS },
  })
}

/** Number formatter that never throws on weird input. */
function formatCountSafe(n: number): string {
  try {
    return formatCount(n)
  } catch {
    return String(n)
  }
}

/** Successful chart resolution. */
interface ChartOk {
  ok: true
  provider: string
  kind: string
  title: string
  subtitle?: string
  seriesLabel: string
  link?: string
  points: ChartPoint[]
  json: unknown
  /**
   * Optional multi-series payload (e.g. comparing several users' commit
   * histories on one chart). When present, `handleChart` renders one line per
   * entry with palette colors; `points` carries the first series for callers
   * (like the .json output) that only read a single series.
   */
  multiSeries?: Array<{ label: string; points: ChartPoint[] }>
}

/**
 * Distinct accent colors for multi-series charts (the first series still uses
 * the resolved `theme`/`color` accent; the rest cycle through this palette).
 */
const COMPARE_PALETTE = [
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ec4899", // pink-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#ef4444", // red-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
]

/**
 * Re-index a series onto a "month zero" axis: strip dates so the chart uses an
 * evenly spaced index axis, and label each point by its month offset. Used by
 * the commit-history `align` mode so users who joined at different times line
 * up at their own account birth (a homage to commit-history's Aligned view).
 */
function alignByIndex(points: ChartPoint[]): ChartPoint[] {
  return points.map((p, i) => ({ value: p.value, label: String(i) }))
}
type ChartResolved = ChartOk | { ok: false; status: number; msg: string }

/** Coerce an unknown JSONPath result into a finite number, or null. */
function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * Resolve a `/chart/...` path + params into a renderable series.
 *
 * Supported kinds:
 *   /chart/github/issues/{owner}/{repo}
 *   /chart/npm/{package}            (weekly downloads, last `days`)
 *   /chart/json?values=1,2,3        (inline data)
 *   /chart/json?url=...&query=...   (remote JSON array)
 */
async function resolveChartData(
  rest: string[],
  searchParams: URLSearchParams,
): Promise<ChartResolved> {
  const provider = rest[0]

  // --- GitHub lifetime commit history (homage to peetzweg/commit-history) ---
  if (provider === "commits" || (provider === "github" && rest[1] === "commits")) {
    const raw = provider === "commits" ? rest[1] : rest[2]
    if (!raw) {
      return { ok: false, status: 400, msg: "usage: /chart/github/commits/{user}.svg" }
    }
    // Comma-separated logins → compare several users on one chart.
    const logins = decodeURIComponent(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
    if (logins.length === 0) {
      return { ok: false, status: 400, msg: "usage: /chart/github/commits/{user}.svg" }
    }
    const align = ["1", "true", "yes"].includes((searchParams.get("align") || "").toLowerCase())

    const histories = await Promise.all(logins.map((l) => getCommitHistory(l)))
    const ok = histories.filter((h): h is CommitHistory => h !== null)
    if (ok.length === 0) {
      return { ok: false, status: 404, msg: `could not load commit history for ${logins.join(", ")}` }
    }

    const toPoints = (h: CommitHistory): ChartPoint[] =>
      align ? alignByIndex(h.points) : h.points.map((p) => ({ value: p.value, date: p.date }))

    // Single user → single series with a title, subtitle, and repo link.
    if (ok.length === 1) {
      const h = ok[0]
      return {
        ok: true,
        provider: "github",
        kind: "commits",
        title: h.login,
        subtitle: `${formatCountSafe(h.total)} commits${align ? " · aligned" : ""}`,
        seriesLabel: h.login,
        link: `https://github.com/${h.login}`,
        points: toPoints(h),
        json: h,
      }
    }

    // Multiple users → one line each (the legend shows the names).
    const multiSeries = ok.map((h) => ({ label: h.login, points: toPoints(h) }))
    return {
      ok: true,
      provider: "github",
      kind: "commits",
      title: align ? "Commits since account creation" : "Commit history",
      seriesLabel: ok[0].login,
      points: multiSeries[0].points,
      multiSeries,
      json: { aligned: align, users: ok },
    }
  }

  // --- GitHub issues over time ---
  // (Star history retired: the stargazers API is admin/collaborator-only as
  // of mid-2026; star chart URLs short-circuit to a transparent image in
  // `handleChart` before ever reaching this resolver.)
  if (provider === "github" || provider === "issues") {
    let kind: string | undefined
    let owner: string | undefined
    let repo: string | undefined
    if (provider === "github" && rest[1] === "issues") {
      kind = rest[1]; owner = rest[2]; repo = rest[3]
    } else if (provider === "issues") {
      kind = provider; owner = rest[1]; repo = rest[2]
    }
    if (!kind || !owner || !repo) {
      return { ok: false, status: 400, msg: "usage: /chart/github/issues/{owner}/{repo}.svg" }
    }
    const history = await getIssueHistory(owner, repo)
    if (!history) {
      return { ok: false, status: 404, msg: `could not load ${kind} for ${owner}/${repo}` }
    }
    const noun = kind === "issues" ? "issues" : "stars"
    return {
      ok: true,
      provider: "github",
      kind,
      title: `${owner}/${repo}`,
      subtitle: `${formatCountSafe(history.total)} ${noun}`,
      seriesLabel: `${owner}/${repo}`,
      link: `https://github.com/${owner}/${repo}`,
      points: history.points,
      json: history,
    }
  }

  // --- npm weekly downloads ---
  if (provider === "npm") {
    const pkg = rest.slice(1).join("/")
    if (!pkg) {
      return { ok: false, status: 400, msg: "usage: /chart/npm/{package}.svg" }
    }
    const days = clampNum(searchParams.get("days"), 30, 540, 365)
    const series = await getNpmDownloadSeries(pkg, days)
    if (!series) {
      return { ok: false, status: 404, msg: `could not load downloads for ${pkg}` }
    }
    return {
      ok: true,
      provider: "npm",
      kind: "downloads",
      title: pkg,
      subtitle: `${formatCountSafe(series.total)} downloads · ${days}d`,
      seriesLabel: pkg,
      link: `https://www.npmjs.com/package/${pkg}`,
      points: series.points,
      json: series,
    }
  }

  // --- Generic JSON ---
  if (provider === "json" || provider === "dynamic") {
    const url = searchParams.get("url")
    let values: number[] = []
    let dates: (string | undefined)[] = []
    let labels: (string | undefined)[] = []

    if (url) {
      // Remote JSON: `query` selects the value array, `dateQuery` (optional)
      // selects a parallel date/label array.
      const query = searchParams.get("query")
      if (!query) {
        return { ok: false, status: 400, msg: "json url charts need a ?query=" }
      }
      try {
        const res = await raceTimeout(safeFetch(url, {
          headers: { Accept: "application/json", "User-Agent": "shieldcn/1.0" },
        }))
        if (!res || !res.ok) {
          return { ok: false, status: 502, msg: `fetch failed (${res?.status ?? "timeout"})` }
        }
        const data = await res.json()
        const rawValues = JSONPath({ path: query, json: data }) as unknown[]
        values = (Array.isArray(rawValues) ? rawValues : [])
          .map(asNumber)
          .filter((n): n is number => n !== null)
        const dateQuery = searchParams.get("dateQuery")
        if (dateQuery) {
          const rawDates = JSONPath({ path: dateQuery, json: data }) as unknown[]
          dates = (Array.isArray(rawDates) ? rawDates : []).map((d) =>
            typeof d === "string" || typeof d === "number" ? String(d) : undefined,
          )
        }
      } catch {
        return { ok: false, status: 502, msg: "fetch failed" }
      }
    } else {
      // Inline data via ?values=, optional ?dates= / ?labels=.
      const rawValues = searchParams.get("values") ?? searchParams.get("data")
      if (!rawValues) {
        return { ok: false, status: 400, msg: "usage: /chart/json.svg?values=1,2,3" }
      }
      values = rawValues.split(",").map((s) => asNumber(s.trim())).filter((n): n is number => n !== null)
      const rawDates = searchParams.get("dates")
      if (rawDates) dates = rawDates.split(",").map((s) => s.trim())
      const rawLabels = searchParams.get("labels")
      if (rawLabels) labels = rawLabels.split(",").map((s) => s.trim())
    }

    if (values.length === 0) {
      return { ok: false, status: 400, msg: "no numeric data points" }
    }

    const points: ChartPoint[] = values.map((value, i) => {
      const date = dates[i]
      const isValidDate = date && !isNaN(new Date(date).getTime())
      return { value, date: isValidDate ? new Date(date as string).toISOString() : undefined, label: labels[i] }
    })
    const total = values.reduce((a, b) => a + b, 0)
    const label = searchParams.get("label") || "value"
    return {
      ok: true,
      provider: "json",
      kind: "json",
      title: searchParams.get("title") || "chart",
      subtitle: searchParams.get("subtitle") ?? `${formatCountSafe(total)} total`,
      seriesLabel: label,
      points,
      json: { points },
    }
  }

  return { ok: false, status: 400, msg: "unknown chart kind" }
}

/**
 * Handle a badge GET request.
 *
 * @param request - The incoming request
 * @param slug - URL path segments (e.g. ["npm", "v", "react"])
 * @param options - Optional analytics callback
 */
export async function handleBadgeGET(
  request: Request,
  slug: string[],
  options?: BadgeRequestOptions,
) {
  try {
    return await handleBadgeGETInner(request, slug, options)
  } catch (error) {
    // Errors must never produce a broken image. Report the failure so it isn't
    // silently swallowed, then return a valid fallback badge.
    if (options?.onError) {
      try {
        const { cleanSegments } = parseFormat(slug)
        options.onError(error, {
          provider: cleanSegments[0] || "unknown",
          path: slug.join("/"),
        })
      } catch { /* never let reporting break the response */ }
    }
    const { format, cleanSegments } = parseFormat(slug)
    if (format === "svg" || format === "png" || format === "gif") {
      return new Response(
        await renderErrorBadge(cleanSegments[0] || "error", "error"),
        { headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS } }
      )
    }
    return Response.json({ error: "internal error" }, { status: 500, headers: ERROR_CACHE_HEADERS })
  }
}

/**
 * The badge's identity — everything after the provider segment (e.g.
 * "stars/vercel/next.js" for /github/stars/vercel/next.js.svg, or "v/react"
 * for /npm/v/react.svg). Capped so pathological URLs can't bloat events.
 */
function badgeSubject(cleanSegments: string[]): string {
  return cleanSegments.slice(1).join("/").slice(0, 200)
}

/**
 * Classify where a badge request came from, for analytics.
 *
 * GitHub proxies README images through Camo (camo.githubusercontent.com),
 * which strips the Referer header — so GitHub views are identified by
 * user-agent instead. Camo also caches per our Cache-Control TTL, meaning
 * GitHub counts are a floor ("at least N"), not a total. Other embedders
 * (npm, docs sites) typically send a Referer; only its host is kept — never
 * the full URL — to avoid collecting anything identifying.
 */
function requestOrigin(request: Request): Record<string, string> {
  const ua = request.headers.get("user-agent") ?? ""
  const referer = request.headers.get("referer")

  if (/\bgithub-camo\b|camo\.githubusercontent\.com/i.test(ua)) {
    return { source: "github-camo" }
  }

  let refererHost: string | undefined
  if (referer) {
    try {
      refererHost = new URL(referer).hostname
    } catch { /* malformed referer — ignore */ }
  }
  if (refererHost) {
    if (refererHost === "www.npmjs.com" || refererHost === "npmjs.com") {
      return { source: "npm", refererHost }
    }
    return { source: "referer", refererHost }
  }
  return { source: "direct" }
}

async function handleBadgeGETInner(
  request: Request,
  slug: string[],
  options?: BadgeRequestOptions,
) {
  const url = new URL(request.url)
  let searchParams = normalizeSearchParams(url.searchParams)

  // Enrich every tracked event with the request origin (source + referer
  // host) so analytics can answer "where is this badge embedded?".
  if (options?.onTrack) {
    const baseTrack = options.onTrack
    const origin = requestOrigin(request)
    options = {
      ...options,
      onTrack: (event) => baseTrack({ name: event.name, data: { ...origin, ...event.data } }),
    }
  }

  // Parse format from URL
  const { format } = parseFormat(slug)
  let { cleanSegments } = parseFormat(slug)

  if (cleanSegments.length === 0) {
    if (format === "svg") {
      return new Response(await renderErrorBadge("error", "invalid url"), {
        headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
      })
    }
    return Response.json({ error: "invalid url" }, { status: 400, headers: ERROR_CACHE_HEADERS })
  }

  // ---------------------------------------------------------------------------
  // Stored brands: /b/{slug}/{provider}/... or any badge URL with ?brand={slug}.
  // A resolved brand's style tokens are overlaid *under* explicit query params
  // (query wins), so a rebrand re-styles every embed on next fetch. Fail-open:
  // an unknown/deleted brand renders defaults and is tracked as brand_miss.
  // ---------------------------------------------------------------------------
  let brandId: number | null = null
  let brandCustomFont: { name: string; data: Uint8Array } | null = null
  {
    let brandSlug: string | null = null
    if (cleanSegments[0] === "b" && cleanSegments[1]) {
      brandSlug = cleanSegments[1]
      cleanSegments = cleanSegments.slice(2)
    } else {
      brandSlug = searchParams.get("brand")
    }
    // Bridge `variant=branded` to managed brands: a branded badge with no
    // explicit brand adopts a managed brand whose slug matches its provider
    // (e.g. /github/...?variant=branded uses the "github" brand if one exists),
    // so editing that brand restyles every branded badge for the provider
    // site-wide. Explicit ?brand= / /b/ still win; unmatched providers fall
    // through to the built-in SimpleIcons/providerBrandColors defaults.
    // getBrand caches misses, so the per-render lookup is cheap.
    if (!brandSlug && searchParams.get("variant") === "branded" && cleanSegments[0]) {
      if (await getBrand(cleanSegments[0])) brandSlug = cleanSegments[0]
    }
    if (brandSlug) {
      const brand = await getBrand(brandSlug)
      if (brand) {
        brandId = brand.id
        searchParams = applyBrandToParams(searchParams, brand.config)
        // Auto-add the brand's logo: if the caller didn't set a logo (and the
        // brand's own config didn't provide one) but the brand has an uploaded
        // mark, default to logo=brand so applying a brand also applies its logo.
        // `logo=false`/`none` still opts out; an explicit logo still wins.
        if (!searchParams.has("logo")) {
          const hasMark =
            (await getBrandAsset(brandSlug, "mark")) ??
            (await getBrandAsset(brandSlug, "mark-alt")) ??
            (await getBrandAsset(brandSlug, "logo-dark")) ??
            (await getBrandAsset(brandSlug, "logo-light"))
          if (hasMark) searchParams.set("logo", "brand")
        }
        // Auto-add the brand's font: if the caller didn't set a font (and the
        // brand config didn't provide one) but the brand has an uploaded sans
        // font, default to font=brand so applying a brand also applies its
        // typeface. An explicit font param still wins.
        if (!searchParams.has("font")) {
          const hasFont = await getBrandFont(brandSlug, "font-sans")
          if (hasFont) searchParams.set("font", "brand")
        }
        // A brand can ship its own uploaded font: font=brand[-mono|-heading]
        // renders badges in the brand's typeface (loaded from brand_assets).
        const fontParam = searchParams.get("font")
        if (fontParam && fontParam.startsWith("brand")) {
          const kind: BrandFontKind =
            fontParam === "brand-mono" ? "font-mono"
            : fontParam === "brand-heading" ? "font-heading"
            : "font-sans"
          const data = await getBrandFont(brandSlug, kind)
          if (data) {
            brandCustomFont = { name: `Brand ${brandSlug}`, data: new Uint8Array(data) }
          }
          // Drop the non-standard value so downstream font parsing falls back
          // to Inter for glyph coverage; customFont overrides the family.
          searchParams.delete("font")
        }
        // logo=brand renders the brand's own hosted logo instead of a provider
        // icon. Resolve the mode-appropriate SVG (dark badge bg → light-ink
        // logo) and rewrite `logo` to a data URI so it flows uniformly through
        // the badge, header, and group logo paths downstream.
        const logoParam = searchParams.get("logo")
        if (logoParam === "brand" || logoParam === "brand-alt") {
          // Brands ship a square mark (+ optional alt). `logo=brand` uses the
          // primary mark; `logo=brand-alt` uses the alternate. Legacy light/dark
          // wordmark logos remain as fallbacks for older brands.
          const asset = logoParam === "brand-alt"
            ? (
                (await getBrandAsset(brandSlug, "mark-alt")) ??
                (await getBrandAsset(brandSlug, "mark"))
              )
            : (
                (await getBrandAsset(brandSlug, "mark")) ??
                (await getBrandAsset(brandSlug, "mark-alt")) ??
                (await getBrandAsset(brandSlug, "logo-dark")) ??
                (await getBrandAsset(brandSlug, "logo-light"))
              )
          if (asset && asset.contentType.includes("svg")) {
            searchParams.set(
              "logo",
              `data:image/svg+xml;base64,${asset.data.toString("base64")}`,
            )
          } else {
            // No usable SVG logo — fall back to the default icon rather than
            // attempting a bogus "brand" SimpleIcons slug lookup.
            searchParams.delete("logo")
          }
        }
      } else if (options?.onTrack) {
        void options.onTrack({ name: "brand_miss", data: { brand: brandSlug.slice(0, 40) } })
      }
    }
    if (cleanSegments.length === 0) {
      if (format === "svg") {
        return new Response(await renderErrorBadge("error", "invalid url"), {
          headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
        })
      }
      return Response.json({ error: "invalid url" }, { status: 400, headers: ERROR_CACHE_HEADERS })
    }
  }

  // Attach brandId to every event and feed the per-brand analytics rollup from
  // the same track path (fire-and-forget; never blocks the response).
  if (options?.onTrack) {
    const withOrigin = options.onTrack
    options = {
      ...options,
      onTrack: (event) => {
        const data = brandId != null ? { ...event.data, brandId } : event.data
        // The daily rollup is queried per-brand for brand-level insight, keyed
        // by a specific brand_id. Recording the entire public
        // badge firehose under brand_id=0 would be pure write amplification for
        // rows nothing reads — so only branded renders are rolled up.
        if (event.name === "badge_rendered" && brandId != null) {
          void recordBadgeStat({
            brandId,
            provider: String(data.provider ?? cleanSegments[0] ?? "unknown"),
            subject: typeof data.subject === "string" ? data.subject : "",
            source: typeof data.source === "string" ? data.source : "direct",
          })
        }
        withOrigin({ name: event.name, data })
      },
    }
  }

  // ---------------------------------------------------------------------------
  // Badge group: /group/{badge1}+{badge2}+{badge3}.svg
  // Renders multiple badges joined in a single SVG like a shadcn ButtonGroup.
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "group") {
    return handleBadgeGroup(cleanSegments, searchParams, format, options)
  }

  // ---------------------------------------------------------------------------
  // Charts: /chart/github/{stars|issues}/{owner}/{repo}.svg,
  // /chart/github/commits/{user}.svg, /chart/npm/{package}.svg, /chart/json.svg
  // Renders a shadcn-styled line/area chart.
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "chart") {
    return handleChart(cleanSegments, searchParams, format, options)
  }

  // ---------------------------------------------------------------------------
  // Repository headers: /header/{preset}.svg?title=…&logo=…&subtitle=…
  // Renders a premade/prop-driven banner image (logo + title + subtitle).
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "header") {
    return handleHeader(cleanSegments, searchParams, format, options)
  }

  // ---------------------------------------------------------------------------
  // Sponsors grid: /sponsors/{login}.svg?special=...&backers=...
  // Renders a grid of an account's public active GitHub sponsors' avatars.
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "sponsors") {
    return handleSponsors(cleanSegments, searchParams, format, options)
  }

  // ---------------------------------------------------------------------------
  // Contributors grid: /contributors/{owner}/{repo}.svg
  // Renders a contrib.rocks-style grid of a repository's top contributors.
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "contributors") {
    return handleContributors(cleanSegments, searchParams, format, options)
  }

  // Fetch badge data from provider
  const fetchStart = performance.now()
  const data = await fetchBadgeData(cleanSegments, searchParams)
  const fetchMs = performance.now() - fetchStart
  const provider = cleanSegments[0] || "unknown"

  if (options?.onMetric) {
    options.onMetric({
      type: "distribution",
      name: "badge.provider_fetch_duration",
      value: fetchMs,
      unit: "millisecond",
      tags: { provider, found: data ? "true" : "false" },
    })
    options.onMetric({
      type: "counter",
      name: "badge.request",
      value: 1,
      tags: { provider, format },
    })
  }

  if (!data) {
    if (format === "svg") {
      return new Response(
        await renderErrorBadge(cleanSegments[0] || "error", "not found"),
        {
          headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
        }
      )
    }
    return Response.json(
      { error: "not found" },
      { status: 404, headers: ERROR_CACHE_HEADERS }
    )
  }

  // A terminal-error verdict (e.g. a genuine 404 → "invalid repository") or a
  // last-known-good value served because the live fetch failed (`stale`)
  // renders a real badge but must not be cached like a success — short headers
  // let it self-heal quickly instead of being pinned at the CDN. `stale` in
  // particular ensures a frozen badge picks up fresh data within ~a minute of
  // the upstream recovering, not up to an hour later.
  const dataCacheHeaders = data.noStore
    ? NO_STORE_HEADERS
    : data.error || data.stale
      ? ERROR_CACHE_HEADERS
      : CACHE_HEADERS

  // JSON response
  if (format === "json") {
    return Response.json(data, { headers: dataCacheHeaders })
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
      { headers: dataCacheHeaders }
    )
  }

  // SVG response
  // Resolve the effective variant against the registry. Unsupported variants
  // (legacy `flat`/`subtle`, typos, or `branded` on a state badge) coerce to
  // "default" — non-breaking: nothing that rendered before becomes an error.
  let style = resolveVariant(
    cleanSegments[0],
    cleanSegments.slice(1),
    searchParams.get("style") || searchParams.get("variant") || undefined,
  )
  const size = (searchParams.get("size") || undefined) as BadgeSize | undefined
  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const theme = searchParams.get("theme") ?? undefined
  const fontParam = searchParams.get("font") ?? undefined
  const font = (fontParam && ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"].includes(fontParam) ? fontParam : undefined) as BadgeConfig["font"]
  const logoParam = searchParams.get("logo")
  const logoColor = resolveColor(searchParams.get("logoColor"))

  // Flag badges: fetch the full-color flag SVG to render as a left inset.
  // Default to the `secondary` variant so the flag chip sits on a soft surface.
  const isFlag = cleanSegments[0] === "flag"
  const isNba = cleanSegments[0] === "nba"
  // GitHub Sponsors badges default to the branded GitHub Sponsors pink so a bare
  // /github/sponsors/{login}.svg renders the heart-on-pink chip without params.
  const isSponsors = cleanSegments[0] === "github" && cleanSegments[1] === "sponsors"
  if (isNba && cleanSegments.length === 1 && !searchParams.get("style") && !searchParams.get("variant")) {
    style = "branded"
  }
  if (isSponsors && !searchParams.get("style") && !searchParams.get("variant")) {
    style = "branded"
  }
  let flagSvg: string | undefined
  let logoDataUri: string | undefined
  if (isFlag) {
    if (!searchParams.get("style") && !searchParams.get("variant")) {
      style = "secondary"
    }
    // data.link is the resolved flag CDN URL (set by getFlagBadge).
    if (data.link) {
      try {
        const flagRes = await raceTimeout(fetch(data.link, {
          next: { revalidate: 86400 },
          headers: { Accept: "image/svg+xml", "User-Agent": "shieldcn/1.0" },
        }))
        if (flagRes?.ok) flagSvg = await flagRes.text()
      } catch {
        // No flag art — fall back to a normal text badge.
      }
    }
  }

  if (isNba && data.link && !logoParam) {
    try {
      const logoRes = await raceTimeout(fetch(data.link, {
        next: { revalidate: 86400 },
        headers: { Accept: "image/png,image/svg+xml,image/*", "User-Agent": "shieldcn/1.0" },
      }))
      if (logoRes?.ok) {
        const contentType = logoRes.headers.get("content-type")?.split(";")[0] || "image/png"
        const bytes = Buffer.from(await logoRes.arrayBuffer())
        logoDataUri = `data:${contentType};base64,${bytes.toString("base64")}`
      }
    } catch {
      // No logo art — fall back to the default provider icon.
    }
  }

  // Resolve colors. User-supplied color params are validated (named → hex,
  // invalid → dropped) so garbage can never reach the renderer.
  const isStaticBadge = cleanSegments[0] === "badge" || cleanSegments[0] === "https"

  // Color overrides:
  // 1. ?color= query param always wins (user-specified hex or named color)
  // 2. For static badges (/badge/...), data.color is a resolved hex from the path
  // 3. For provider badges, data.color is a status keyword — handled by statusColor
  const colorOverride = resolveColor(searchParams.get("color"))
    ?? (isStaticBadge ? resolveColor(data.color) : undefined)
  const secondaryColorOverride = resolveColor(searchParams.get("color2"))
  const labelColorOverride = resolveColor(searchParams.get("labelColor"))

  const hasThemeOverride = !!(theme || colorOverride || labelColorOverride)
  let colors = resolveTheme(theme)

  colors = applyColorOverrides(colors, {
    color: colorOverride,
    labelColor: labelColorOverride,
  })

  // Resolve icon
  // Priority: ?logo=<simpleicon-slug> > ?logo=false (hide) > default provider icon
  let iconPath: string | undefined
  let iconPaths: string[] | undefined
  let iconViewBox: string | undefined
  let iconFillRule: string | undefined
  let iconFill: string | undefined
  let iconIsStroke: boolean | undefined
  let iconStrokeWidth: number | undefined
  let iconStrokeLinecap: string | undefined
  let iconStrokeLinejoin: string | undefined
  let iconRotation: number | undefined
  let brandColor: string | undefined

  // For branded variant, get provider brand color as fallback
  const providerBrand = getProviderBrandColor(provider)

  // Emoji (Twemoji) logo, rendered as a full-color square inset (not recolored).
  let emojiSvg: string | undefined

  if (logoParam === "false" || logoParam === "none") {
    // Explicitly hidden — still use provider brand for branded variant
    if (style === "branded" && providerBrand) {
      brandColor = providerBrand
    }
  } else if (logoParam && logoParam !== "true" && isTwemojiLogo(logoParam)) {
    // Twemoji emoji: ?logo=twemoji:🚀, ?logo=twemoji:1f680, or bare ?logo=🚀
    emojiSvg = (await resolveTwemojiSvg(logoParam)) ?? undefined
    // Branded variant still needs a bg color; emoji carry no single brand color,
    // so fall back to the provider brand if any.
    if (style === "branded" && providerBrand) brandColor = providerBrand
  } else if (logoParam && logoParam.startsWith("data:image/svg+xml")) {
    // Custom SVG icon via data URI
    const svgContent = decodeSvgDataUri(logoParam)
    if (svgContent) {
      const parsed = parseSvg(svgContent)
      if (parsed) {
        iconPath = parsed.icon.path
        iconPaths = parsed.icon.paths
        iconViewBox = parsed.icon.viewBox
        iconFillRule = parsed.icon.fillRule
        iconIsStroke = parsed.icon.isStroke
        iconStrokeWidth = parsed.icon.strokeWidth
        iconStrokeLinecap = parsed.icon.strokeLinecap
        iconStrokeLinejoin = parsed.icon.strokeLinejoin
        iconRotation = parsed.icon.rotation

        if (providerBrand) brandColor = providerBrand

        if (style === "branded" && !logoColor) {
          const effectiveBg = colorOverride ?? brandColor
          iconFill = brandedFg(effectiveBg)
        } else if (logoColor) {
          iconFill = `#${logoColor}`
        }
      }
    }
  } else if (logoParam && logoParam !== "true") {
    // Custom icon: SimpleIcons slug or ri:Name
    const si = await getSimpleIcon(logoParam, logoColor)
    if (si) {
      iconPath = si.icon.path
      iconPaths = si.icon.paths
      iconViewBox = si.icon.viewBox
      iconFillRule = si.icon.fillRule
      iconIsStroke = si.icon.isStroke
      iconStrokeWidth = si.icon.strokeWidth
      iconStrokeLinecap = si.icon.strokeLinecap
      iconStrokeLinejoin = si.icon.strokeLinejoin
      iconRotation = si.icon.rotation

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
      // Try sources in order: SimpleIcons > React Icons
      const sources = [
        defaultLogo.simpleIcon,
        defaultLogo.reactIcon ? `ri:${defaultLogo.reactIcon}` : null,
      ].filter(Boolean) as string[]

      for (const source of sources) {
        const si = await getSimpleIcon(source, logoColor)
        if (si) {
          iconPath = si.icon.path
          iconPaths = si.icon.paths
          iconViewBox = si.icon.viewBox
          iconFillRule = si.icon.fillRule
          iconIsStroke = si.icon.isStroke
          iconStrokeWidth = si.icon.strokeWidth
          iconStrokeLinecap = si.icon.strokeLinecap
          iconStrokeLinejoin = si.icon.strokeLinejoin
          iconRotation = si.icon.rotation

          // Track brand color: icon's color > provider's color
          if (si.defaultColor && si.defaultColor !== "currentColor") {
            brandColor = si.defaultColor
          }
          break
        }
      }

    }

    if (isNba && data.color) {
      brandColor = data.color
    }

    // GitHub's Primer "sponsors" pink. White text + heart on this clears WCAG
    // AA (~5:1). The lighter heart pinks (#db61a2, simple-icons' #ea4aaa) only
    // reach ~3.4:1 with white, so the contrast picker would flip the label to a
    // low-contrast dark — this darker shade keeps the whole chip white and legible.
    if (isSponsors) {
      brandColor = "bf3989"
    }

    // Fallback to provider brand color if no icon brand color found,
    // or if the icon brand color is black/near-black and the provider has a real color
    if (!brandColor && providerBrand) {
      brandColor = providerBrand
    } else if (brandColor && providerBrand && brandColor !== providerBrand) {
      // If icon brand color is very dark (e.g. Rust #000) but provider has a real color, prefer provider
      const r = parseInt(brandColor.substring(0, 2), 16)
      const g = parseInt(brandColor.substring(2, 4), 16)
      const b = parseInt(brandColor.substring(4, 6), 16)
      if (!isNaN(r) && (r + g + b) < 50) {
        brandColor = providerBrand
      }
    }

    // For branded variant, use contrast-aware icon color (after brand color is resolved)
    if (style === "branded" && !logoColor) {
      iconFill = brandedFg(brandColor)
    }
  }

  // Resolve status color for CI badges (only when data.color is a status keyword)
  const statusColor = data.color && statusColors[data.color] ? statusColors[data.color] : undefined

  // Downgrade destructive/branded to default for CI badges — status color text
  // becomes invisible on same-hue backgrounds (red-on-red, green-on-red, etc.)
  if (statusColor && (style === "destructive" || style === "branded")) {
    style = "default"
  }

  // Split mode: only when explicitly requested
  const splitParam = searchParams.get("split")
  const split = splitParam === "true" || splitParam === "1"

  // Status dot: auto for CI badges with a status color, or explicit
  const statusDotParam = searchParams.get("statusDot")
  const statusDot = statusDotParam === "true" || statusDotParam === "1"
    || (statusDotParam !== "false" && statusDotParam !== "0" && !!statusColor && !split)

  // Override label if provided
  const label = searchParams.get("label") || data.label

  // Parse configurable layout params. Each is clamped against the same
  // BADGE_DIM_BOUNDS the renderer itself enforces (single source of truth —
  // see render.tsx) — an unbounded ?height=1e9 would otherwise balloon the
  // Satori render, and negative values break layout.
  function num(key: string): number | undefined {
    const v = searchParams.get(key)
    if (v === null) return undefined
    const n = parseFloat(v)
    if (!Number.isFinite(n)) return undefined
    return clampBadgeDim(key, n)
  }

  // Parse gradient
  const gradient = parseGradient(searchParams.get("gradient"))

  // Parse animation mode. SVG animates via CSS keyframes; GIF animates as a
  // rasterized loop (frames baked + encoded). PNG/JSON ignore it.
  const animateRequested = parseAnimate(searchParams.get("animate"))
  const animate = format === "svg" ? animateRequested : "none"

  const badgeConfig: BadgeConfig = {
    label,
    value: data.value,
    icon: iconPath,
    iconViewBox,
    iconFillRule,
    iconFill,
    iconPaths,
    iconIsStroke,
    iconStrokeWidth,
    iconStrokeLinecap,
    iconStrokeLinejoin,
    iconRotation,
    style,
    size,
    mode,
    colors,
    statusColor,
    statusDot,
    split,
    hasThemeOverride,
    brandColor,
    secondaryColor: secondaryColorOverride,
    font,
    customFont: brandCustomFont ?? undefined,
    gradient,
    flagSvg,
    emojiSvg,
    logoDataUri,
    animate,
    valueColor: resolveColor(searchParams.get("valueColor")),
    labelTextColor: resolveColor(searchParams.get("labelTextColor")),
    labelOpacity: num("labelOpacity"),
    height: num("height"),
    fontSize: num("fontSize"),
    radius: num("radius"),
    padX: num("padX"),
    iconSize: num("iconSize"),
    gap: num("gap"),
    labelGap: num("labelGap"),
  }

  // ── Animated GIF output (animates inside GitHub READMEs) ──────────────
  if (format === "gif") {
    const gifRenderStart = performance.now()
    const { svg: baseSvg, dotColor } = await renderBadgeBase(badgeConfig)
    // Default a bare `.gif` (no animate param) to shimmer so it actually moves.
    const gifMode = animateRequested === "none" ? "shimmer" : animateRequested
    const gif = await renderGif(baseSvg, gifMode, dotColor)
    const gifRenderMs = performance.now() - gifRenderStart

    if (options?.onMetric) {
      options.onMetric({
        type: "distribution",
        name: "badge.render_duration",
        value: gifRenderMs,
        unit: "millisecond",
        tags: { provider, format, style, mode },
      })
      options.onMetric({
        type: "distribution",
        name: "badge.total_duration",
        value: fetchMs + gifRenderMs,
        unit: "millisecond",
        tags: { provider, format },
      })
    }

    if (gif) {
      if (options?.onTrack) {
        void options.onTrack({
          name: "badge_rendered",
          data: {
            provider: cleanSegments[0] || "unknown",
            subject: badgeSubject(cleanSegments),
            format: "gif",
            style,
            size: size ?? "sm",
            mode,
            animate: gifMode as string,
          },
        })
      }
      return new Response(Buffer.from(gif), {
        headers: { "Content-Type": "image/gif", ...dataCacheHeaders },
      })
    }
    // Animation not applicable (e.g. pulse/glow requested but no status dot).
    // Fall back to the static SVG so the badge never breaks.
    return new Response(baseSvg, {
      headers: { "Content-Type": "image/svg+xml", ...dataCacheHeaders },
    })
  }

  const renderStart = performance.now()
  const svg = await renderBadge(badgeConfig)
  const renderMs = performance.now() - renderStart

  if (options?.onMetric) {
    options.onMetric({
      type: "distribution",
      name: "badge.render_duration",
      value: renderMs,
      unit: "millisecond",
      tags: { provider, format, style, mode },
    })
    options.onMetric({
      type: "distribution",
      name: "badge.total_duration",
      value: fetchMs + renderMs,
      unit: "millisecond",
      tags: { provider, format },
    })
  }

  if (options?.onTrack) {
    void options.onTrack({
      name: "badge_rendered",
      data: {
        provider,
        subject: badgeSubject(cleanSegments),
        format,
        style,
        size: size ?? "sm",
        mode,
        split,
        statusDot,
        hasLogo: !!iconPath,
        hasThemeOverride,
        hasBrandColor: !!brandColor,
        hasGradient: !!gradient,
        font: font ?? "inter",
        ...(animate === "none" ? {} : { animate: animate as string }),
      },
    })
  }

  // PNG response
  if (format === "png") {
    const { Resvg } = await ensureResvg()
    const resvg = new Resvg(svg)
    const png = resvg.render().asPng()

    return new Response(Buffer.from(png), {
      headers: {
        "Content-Type": "image/png",
        ...dataCacheHeaders,
      },
    })
  }

  // SVG response
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      ...dataCacheHeaders,
    },
  })
}

/**
 * Handle a memo badge PUT request.
 *
 * PUT /memo/{key}/{label}/{value}/{color}
 * Create or update a memo badge with Bearer token auth.
 *
 * @param request - The incoming request
 * @param slug - URL path segments
 */
export async function handleBadgePUT(
  request: Request,
  slug: string[],
  options?: BadgeRequestOptions,
) {
  try {
    return await handleBadgePUTInner(request, slug, options)
  } catch (error) {
    // Mirror handleBadgeGET's outer catch: a memo write should never surface
    // an unhandled 500 without at least being reported.
    if (options?.onError) {
      try {
        options.onError(error, { path: slug.join("/") })
      } catch { /* never let reporting break the response */ }
    }
    return Response.json({ error: "internal error" }, { status: 500 })
  }
}

async function handleBadgePUTInner(
  request: Request,
  slug: string[],
  options?: BadgeRequestOptions,
) {
  function emit(outcome: string) {
    options?.onMetric?.({ type: "counter", name: "memo.write", value: 1, tags: { outcome } })
  }

  if (slug[0] !== "memo" || slug.length < 4) {
    emit("bad_request")
    return Response.json({ error: "Invalid memo URL. Use PUT /memo/{key}/{label}/{value}/{color}" }, { status: 400 })
  }

  const limit = await checkRateLimit("memo-put", getClientIdentifier(request), { max: 20, windowMs: 60_000 })
  if (!limit.allowed) {
    emit("rate_limited")
    return Response.json(
      { error: "Too many memo badge writes. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.resetMs / 1000)) } },
    )
  }

  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    emit("unauthorized")
    return Response.json({ error: "Missing Authorization: Bearer <token> header" }, { status: 401 })
  }
  const token = auth.slice(7)
  if (!token) {
    emit("unauthorized")
    return Response.json({ error: "Empty bearer token" }, { status: 401 })
  }

  const key = slug[1]
  if (key.length > 200) {
    emit("bad_request")
    return Response.json({ error: "Memo key too long (max 200 characters)" }, { status: 400 })
  }

  let label: string
  let value: string
  let color: string | undefined
  try {
    label = decodeURIComponent(slug[2])
    value = decodeURIComponent(slug[3])
    color = slug[4] ? decodeURIComponent(slug[4]) : undefined
  } catch {
    emit("bad_request")
    return Response.json({ error: "Invalid URL encoding in memo label, value, or color" }, { status: 400 })
  }

  const MAX_FIELD_LENGTH = 100
  if (label.length > MAX_FIELD_LENGTH || value.length > MAX_FIELD_LENGTH || (color && color.length > MAX_FIELD_LENGTH)) {
    emit("bad_request")
    return Response.json({ error: `Memo label, value, and color must each be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })
  }

  // upsertMemoBadge never throws — it catches internally and returns
  // { ok: false, error } — so no try/catch is needed here.
  const result = await upsertMemoBadge(key, label, value, color, token)

  if (!result.ok) {
    emit("forbidden")
    return Response.json({ error: result.error }, { status: 403 })
  }

  emit("ok")
  return Response.json({ ok: true, key, label, value, color, expiresIn: "32 days" })
}

/**
 * Standard Next.js route-segment params shape for a `[...slug]` catch-all —
 * matches what `app/[...slug]/route.ts` receives as its second argument.
 */
interface SlugRouteContext {
  params: Promise<{ slug: string[] }>
}

/**
 * Builds the `{ GET, PUT }` handlers for a `[...slug]/route.ts` catch-all,
 * wiring both to the same `BadgeRequestOptions`. web and engine previously
 * duplicated the `params` unwrapping and the "call handleBadgeGET/PUT with
 * this app's callbacks" glue verbatim in each route file (and engine's PUT
 * silently dropped `onError`/`onMetric` because there was nothing forcing it
 * to stay in sync with GET). Each app still supplies its own `onError`/
 * `onMetric` (typically wired to Sentry) — core stays dependency-free, per
 * {@link BadgeRequestOptions}.
 */
export function createBadgeHandlers(options: BadgeRequestOptions = {}) {
  return {
    async GET(request: Request, { params }: SlugRouteContext) {
      const { slug } = await params
      return handleBadgeGET(request, slug, options)
    },
    async PUT(request: Request, { params }: SlugRouteContext) {
      const { slug } = await params
      return handleBadgePUT(request, slug, options)
    },
  }
}
