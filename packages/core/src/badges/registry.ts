/**
 * shieldcn
 * lib/badges/registry
 *
 * THE source of truth for what each badge provider supports.
 *
 * The route handler accepts anything off the URL and casts it (`as BadgeStyle`),
 * so invalid variants / unknown topics silently render. This registry declares,
 * per provider and per topic (endpoint), exactly what is valid:
 *
 *   - which topics (endpoints) exist
 *   - how path segments map to params
 *   - which variants are allowed (defaults to ALL)
 *   - a renderable example used by tests + the visual matrix
 *
 * Everything else reads from here:
 *   - `validate.ts` rejects unknown providers/topics and unsupported variants
 *   - tests assert every registered example renders
 *   - (later) the docs sandbox + matrix only show real options
 *
 * Rollout is incremental. Only providers listed here are validated; unknown
 * providers fall through to the legacy switch unchanged (see validate.ts).
 */

import type { BadgeStyle } from "./types"

/**
 * Every variant the renderer actually understands — one entry per case in
 * `getButtonStyle` (button-tokens.ts). This is THE list the UI dropdowns,
 * showcase, and validation all read from. Keep it in lockstep with BadgeStyle.
 */
export const ALL_VARIANTS: readonly BadgeStyle[] = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "branded",
] as const

/** Display labels for each variant (single source for UI dropdowns). */
export const VARIANT_LABELS: Record<BadgeStyle, string> = {
  default: "Default",
  secondary: "Secondary",
  outline: "Outline",
  ghost: "Ghost",
  destructive: "Destructive",
  branded: "Branded",
}

/** A single endpoint within a provider (e.g. npm "v", github "stars"). */
export interface BadgeTopic {
  /** Topic key as it appears in the URL (e.g. "v", "stars"). */
  topic: string
  /** Human description for docs / matrix. */
  description: string
  /**
   * Variants this topic supports. Omit to allow every variant in ALL_VARIANTS.
   * Narrow this for badges where some variants make no sense (e.g. a status
   * badge whose color is data-driven shouldn't offer `branded`).
   */
  variants?: readonly BadgeStyle[]
  /**
   * A real, renderable example path (segments after the provider), used by
   * tests and the visual matrix. Should hit a stable, well-known target.
   */
  example: string[]
}

/** A provider and all of its topics. */
export interface BadgeProvider {
  /** Provider key — the first URL segment (e.g. "npm", "github"). */
  provider: string
  /** Human description. */
  description: string
  /** All endpoints this provider exposes. */
  topics: BadgeTopic[]
  /**
   * Topic key used when no topic segment is present in the path
   * (e.g. `/npm/react` defaults to "v", `/discord/{id}` to "online").
   */
  defaultTopic?: string
  /**
   * Freeform providers have no fixed topics — any path is valid (e.g. static
   * `/badge/...`, custom `/https/...`). Variants still respect `variants` below.
   */
  freeform?: boolean
  /**
   * Variants allowed across this whole provider. Used for freeform providers
   * (which have no per-topic narrowing) and as the fallback for any topic that
   * doesn't declare its own `variants`. Omit to allow every variant.
   */
  variants?: readonly BadgeStyle[]
}

/** Synthetic topic returned for freeform providers. */
const FREEFORM_TOPIC: BadgeTopic = {
  topic: "*",
  description: "Freeform badge — any path.",
  example: [],
}

/**
 * Every variant except `branded`. Used where `branded` is meaningless:
 *   - pass/fail STATE badges (color is data-driven, not a brand identity)
 *   - badges with no brand at all (e.g. country flags)
 */
const NO_BRANDED: readonly BadgeStyle[] = ALL_VARIANTS.filter((v) => v !== "branded")

/** Shorthand for a topic with no special narrowing (all 6 variants). */
function t(topic: string, description: string, example: string[]): BadgeTopic {
  return { topic, description, example }
}

