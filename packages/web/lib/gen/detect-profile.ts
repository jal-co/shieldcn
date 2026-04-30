// shieldcn — lib/gen/detect-profile.ts
// Profile README badge detection — inspects a GitHub user profile and their
// top repos to generate profile-oriented badge sets.

import type { Badge } from "./shieldcn"
import { staticBadgePath } from "./shieldcn"
import { matchBrand } from "./brands"
import { proxyFetch } from "./proxy-fetch"

export type ProfileInspectResult = {
  source: { username: string; url: string }
  badges: Badge[]
  notes: string[]
  profile: GitHubUserProfile | null
}

export type GitHubUserProfile = {
  login: string
  name: string | null
  bio: string | null
  location: string | null
  company: string | null
  blog: string | null
  twitter_username: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  avatar_url: string
}

type GitHubRepo = {
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  language: string | null
  fork: boolean
  archived: boolean
  topics: string[]
}

type PackageJson = {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const API = "https://api.github.com"
const RAW = "https://raw.githubusercontent.com"

// ── Helpers ──────────────────────────────────────────

function isAbort(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === "AbortError" ||
      (typeof DOMException !== "undefined" &&
        e instanceof DOMException &&
        e.name === "AbortError"))
  )
}

async function fetchJson<T = unknown>(
  url: string,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    const res = await proxyFetch(url, signal)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch (e) {
    if (isAbort(e)) throw e
    return null
  }
}

async function fetchText(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await proxyFetch(url, signal)
    if (!res.ok) return null
    return await res.text()
  } catch (e) {
    if (isAbort(e)) throw e
    return null
  }
}

function parseUsername(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Pure username: letters, numbers, hyphens
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(trimmed)) {
    return trimmed
  }

  // GitHub URL: https://github.com/{username}
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    )
    if (!/^github\.com$/i.test(url.hostname)) return null
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/")
    // Must be exactly one segment (user profile, not a repo)
    if (parts.length === 1 && parts[0]) return parts[0]
    return null
  } catch {
    return null
  }
}

// ── Social link extraction from README ───────────────

interface SocialLink {
  platform: string
  url: string
  slug: string
  color: string
  username?: string
}

function extractSocialLinks(readme: string): SocialLink[] {
  const links: SocialLink[] = []
  const seen = new Set<string>()

  const patterns: Array<{
    platform: string
    re: RegExp
    slug: string
    color: string
    extractUsername?: (match: RegExpMatchArray) => string | undefined
  }> = [
    {
      platform: "Twitter / X",
      re: /https?:\/\/(?:twitter\.com|x\.com)\/([\w]+)/gi,
      slug: "x",
      color: "000000",
      extractUsername: (m) => m[1],
    },
    {
      platform: "LinkedIn",
      re: /https?:\/\/(?:www\.)?linkedin\.com\/in\/([\w-]+)/gi,
      slug: "linkedin",
      color: "0A66C2",
      extractUsername: (m) => m[1],
    },
    {
      platform: "YouTube",
      re: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)([\w-]+)/gi,
      slug: "youtube",
      color: "FF0000",
      extractUsername: (m) => m[1],
    },
    {
      platform: "Twitch",
      re: /https?:\/\/(?:www\.)?twitch\.tv\/([\w]+)/gi,
      slug: "twitch",
      color: "9146FF",
    },
    {
      platform: "Discord",
      re: /https?:\/\/discord\.(?:gg|com\/invite)\/([\w-]+)/gi,
      slug: "discord",
      color: "5865F2",
    },
    {
      platform: "Dev.to",
      re: /https?:\/\/dev\.to\/([\w-]+)/gi,
      slug: "devdotto",
      color: "0A0A0A",
    },
    {
      platform: "Hashnode",
      re: /https?:\/\/([\w-]+)\.hashnode\.dev/gi,
      slug: "hashnode",
      color: "2962FF",
    },
    {
      platform: "Medium",
      re: /https?:\/\/(?:medium\.com|[\w]+\.medium\.com)\/@?([\w-]+)/gi,
      slug: "medium",
      color: "000000",
    },
    {
      platform: "Stack Overflow",
      re: /https?:\/\/stackoverflow\.com\/users\/(\d+)/gi,
      slug: "stackoverflow",
      color: "F58025",
    },
    {
      platform: "Mastodon",
      re: /https?:\/\/([\w.-]+)\/@([\w]+)/gi,
      slug: "mastodon",
      color: "6364FF",
    },
    {
      platform: "Bluesky",
      re: /https?:\/\/bsky\.app\/profile\/([\w.-]+)/gi,
      slug: "bluesky",
      color: "0085FF",
    },
    {
      platform: "Instagram",
      re: /https?:\/\/(?:www\.)?instagram\.com\/([\w.]+)/gi,
      slug: "instagram",
      color: "E4405F",
    },
    {
      platform: "Reddit",
      re: /https?:\/\/(?:www\.)?reddit\.com\/u(?:ser)?\/([\w-]+)/gi,
      slug: "reddit",
      color: "FF4500",
    },
  ]

  for (const { platform, re, slug, color, extractUsername } of patterns) {
    const matches = [...readme.matchAll(re)]
    if (matches.length === 0) continue
    if (seen.has(slug)) continue
    seen.add(slug)
    const match = matches[0]!
    const url = match[0]
    links.push({
      platform,
      url,
      slug,
      color,
      username: extractUsername?.(match),
    })
  }

  return links
}

