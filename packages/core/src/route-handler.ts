/**
 * @shieldcn/core
 * src/route-handler.ts
 *
 * Shared badge request handler used by both the web site and the
 * self-hosted engine. Handles GET (badge rendering) and PUT (memo badges).
 */

import { renderBadge, renderBadgeBase, renderErrorBadge } from "./badges/render"
import { renderChart, resolveAccent, resolveFontFamily, type ChartSeries, type ChartPoint } from "./badges/render-chart"
import { getStarHistory, getIssueHistory } from "./providers/starhistory"
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
  githubRepoExists,
} from "./providers/github"
import { getDiscordOnline, getDiscordByInvite } from "./providers/discord"
import { getNbaTeamBadge } from "./providers/nba"
import { parseStaticBadgeContent, getDynamicJsonBadge, getFlagBadge } from "./providers/badge"
import { getRedditKarma, getRedditSubscribers } from "./providers/reddit"
import { getMemoBadge, upsertMemoBadge } from "./providers/memo"
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
// import { getTwitchStatus, getTwitchFollowers } from "./providers/twitch" // disabled: needs TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET
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
import { cachedFetchStale, isBackedOff } from "./cache"
import { raceTimeout } from "./provider-fetch"

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
  // User-level endpoints (2 segments: topic + username)
  const userTopics = new Set(["followers", "user-stars"])
  if (rest.length >= 2 && userTopics.has(rest[0])) {
    const username = rest[1]
    switch (rest[0]) {
      case "followers":  return getGitHubFollowers(username)
      case "user-stars": return getGitHubUserStars(username)
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
      if (isBackedOff("github")) return GITHUB_UNAVAILABLE
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
    // Disabled: requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
    // case "twitch": {
    //   const rest = segments.slice(1)
    //   if (rest.length < 2) return null
    //   switch (rest[0]) {
    //     case "status": return getTwitchStatus(rest[1])
    //     case "followers": return getTwitchFollowers(rest[1])
    //     default: return getTwitchStatus(rest[0])
    //   }
    // }

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

      try {
        const response = await raceTimeout(fetch(endpointUrl, {
          headers: { Accept: "application/json", "User-Agent": "shieldcn/1.0" },
          next: { revalidate: 300 },
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
      } catch {
        return { label: "endpoint", value: "error", color: "red", error: true }
      }
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

  if (provider === "github") {
    // Find the topic from either /github/{topic}/owner/repo or /github/owner/repo/{topic}
    const rest = segments.slice(1)
    const knownTopics = new Set(["stars","forks","watchers","branches","releases","tags","tag",
      "license","release","contributors","ci","checks","issues","open-issues","closed-issues",
      "label-issues","prs","open-prs","closed-prs","merged-prs","milestones","commits",
      "last-commit","assets-dl","dt","downloads","downloads-all","downloads-asset",
      "dependabot"])
    const topic = knownTopics.has(rest[0]) ? rest[0] : rest[2]

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
  const style = (searchParams.get("style") || searchParams.get("variant") || "default") as BadgeStyle
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
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm")
    try {
      let wasmLoaded = false
      if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        try {
          const fs = await import("node:fs")
          const path = await import("node:path")
          const candidates = [
            path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
          ]
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              await initWasm(fs.readFileSync(p))
              wasmLoaded = true
              break
            }
          }
        } catch { /* fs not available or file not found */ }
      }
      if (!wasmLoaded) {
        await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"))
      }
    } catch { /* already initialized */ }
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
 * URL format: /chart/github/stars/{owner}/{repo}.svg
 * Query params: width, height, mode, theme, color, area, title.
 */
async function handleChart(
  cleanSegments: string[],
  searchParams: URLSearchParams,
  format: Format,
  options?: BadgeRequestOptions,
): Promise<Response> {
  const rest = cleanSegments.slice(1) // after "chart"
  const mode = (searchParams.get("mode") === "light" ? "light" : "dark") as "light" | "dark"
  const width = clampNum(searchParams.get("width"), 200, 2000, 800)
  const height = clampNum(searchParams.get("height"), 120, 1200, 400)
  const areaParam = searchParams.get("area")
  const area = areaParam !== "false" && areaParam !== "0"
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

  const series: ChartSeries[] = [
    { label: resolved.seriesLabel, points: resolved.points, color: accent, fill },
  ]
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
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm")
    try {
      let wasmLoaded = false
      if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        try {
          const fs = await import("node:fs")
          const path = await import("node:path")
          const candidates = [
            path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
          ]
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              await initWasm(fs.readFileSync(p))
              wasmLoaded = true
              break
            }
          }
        } catch { /* fs not available */ }
      }
      if (!wasmLoaded) {
        await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"))
      }
    } catch { /* already initialized */ }
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
 *   /chart/github/stars/{owner}/{repo}
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

  // --- GitHub stars / issues over time ---
  if (provider === "github" || provider === "stars" || provider === "issues") {
    let kind: string | undefined
    let owner: string | undefined
    let repo: string | undefined
    if (provider === "github" && (rest[1] === "stars" || rest[1] === "issues")) {
      kind = rest[1]; owner = rest[2]; repo = rest[3]
    } else if (provider === "stars" || provider === "issues") {
      kind = provider; owner = rest[1]; repo = rest[2]
    }
    if (!kind || !owner || !repo) {
      return { ok: false, status: 400, msg: "usage: /chart/github/{stars|issues}/{owner}/{repo}.svg" }
    }
    const history = kind === "issues"
      ? await getIssueHistory(owner, repo)
      : await getStarHistory(owner, repo)
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
        const res = await raceTimeout(fetch(url, {
          next: { revalidate: 300 },
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

async function handleBadgeGETInner(
  request: Request,
  slug: string[],
  options?: BadgeRequestOptions,
) {
  const url = new URL(request.url)
  const searchParams = normalizeSearchParams(url.searchParams)

  // Parse format from URL
  const { format, cleanSegments } = parseFormat(slug)

  if (cleanSegments.length === 0) {
    if (format === "svg") {
      return new Response(await renderErrorBadge("error", "invalid url"), {
        headers: { "Content-Type": "image/svg+xml", ...ERROR_CACHE_HEADERS },
      })
    }
    return Response.json({ error: "invalid url" }, { status: 400, headers: ERROR_CACHE_HEADERS })
  }

  // ---------------------------------------------------------------------------
  // Badge group: /group/{badge1}+{badge2}+{badge3}.svg
  // Renders multiple badges joined in a single SVG like a shadcn ButtonGroup.
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "group") {
    return handleBadgeGroup(cleanSegments, searchParams, format, options)
  }

  // ---------------------------------------------------------------------------
  // Charts: /chart/github/stars/{owner}/{repo}.svg
  // Renders a shadcn-styled star-history line/area chart.
  // ---------------------------------------------------------------------------
  if (cleanSegments[0] === "chart") {
    return handleChart(cleanSegments, searchParams, format, options)
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
  const dataCacheHeaders = data.error || data.stale ? ERROR_CACHE_HEADERS : CACHE_HEADERS

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
  if (isNba && cleanSegments.length === 1 && !searchParams.get("style") && !searchParams.get("variant")) {
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

  // Parse configurable layout params. Each is clamped to a sane range — an
  // unbounded ?height=1e9 would otherwise balloon the Satori render, and
  // negative values break layout.
  const NUM_BOUNDS: Record<string, [number, number]> = {
    labelOpacity: [0, 1],
    height: [8, 240],
    fontSize: [5, 120],
    radius: [0, 120],
    padX: [0, 120],
    iconSize: [0, 120],
    gap: [0, 60],
    labelGap: [0, 60],
  }
  function num(key: string): number | undefined {
    const v = searchParams.get(key)
    if (v === null) return undefined
    const n = parseFloat(v)
    if (!Number.isFinite(n)) return undefined
    const [min, max] = NUM_BOUNDS[key] ?? [0, 1000]
    return Math.min(max, Math.max(min, n))
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
    font,
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
    const { Resvg, initWasm } = await import("@resvg/resvg-wasm")
    try {
      // Try loading WASM from a local file first (Docker/standalone),
      // fall back to CDN fetch (Vercel/dev)
      let wasmLoaded = false
      if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
        try {
          const fs = await import("node:fs")
          const path = await import("node:path")
          // In standalone mode, WASM is copied to node_modules/@resvg/resvg-wasm/
          const candidates = [
            path.join(process.cwd(), "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm"),
          ]
          for (const p of candidates) {
            if (fs.existsSync(p)) {
              await initWasm(fs.readFileSync(p))
              wasmLoaded = true
              break
            }
          }
        } catch { /* fs not available or file not found */ }
      }
      if (!wasmLoaded) {
        await initWasm(fetch("https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm"))
      }
    } catch { /* already initialized */ }
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
) {
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