/** Shorthand for a pass/fail STATE topic (drops `branded`). */
function state(topic: string, description: string, example: string[]): BadgeTopic {
  return { topic, description, example, variants: NO_BRANDED }
}

/**
 * Registry entries — the source of truth for every provider.
 *
 * `defaultTopic` = topic used when no topic segment is present.
 * `freeform`     = any path valid, all variants (custom/static/endpoint badges).
 * STATE badges (pass/fail/secure) drop `branded`; everything else allows all 6.
 */
export const REGISTRY: BadgeProvider[] = [
  {
    provider: "npm",
    description: "npm package version, downloads, license, and metadata.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest published version", ["v", "react"]),
      t("dw", "Downloads last week", ["dw", "react"]),
      t("dm", "Downloads last month", ["dm", "react"]),
      t("dy", "Downloads last year", ["dy", "react"]),
      t("dt", "Total downloads", ["dt", "react"]),
      t("license", "Declared license", ["license", "react"]),
      t("node", "Required Node version", ["node", "react"]),
      t("types", "TypeScript types availability", ["types", "react"]),
      t("dependents", "Number of dependents", ["dependents", "react"]),
    ],
  },
  {
    provider: "github",
    description: "GitHub repo and user stats, releases, and CI status.",
    topics: [
      t("stars", "Repository stars", ["stars", "facebook", "react"]),
      t("forks", "Repository forks", ["forks", "facebook", "react"]),
      t("watchers", "Repository watchers", ["watchers", "facebook", "react"]),
      t("license", "Repository license", ["license", "facebook", "react"]),
      t("branches", "Branch count", ["branches", "facebook", "react"]),
      t("releases", "Release count", ["releases", "facebook", "react"]),
      t("tags", "Tag count", ["tags", "facebook", "react"]),
      t("tag", "Latest tag", ["tag", "facebook", "react"]),
      t("release", "Latest release", ["release", "facebook", "react"]),
      t("contributors", "Contributor count", ["contributors", "facebook", "react"]),
      t("issues", "Open issues", ["issues", "facebook", "react"]),
      t("open-issues", "Open issues", ["open-issues", "facebook", "react"]),
      t("closed-issues", "Closed issues", ["closed-issues", "facebook", "react"]),
      t("label-issues", "Issues with a label", ["label-issues", "facebook", "react", "bug"]),
      t("prs", "Open pull requests", ["prs", "facebook", "react"]),
      t("open-prs", "Open pull requests", ["open-prs", "facebook", "react"]),
      t("closed-prs", "Closed pull requests", ["closed-prs", "facebook", "react"]),
      t("merged-prs", "Merged pull requests", ["merged-prs", "facebook", "react"]),
      t("milestones", "Milestone count", ["milestones", "facebook", "react"]),
      t("commits", "Commit count", ["commits", "facebook", "react"]),
      t("last-commit", "Time since last commit", ["last-commit", "facebook", "react"]),
      t("assets-dl", "Release asset downloads", ["assets-dl", "facebook", "react"]),
      t("dt", "Total downloads", ["dt", "facebook", "react"]),
      t("downloads", "Release downloads", ["downloads", "facebook", "react"]),
      t("downloads-all", "All release downloads", ["downloads-all", "facebook", "react"]),
      t("downloads-asset", "Specific asset downloads", ["downloads-asset", "facebook", "react"]),
      // Pass/fail state badges — no `branded`.
      state("ci", "GitHub Actions CI status", ["ci", "facebook", "react"]),
      state("checks", "Combined check status", ["checks", "facebook", "react"]),
      state("dependabot", "Dependabot security state", ["dependabot", "facebook", "react"]),
      // User-level (2-segment) endpoints.
      t("followers", "GitHub user followers", ["followers", "torvalds"]),
      t("user-stars", "Total stars across a user's repos", ["user-stars", "torvalds"]),
    ],
  },
  {
    provider: "discord",
    description: "Discord server online members.",
    defaultTopic: "online",
    topics: [
      t("online", "Online members (by server ID)", ["1316199667142496307"]),
      t("members", "Total members (by invite)", ["members", "abcdef"]),
      t("online-members", "Online members (by invite)", ["online-members", "abcdef"]),
    ],
  },
  {
    provider: "nba",
    description: "NBA team fan badges with team logos.",
    defaultTopic: "team",
    topics: [
      t("team", "Team fan badge", ["knicks"]),
    ],
  },
  {
    provider: "reddit",
    description: "Reddit karma and subreddit subscribers.",
    topics: [
      t("karma", "User karma", ["karma", "u", "spez"]),
      t("subscribers", "Subreddit subscribers", ["subscribers", "r", "typescript"]),
    ],
  },
  {
    provider: "memo",
    description: "Persisted custom key/value badges.",
    freeform: true,
    topics: [],
  },
  {
    provider: "badge",
    description: "Static and dynamic custom badges.",
    freeform: true,
    topics: [],
  },
  {
    provider: "flag",
    description: "\u201cBuilt in {country}\u201d badge with a flag inset.",
    freeform: true,
    // A flag chip has no brand identity, so `branded` doesn't apply.
    variants: NO_BRANDED,
    topics: [],
  },
  {
    provider: "https",
    description: "Custom badge from an arbitrary HTTPS endpoint.",
    freeform: true,
    topics: [],
  },
  {
    provider: "pypi",
    description: "PyPI package version, downloads, and metadata.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "django"]),
      t("dd", "Downloads per day", ["dd", "django"]),
      t("dw", "Downloads per week", ["dw", "django"]),
      t("dm", "Downloads per month", ["dm", "django"]),
      t("license", "Declared license", ["license", "django"]),
      t("python", "Required Python version", ["python", "django"]),
    ],
  },
  {
    provider: "crates",
    description: "Crates.io version, downloads, and license.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "serde"]),
      t("d", "Total downloads", ["d", "serde"]),
      t("dr", "Recent downloads", ["dr", "serde"]),
      t("license", "Declared license", ["license", "serde"]),
    ],
  },
  {
    provider: "docker",
    description: "Docker Hub pulls, stars, version, and image size.",
    defaultTopic: "pulls",
    topics: [
      t("pulls", "Pull count", ["library", "nginx", "pulls"]),
      t("stars", "Stars", ["library", "nginx", "stars"]),
      t("v", "Latest version tag", ["library", "nginx", "v"]),
      t("size", "Image size", ["library", "nginx", "size"]),
    ],
  },
  {
    provider: "bluesky",
    description: "Bluesky followers, following, and posts.",
    topics: [
      t("followers", "Followers", ["followers", "bsky.app"]),
      t("following", "Following", ["following", "bsky.app"]),
      t("posts", "Posts", ["posts", "bsky.app"]),
    ],
  },
  {
    provider: "x",
    description: "X (Twitter) follow and mention badges.",
    topics: [
      t("follow", "Follow", ["follow", "jal_co"]),
      t("mention", "Mention", ["mention", "jal_co"]),
    ],
  },
  {
    provider: "twitter",
    description: "Alias of the x provider.",
    topics: [
      t("follow", "Follow", ["follow", "jal_co"]),
      t("mention", "Mention", ["mention", "jal_co"]),
    ],
  },
  {
    provider: "jsr",
    description: "JSR package version and score.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["@std", "path", "v"]),
      t("score", "Package score", ["@std", "path", "score"]),
    ],
  },
  {
    provider: "bundlephobia",
    description: "Bundle size from Bundlephobia.",
    defaultTopic: "minzip",
    topics: [
      t("min", "Minified size", ["min", "react"]),
      t("minzip", "Minified + gzipped size", ["minzip", "react"]),
      t("tree-shaking", "Tree-shaking support", ["tree-shaking", "react"]),
    ],
  },
  {
    provider: "youtube",
    description: "YouTube channel and video stats.",
    topics: [
      t("subscribers", "Channel subscribers", ["UCsBjURrPoezykLs9EqgamOA", "subscribers"]),
      t("channel-views", "Channel views", ["UCsBjURrPoezykLs9EqgamOA", "channel-views"]),
      t("views", "Video views", ["dQw4w9WgXcQ", "views"]),
      t("likes", "Video likes", ["dQw4w9WgXcQ", "likes"]),
      t("comments", "Video comments", ["dQw4w9WgXcQ", "comments"]),
    ],
  },
  {
    provider: "vscode",
    description: "VS Code Marketplace installs, rating, and version.",
    topics: [
      t("installs", "Install count", ["esbenp", "prettier-vscode", "installs"]),
      t("rating", "Average rating", ["esbenp", "prettier-vscode", "rating"]),
      t("v", "Latest version", ["esbenp", "prettier-vscode", "v"]),
    ],
  },
  {
    provider: "opencollective",
    description: "Open Collective backers, sponsors, and balance.",
    topics: [
      t("backers", "Backers", ["backers", "webpack"]),
      t("sponsors", "Sponsors", ["sponsors", "webpack"]),
      t("contributors", "Contributors", ["contributors", "webpack"]),
      t("balance", "Balance", ["balance", "webpack"]),
      t("budget", "Annual budget", ["budget", "webpack"]),
    ],
  },
  {
    provider: "hackernews",
    description: "Hacker News user karma.",
    freeform: true,
    topics: [],
  },
  {
    provider: "mastodon",
    description: "Mastodon followers, following, and posts.",
    topics: [
      t("followers", "Followers", ["mastodon.social", "Gargron", "followers"]),
      t("following", "Following", ["mastodon.social", "Gargron", "following"]),
      t("posts", "Posts", ["mastodon.social", "Gargron", "posts"]),
    ],
  },
  {
    provider: "lemmy",
    description: "Lemmy community subscribers, posts, and comments.",
    topics: [
      t("subscribers", "Subscribers", ["lemmy.ml", "technology", "subscribers"]),
      t("posts", "Posts", ["lemmy.ml", "technology", "posts"]),
      t("comments", "Comments", ["lemmy.ml", "technology", "comments"]),
    ],
  },
  {
    provider: "packagist",
    description: "Packagist (PHP) version, downloads, and license.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "laravel", "framework"]),
      t("dt", "Total downloads", ["dt", "laravel", "framework"]),
      t("dm", "Monthly downloads", ["dm", "laravel", "framework"]),
      t("dd", "Daily downloads", ["dd", "laravel", "framework"]),
      t("license", "Declared license", ["license", "laravel", "framework"]),
    ],
  },
  {
    provider: "rubygems",
    description: "RubyGems version, downloads, and license.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "rails"]),
      t("dt", "Total downloads", ["dt", "rails"]),
      t("dv", "Version downloads", ["dv", "rails"]),
      t("license", "Declared license", ["license", "rails"]),
    ],
  },
  {
    provider: "nuget",
    description: "NuGet version and downloads.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "Newtonsoft.Json"]),
      t("dt", "Total downloads", ["dt", "Newtonsoft.Json"]),
    ],
  },
  {
    provider: "pub",
    description: "Dart/Flutter pub.dev version and scores.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "provider"]),
      t("likes", "Likes", ["likes", "provider"]),
      t("points", "Pub points", ["points", "provider"]),
      t("popularity", "Popularity", ["popularity", "provider"]),
    ],
  },
  {
    provider: "homebrew",
    description: "Homebrew formula/cask version and installs.",
    defaultTopic: "v",
    topics: [
      t("v", "Formula version", ["v", "wget"]),
      t("cask", "Cask version", ["cask", "firefox"]),
      t("installs", "Install count", ["installs", "wget"]),
      t("dm", "Monthly downloads", ["dm", "wget"]),
      t("dq", "Quarterly downloads", ["dq", "wget"]),
      t("dy", "Yearly downloads", ["dy", "wget"]),
      t("cask-dm", "Cask monthly downloads", ["cask-dm", "firefox"]),
      t("cask-dq", "Cask quarterly downloads", ["cask-dq", "firefox"]),
      t("cask-dy", "Cask yearly downloads", ["cask-dy", "firefox"]),
    ],
  },
  {
    provider: "maven",
    description: "Maven Central latest version.",
    freeform: true,
    topics: [],
  },
  {
    provider: "cocoapods",
    description: "CocoaPods latest version.",
    freeform: true,
    topics: [],
  },
  {
    provider: "codecov",
    description: "Codecov coverage percentage.",
    freeform: true,
    topics: [],
  },
  {
    provider: "wakatime",
    description: "WakaTime coding time.",
    freeform: true,
    topics: [],
  },
  {
    provider: "tokscale",
    description: "Tokscale token usage and rank.",
    defaultTopic: "stats",
    topics: [
      t("tokens", "Tokens used", ["tokens", "someuser"]),
      t("cost", "Cost", ["cost", "someuser"]),
      t("rank", "Rank", ["rank", "someuser"]),
      t("active-days", "Active days", ["active-days", "someuser"]),
      t("stats", "Aggregate stats", ["stats"]),
    ],
  },
  {
    provider: "skills",
    description: "skills.sh agent skill installs and leaderboard rank.",
    defaultTopic: "installs",
    topics: [
      t("installs", "Skill installs", ["installs", "vercel-labs", "agent-skills", "vercel-react-best-practices"]),
      t("rank", "All-time leaderboard rank", ["rank", "vercel-labs", "agent-skills", "vercel-react-best-practices"]),
      t("trending", "Trending rank", ["trending", "vercel-labs", "agent-skills", "vercel-react-best-practices"]),
      t("hot", "Hot rank", ["hot", "vercel-labs", "agent-skills", "vercel-react-best-practices"]),
    ],
  },
  {
    provider: "indiedevs",
    description: "IndieDevs membership badge.",
    freeform: true,
    topics: [],
  },
  {
    provider: "gitlab",
    description: "GitLab repo stats, pipeline status, and releases.",
    topics: [
      t("stars", "Stars", ["stars", "gitlab-org", "gitlab"]),
      t("forks", "Forks", ["forks", "gitlab-org", "gitlab"]),
      t("issues", "Open issues", ["issues", "gitlab-org", "gitlab"]),
      t("open-issues", "Open issues", ["open-issues", "gitlab-org", "gitlab"]),
      t("closed-issues", "Closed issues", ["closed-issues", "gitlab-org", "gitlab"]),
      t("license", "License", ["license", "gitlab-org", "gitlab"]),
      t("last-commit", "Time since last commit", ["last-commit", "gitlab-org", "gitlab"]),
      t("contributors", "Contributors", ["contributors", "gitlab-org", "gitlab"]),
      t("release", "Latest release", ["release", "gitlab-org", "gitlab"]),
      state("pipeline", "Pipeline status", ["pipeline", "gitlab-org", "gitlab"]),
    ],
  },
  {
    provider: "conda",
    description: "Conda version, downloads, and platform.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "conda-forge", "numpy"]),
      t("d", "Downloads", ["d", "conda-forge", "numpy"]),
      t("platform", "Supported platforms", ["platform", "conda-forge", "numpy"]),
    ],
  },
  {
    provider: "chrome",
    description: "Chrome Web Store version, users, and rating.",
    topics: [
      t("v", "Latest version", ["v", "cjpalhdlnbpafiamejdnhcphjbkeiagm"]),
      t("users", "User count", ["users", "cjpalhdlnbpafiamejdnhcphjbkeiagm"]),
      t("rating", "Average rating", ["rating", "cjpalhdlnbpafiamejdnhcphjbkeiagm"]),
    ],
  },
  {
    provider: "amo",
    description: "Firefox Add-ons version, users, rating, and downloads.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "ublock-origin"]),
      t("users", "User count", ["users", "ublock-origin"]),
      t("rating", "Average rating", ["rating", "ublock-origin"]),
      t("d", "Downloads", ["d", "ublock-origin"]),
    ],
  },
  {
    provider: "coveralls",
    description: "Coveralls coverage percentage.",
    freeform: true,
    topics: [],
  },
  {
    provider: "sonar",
    description: "SonarQube quality gate and code health metrics.",
    topics: [
      t("bugs", "Bug count", ["bugs", "my-project"]),
      t("vulnerabilities", "Vulnerability count", ["vulnerabilities", "my-project"]),
      t("code-smells", "Code smell count", ["code-smells", "my-project"]),
      t("coverage", "Coverage percentage", ["coverage", "my-project"]),
      t("duplicated-lines", "Duplicated lines density", ["duplicated-lines", "my-project"]),
      t("maintainability", "Maintainability rating", ["maintainability", "my-project"]),
      t("reliability", "Reliability rating", ["reliability", "my-project"]),
      t("security", "Security rating", ["security", "my-project"]),
      state("quality-gate", "Quality gate status", ["quality-gate", "my-project"]),
    ],
  },
  {
    provider: "jsdelivr",
    description: "jsDelivr CDN hits and rank.",
    topics: [
      t("hits", "Monthly hits", ["hits", "npm", "react"]),
      t("dm", "Monthly hits", ["dm", "npm", "react"]),
      t("dy", "Yearly hits", ["dy", "npm", "react"]),
      t("rank", "Popularity rank", ["rank", "npm", "react"]),
    ],
  },
  {
    provider: "chocolatey",
    description: "Chocolatey version and downloads.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "git"]),
      t("dt", "Total downloads", ["dt", "git"]),
    ],
  },
  {
    provider: "flathub",
    description: "Flathub version and downloads.",
    defaultTopic: "v",
    topics: [
      t("v", "Latest version", ["v", "org.gimp.GIMP"]),
      t("downloads", "Downloads", ["downloads", "org.gimp.GIMP"]),
    ],
  },
  {
    provider: "snapcraft",
    description: "Snapcraft latest version.",
    freeform: true,
    topics: [],
  },
  {
    provider: "fdroid",
    description: "F-Droid latest version.",
    freeform: true,
    topics: [],
  },
  {
    provider: "discourse",
    description: "Discourse forum topics, posts, users, and likes.",
    topics: [
      t("topics", "Topic count", ["topics", "meta.discourse.org"]),
      t("posts", "Post count", ["posts", "meta.discourse.org"]),
      t("users", "User count", ["users", "meta.discourse.org"]),
      t("likes", "Like count", ["likes", "meta.discourse.org"]),
    ],
  },
  {
    provider: "stackexchange",
    description: "Stack Exchange tag questions and reputation.",
    topics: [
      t("tag", "Questions for a tag", ["tag", "typescript"]),
      t("reputation", "User reputation", ["reputation", "22656"]),
    ],
  },
  {
    provider: "modrinth",
    description: "Modrinth downloads, followers, and version.",
    topics: [
      t("downloads", "Downloads", ["downloads", "sodium"]),
      t("followers", "Followers", ["followers", "sodium"]),
      t("v", "Latest version", ["v", "sodium"]),
      t("game-versions", "Supported game versions", ["game-versions", "sodium"]),
    ],
  },
  {
    provider: "openvsx",
    description: "Open VSX version, downloads, and rating.",
    topics: [
      t("v", "Latest version", ["rust-lang", "rust-analyzer", "v"]),
      t("downloads", "Downloads", ["rust-lang", "rust-analyzer", "downloads"]),
      t("rating", "Average rating", ["rust-lang", "rust-analyzer", "rating"]),
    ],
  },
  {
    provider: "liberapay",
    description: "Liberapay receiving, patrons, and goal.",
    topics: [
      t("receiving", "Weekly receiving", ["receiving", "someuser"]),
      t("patrons", "Patron count", ["patrons", "someuser"]),
      t("goal", "Goal progress", ["goal", "someuser"]),
    ],
  },
  {
    provider: "matrix",
    description: "Matrix room members.",
    defaultTopic: "members",
    topics: [
      t("members", "Room members", ["members", "matrix"]),
    ],
  },
  {
    provider: "weblate",
    description: "Weblate translation progress and languages.",
    topics: [
      t("translation", "Translation progress", ["translation", "hosted.weblate.org", "weblate", "application"]),
      t("languages", "Language count", ["languages", "hosted.weblate.org", "weblate", "application"]),
    ],
  },
  {
    provider: "shipperclub",
    description: "ShipperClub membership badge.",
    freeform: true,
    topics: [],
  },
]