// ── Language → brand mapping ─────────────────────────

const LANGUAGE_BRANDS: Record<
  string,
  { slug: string; color: string; label: string }
> = {
  TypeScript: { slug: "typescript", color: "3178C6", label: "TypeScript" },
  JavaScript: { slug: "javascript", color: "F7DF1E", label: "JavaScript" },
  Python: { slug: "python", color: "3776AB", label: "Python" },
  Rust: { slug: "rust", color: "000000", label: "Rust" },
  Go: { slug: "go", color: "00ADD8", label: "Go" },
  Java: { slug: "openjdk", color: "ED8B00", label: "Java" },
  Kotlin: { slug: "kotlin", color: "7F52FF", label: "Kotlin" },
  Swift: { slug: "swift", color: "F05138", label: "Swift" },
  Ruby: { slug: "ruby", color: "CC342D", label: "Ruby" },
  PHP: { slug: "php", color: "777BB4", label: "PHP" },
  "C#": { slug: "csharp", color: "512BD4", label: "C#" },
  "C++": { slug: "cplusplus", color: "00599C", label: "C++" },
  C: { slug: "c", color: "A8B9CC", label: "C" },
  Dart: { slug: "dart", color: "0175C2", label: "Dart" },
  Elixir: { slug: "elixir", color: "4B275F", label: "Elixir" },
  Haskell: { slug: "haskell", color: "5D4F85", label: "Haskell" },
  Lua: { slug: "lua", color: "2C2D72", label: "Lua" },
  Scala: { slug: "scala", color: "DC322F", label: "Scala" },
  Shell: { slug: "gnubash", color: "4EAA25", label: "Bash" },
  Vue: { slug: "vuedotjs", color: "4FC08D", label: "Vue" },
  Svelte: { slug: "svelte", color: "FF3E00", label: "Svelte" },
  Zig: { slug: "zig", color: "F7A41D", label: "Zig" },
  Nim: { slug: "nim", color: "FFE953", label: "Nim" },
  Nix: { slug: "nixos", color: "5277C3", label: "Nix" },
  OCaml: { slug: "ocaml", color: "EC6813", label: "OCaml" },
  Clojure: { slug: "clojure", color: "5881D8", label: "Clojure" },
  R: { slug: "r", color: "276DC3", label: "R" },
  MATLAB: { slug: "matlab", color: "0076A8", label: "MATLAB" },
  Jupyter: { slug: "jupyter", color: "F37626", label: "Jupyter" },
}

const SKILLS_CAP = 12

// ── Badge builders ───────────────────────────────────

function profileBadges(
  user: GitHubUserProfile,
  username: string,
): Badge[] {
  const badges: Badge[] = []

  const mk = (
    id: string,
    label: string,
    path: string,
    query: Record<string, string> = {},
    linkUrl?: string,
  ): Badge => ({
    id,
    group: "profile",
    label,
    path,
    query,
    overrides: {},
    enabled: true,
    linkUrl,
  })

  badges.push(
    mk(
      "profile.followers",
      "GitHub Followers",
      `/github/followers/${username}.svg`,
      { variant: "secondary" },
      `https://github.com/${username}?tab=followers`,
    ),
  )
  badges.push(
    mk(
      "profile.stars",
      "GitHub Stars",
      `/github/user-stars/${username}.svg`,
      { variant: "secondary" },
      `https://github.com/${username}?tab=repositories`,
    ),
  )
  badges.push(
    mk(
      "profile.repos",
      "Public Repos",
      staticBadgePath("Repos", String(user.public_repos), "2563eb"),
      { logo: "github", variant: "secondary" },
      `https://github.com/${username}?tab=repositories`,
    ),
  )

  if (user.location) {
    badges.push(
      mk(
        "profile.location",
        "Location",
        staticBadgePath("Location", user.location, "6366f1"),
        { logo: "googlemaps", variant: "ghost" },
      ),
    )
  }

  if (user.company) {
    const company = user.company.replace(/^@/, "")
    badges.push(
      mk(
        "profile.company",
        "Company",
        staticBadgePath("Company", company, "1f2937"),
        { logo: "building", variant: "ghost" },
      ),
    )
  }

  return badges
}

function socialBadges(
  user: GitHubUserProfile,
  username: string,
  readme: string | null,
): Badge[] {
  const badges: Badge[] = []
  const seen = new Set<string>()

  const mk = (
    id: string,
    label: string,
    path: string,
    query: Record<string, string> = {},
    linkUrl?: string,
  ): Badge => ({
    id,
    group: "social",
    label,
    path,
    query,
    overrides: {},
    enabled: true,
    linkUrl,
  })

  // GitHub profile
  badges.push(
    mk(
      "social.github",
      "GitHub",
      staticBadgePath("GitHub", `@${username}`, "181717"),
      { logo: "github", variant: "branded" },
      `https://github.com/${username}`,
    ),
  )
  seen.add("github")

  // Twitter from API
  if (user.twitter_username) {
    badges.push(
      mk(
        "social.twitter",
        "Twitter / X",
        staticBadgePath("Follow", `@${user.twitter_username}`, "000000"),
        { logo: "x", variant: "branded" },
        `https://x.com/${user.twitter_username}`,
      ),
    )
    seen.add("x")
  }

  // Website from API
  if (user.blog) {
    const blog = user.blog.startsWith("http")
      ? user.blog
      : `https://${user.blog}`
    const displayUrl = blog
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
    badges.push(
      mk(
        "social.website",
        "Website",
        staticBadgePath("Website", displayUrl, "181717"),
        { logo: "ri:LuLink", variant: "branded" },
        blog,
      ),
    )
  }

  // Extract additional social links from README
  if (readme) {
    const socialLinks = extractSocialLinks(readme)
    for (const link of socialLinks) {
      if (seen.has(link.slug)) continue
      seen.add(link.slug)
      const display = link.username
        ? `@${link.username}`
        : link.platform
      badges.push(
        mk(
          `social.${link.slug}`,
          link.platform,
          staticBadgePath(link.platform, display, link.color),
          { logo: link.slug, variant: "branded" },
          link.url,
        ),
      )
    }
  }

  return badges
}