/** Fast lookup by provider key. */
export const REGISTRY_BY_PROVIDER: ReadonlyMap<string, BadgeProvider> = new Map(
  REGISTRY.map((p) => [p.provider, p])
)

/** Is this provider modeled in the registry yet? */
export function isRegistered(provider: string): boolean {
  return REGISTRY_BY_PROVIDER.has(provider)
}

/**
 * Resolve the topic for a set of path segments (segments AFTER the provider).
 * Returns the matching BadgeTopic, or null if the topic is unknown.
 *
 * Strategy (order matters):
 *   1. Freeform providers → the wildcard topic (any path, all variants).
 *   2. The first segment that is a known topic key wins. This handles every
 *      segment ordering uniformly — `/{topic}/...`, `/.../{topic}`, etc. —
 *      because topic keys are distinctive keywords, not user values.
 *   3. No topic segment present → the provider's defaultTopic, if any.
 *   4. Otherwise unknown.
 */
export function resolveTopic(provider: string, rest: string[]): BadgeTopic | null {
  const entry = REGISTRY_BY_PROVIDER.get(provider)
  if (!entry) return null
  if (entry.freeform) {
    return entry.variants ? { ...FREEFORM_TOPIC, variants: entry.variants } : FREEFORM_TOPIC
  }

  const byKey = new Map(entry.topics.map((t) => [t.topic, t]))
  const pick = (t: BadgeTopic | undefined) =>
    t && !t.variants && entry.variants ? { ...t, variants: entry.variants } : (t ?? null)

  for (const seg of rest) {
    const hit = byKey.get(seg)
    if (hit) return pick(hit)
  }

  if (entry.defaultTopic) {
    return pick(byKey.get(entry.defaultTopic))
  }
  return null
}

/** Variants allowed for a topic (falls back to ALL_VARIANTS). */
export function allowedVariants(topic: BadgeTopic): readonly BadgeStyle[] {
  return topic.variants ?? ALL_VARIANTS
}

/**
 * Variants allowed for a resolved badge path (e.g. "/github/vercel/next.js/ci.svg"
 * or "github/ci/vercel/react"). Used by the builder/showcase to narrow the
 * variant dropdown to only what the selected badge actually supports.
 *
 * Falls back to ALL_VARIANTS for providers not modeled in the registry yet, so
 * the dropdown never over-restricts during incremental rollout.
 */
export function allowedVariantsForPath(path: string): readonly BadgeStyle[] {
  const clean = path
    .replace(/\.(svg|png|gif|json)$/i, "")
    .split("/")
    .filter(Boolean)
  if (clean.length === 0) return ALL_VARIANTS

  // Groups render multiple badges; variants apply uniformly, so allow all.
  const provider = clean[0]
  if (provider === "group") return ALL_VARIANTS
  if (!isRegistered(provider)) return ALL_VARIANTS

  const topic = resolveTopic(provider, clean.slice(1))
  return topic ? allowedVariants(topic) : ALL_VARIANTS
}