function skillsBadges(
  repos: GitHubRepo[],
  packageJsons: (PackageJson | null)[],
): Badge[] {
  const badges: Badge[] = []
  const seen = new Set<string>()

  // 1. Languages from repos (weighted by stars)
  const langWeight = new Map<string, number>()
  for (const repo of repos) {
    if (!repo.language || repo.fork || repo.archived) continue
    const w = langWeight.get(repo.language) ?? 0
    langWeight.set(repo.language, w + Math.max(repo.stargazers_count, 1))
  }
  const sortedLangs = [...langWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  for (const [lang] of sortedLangs) {
    const brand = LANGUAGE_BRANDS[lang]
    if (!brand || seen.has(brand.slug)) continue
    seen.add(brand.slug)
    badges.push({
      id: `skills.lang.${brand.slug}`,
      group: "skills",
      label: brand.label,
      path: staticBadgePath("", brand.label, brand.color),
      query: { logo: brand.slug, variant: "branded" },
      overrides: {},
      enabled: true,
    })
  }

  // 2. Frameworks & tools from package.json dependencies
  const allDeps: Record<string, string> = {}
  for (const pkg of packageJsons) {
    if (!pkg) continue
    Object.assign(allDeps, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies)
  }

  const depBrands: Array<{ slug: string; label: string; color: string }> = []
  for (const name of Object.keys(allDeps)) {
    const brand = matchBrand(name)
    if (!brand || seen.has(brand.slug)) continue
    seen.add(brand.slug)
    depBrands.push(brand)
    if (depBrands.length >= SKILLS_CAP - badges.length) break
  }

  for (const brand of depBrands) {
    badges.push({
      id: `skills.dep.${brand.slug}`,
      group: "skills",
      label: brand.label,
      path: staticBadgePath("", brand.label, brand.color),
      query: { logo: brand.slug, variant: "branded" },
      overrides: {},
      enabled: true,
    })
  }

  return badges.slice(0, SKILLS_CAP)
}

function repoBadges(repos: GitHubRepo[]): Badge[] {
  // Pick top repos by stars (non-fork, non-archived)
  const top = repos
    .filter((r) => !r.fork && !r.archived && r.stargazers_count > 0)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)

  return top.map((repo) => ({
    id: `repos.${repo.full_name.replace("/", ".")}`,
    group: "repos" as const,
    label: `${repo.name} ⭐ ${repo.stargazers_count}`,
    path: `/github/stars/${repo.full_name}.svg`,
    query: { variant: "secondary" },
    overrides: {},
    enabled: true,
    linkUrl: repo.html_url,
  }))
}

// ── Main inspect function ────────────────────────────

export async function inspectProfile(
  input: string,
  externalSignal?: AbortSignal,
): Promise<ProfileInspectResult | { error: string }> {
  const username = parseUsername(input)
  if (!username) {
    return { error: "Enter a GitHub username (e.g. jal-co)" }
  }

  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException("Timeout", "AbortError")),
    20_000,
  )
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason)
    else
      externalSignal.addEventListener("abort", () =>
        controller.abort(externalSignal.reason),
      )
  }
  const signal = controller.signal

  try {
    // 1. Fetch user profile + repos in parallel
    const [user, repos] = await Promise.all([
      fetchJson<GitHubUserProfile>(`${API}/users/${username}`, signal),
      fetchJson<GitHubRepo[]>(
        `${API}/users/${username}/repos?sort=stars&per_page=30&type=owner`,
        signal,
      ),
    ])

    if (!user) {
      return { error: `GitHub user "${username}" not found` }
    }

    const notes: string[] = []
    const allBadges: Badge[] = []

    // 2. Fetch profile README
    const readme = await fetchText(
      `${RAW}/${username}/${username}/HEAD/README.md`,
      signal,
    )
    if (!readme) {
      notes.push(
        `No profile README found at ${username}/${username}. Create one to unlock social badge detection.`,
      )
    }

    // 3. Profile badges
    allBadges.push(...profileBadges(user, username))

    // 4. Social badges
    allBadges.push(...socialBadges(user, username, readme))

    // 5. Skills — scan top repos for package.json
    const repoList = repos ?? []
    const topRepos = repoList
      .filter((r) => !r.fork && !r.archived)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 6)

    const packageJsons = await Promise.all(
      topRepos.map((repo) =>
        fetchText(
          `${RAW}/${repo.full_name}/HEAD/package.json`,
          signal,
        ).then((text) => {
          if (!text) return null
          try {
            return JSON.parse(text) as PackageJson
          } catch {
            return null
          }
        }),
      ),
    )

    allBadges.push(...skillsBadges(repoList, packageJsons))

    // 6. Top repos
    allBadges.push(...repoBadges(repoList))

    if (topRepos.length === 0) {
      notes.push("No public repos with stars found — repo badges skipped.")
    }

    const pkgsScanned = packageJsons.filter(Boolean).length
    if (pkgsScanned > 0) {
      notes.push(
        `Scanned ${pkgsScanned} package.json file${pkgsScanned === 1 ? "" : "s"} for skill detection.`,
      )
    }

    return {
      source: { username, url: `https://github.com/${username}` },
      badges: allBadges,
      notes,
      profile: user,
    }
  } catch (e) {
    if (isAbort(e)) {
      return { error: controller.signal.reason?.message ?? "Request was cancelled" }
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export { parseUsername }
