/**
 * shieldcn
 * lib/showcase-data
 *
 * Shared badge data used by the showcase page and the hero marquee.
 */

export interface ShowcaseBadge {
  title: string
  subtitle: string
  badgePath: string
  description?: string
  docsHref?: string
}

interface Category {
  name: string
  description: string
  icons: ShowcaseBadge[]
}

function makeLogoBadge(slug: string, title: string, hex: string, extra = ""): ShowcaseBadge {
  const isDark = parseInt(hex, 16) < 0x808080
  const logoColor = isDark ? "fff" : "000"
  return {
    title,
    subtitle: "brand badge",
    badgePath: `/badge/${encodeURIComponent(title)}-${hex}.svg?logo=${slug}&logoColor=${logoColor}${extra}`,
    description: `Branded ${title} badge using Simple Icons. Best for stack rows, integration lists, and polished README sections.`,
  }
}

function dynamicBadge(
  title: string,
  subtitle: string,
  badgePath: string,
  description: string,
  docsHref?: string
): ShowcaseBadge {
  return { title, subtitle, badgePath, description, docsHref }
}

export const featuredBadges: ShowcaseBadge[] = [
  dynamicBadge("GitHub Stars", "featured github", "/github/stars/vercel/next.js.svg?variant=outline", "A clean social-proof badge that works well in a top README row.", "/docs/badges/github"),
  dynamicBadge("GitHub CI", "featured github", "/github/ci/vercel/next.js.svg?variant=secondary", "A softer CI badge that reads cleanly in a top README row.", "/docs/badges/github"),
  dynamicBadge("npm Version", "featured npm", "/npm/react.svg?variant=secondary", "A softer package version badge that pairs well with download badges.", "/docs/badges/npm"),
  dynamicBadge("Discord Members", "featured discord", "/discord/members/reactiflux.svg?variant=outline", "Community-size badge using the Discord invite API with counts.", "/docs/badges/discord"),
  dynamicBadge("Coverage", "featured static", "/badge/coverage-95%25-blue.svg?theme=blue", "A polished coverage badge for quality-focused README rows."),
  makeLogoBadge("typescript", "TypeScript", "3178C6", "&variant=secondary"),
]

export const categories: Category[] = [
  {
    name: "GitHub",
    description: "Best GitHub badge types for repos: social proof, release metadata, health, and maintenance signals.",
    icons: [
      dynamicBadge("GitHub Stars", "social proof", "/github/stars/vercel/next.js.svg?variant=outline", "Great as a top-row trust signal in READMEs.", "/docs/badges/github"),
      dynamicBadge("GitHub Forks", "social proof", "/github/forks/vercel/next.js.svg?variant=outline", "Pairs naturally with stars for project traction.", "/docs/badges/github"),
      dynamicBadge("GitHub Release", "release metadata", "/github/release/vercel/next.js.svg", "Latest release version for product or OSS repos.", "/docs/badges/github"),
      dynamicBadge("GitHub Last Commit", "maintenance", "/github/last-commit/vercel/next.js.svg?variant=secondary", "A good maintenance/freshness badge.", "/docs/badges/github"),
      dynamicBadge("GitHub Open Issues", "issue tracking", "/github/open-issues/vercel/next.js.svg?variant=secondary", "Useful for contributor-facing repos.", "/docs/badges/github"),
      dynamicBadge("GitHub Open PRs", "issue tracking", "/github/open-prs/vercel/next.js.svg?variant=secondary", "Useful when your project gets outside contributions.", "/docs/badges/github"),
      dynamicBadge("GitHub Contributors", "community", "/github/contributors/vercel/next.js.svg?theme=emerald", "Contributor count with a warmer, community-oriented feel.", "/docs/badges/github"),
      dynamicBadge("GitHub CI", "build health", "/github/ci/vercel/next.js.svg?variant=secondary", "Recommended default presentation for workflow status.", "/docs/badges/github"),
    ],
  },
  {
    name: "npm",
    description: "High-value package badges for package pages and library READMEs.",
    icons: [
      dynamicBadge("npm Version", "package metadata", "/npm/react.svg?variant=secondary", "Recommended package version badge style.", "/docs/badges/npm"),
      dynamicBadge("npm Weekly Downloads", "package growth", "/npm/react/downloads.svg", "Good social signal for package adoption.", "/docs/badges/npm"),
      dynamicBadge("npm Total Downloads", "package growth", "/npm/dt/react.svg?variant=outline", "Long-term adoption signal.", "/docs/badges/npm"),
      dynamicBadge("npm Types", "developer experience", "/npm/types/react.svg?theme=blue", "Highlights TS support clearly.", "/docs/badges/npm"),
      dynamicBadge("npm Node Version", "compatibility", "/npm/node/react.svg?variant=outline", "Good compatibility badge for libraries.", "/docs/badges/npm"),
      dynamicBadge("npm License", "package metadata", "/npm/license/react.svg?variant=ghost", "Subtle metadata badge for footer rows.", "/docs/badges/npm"),
    ],
  },
  {
    name: "Discord",
    description: "Community badges using either the widget API or invite-count API.",
    icons: [
      dynamicBadge("Discord Online", "widget api", "/discord/1316199667142496307.svg?variant=secondary", "Live online count using the server widget API.", "/docs/badges/discord"),
      dynamicBadge("Discord Members", "invite api", "/discord/members/reactiflux.svg?variant=outline", "Approximate member count using the invite API with counts.", "/docs/badges/discord"),
      dynamicBadge("Discord Online Members", "invite api", "/discord/online-members/reactiflux.svg?variant=branded", "Approximate online members using invite counts.", "/docs/badges/discord"),
    ],
  },
  {
    name: "README Staples",
    description: "A curated set of badges you'd actually use together in a polished README header.",
    icons: [
      dynamicBadge("Build Passing", "quality", "/badge/build-passing-green.svg", "Classic build badge for status rows."),
      dynamicBadge("Coverage 95%", "quality", "/badge/coverage-95%25-blue.svg?theme=blue", "Coverage badge with a stronger visual identity."),
      dynamicBadge("License MIT", "metadata", "/badge/license-MIT-green.svg?variant=outline", "Subtle metadata badge for repo headers."),
      dynamicBadge("Version 2.0", "metadata", "/badge/version-2.0-violet.svg?variant=secondary", "Version badge for changelog or release-oriented projects."),
      dynamicBadge("PRs Welcome", "community", "/badge/PRs-welcome-brightgreen.svg?variant=secondary", "Contributor-friendly signal for open source repos."),
      dynamicBadge("Node >=18", "compatibility", "/badge/node-%3E%3D18-green.svg?variant=outline", "Compatibility badge for tooling and libraries."),
      dynamicBadge("Runs on MacOS", "platform", "/badge/Runs%20on-MacOS-000000.svg?mode=light&logo=apple&logoColor=fff", "Platform badge for macOS-compatible tools and apps."),
      dynamicBadge("Runs on Windows", "platform", "/badge/Runs%20on-Windows-0078D4.svg?logo=windows&logoColor=fff", "Platform badge for Windows-compatible tools and apps."),
      dynamicBadge("Runs on Linux", "platform", "/badge/Runs%20on-Linux-FCC624.svg?logo=linux&logoColor=000", "Platform badge for Linux-compatible tools and apps."),
    ],
  },
  {
    name: "Testing & Build",
    description: "Testing tools, CI badges, and build ecosystem examples that look good out of the box.",
    icons: [
      dynamicBadge("GitHub CI", "workflow status", "/github/ci/vercel/next.js.svg?variant=secondary", "Default recommendation for CI badges.", "/docs/badges/github"),
      dynamicBadge("Build Passing", "status", "/badge/build-passing-brightgreen.svg?theme=green", "Bright status badge for quality rows."),
      dynamicBadge("Vitest", "brand", "/badge/Vitest-tested-6E9F18.svg?logo=vitest&variant=branded", "Branded Vitest badge for modern TS apps."),
      dynamicBadge("Playwright", "brand", "/badge/Playwright-e2e-2EAD33.svg?logo=playwright&variant=branded", "Branded E2E badge for browser test suites."),
      makeLogoBadge("jest", "Jest", "C21325", "&variant=branded"),
      makeLogoBadge("cypress", "Cypress", "69D3A7", "&variant=branded"),
    ],
  },
  {
    name: "Brand Badges",
    description: "Logo-first badges for tech stack sections and integration grids.",
    icons: [
      makeLogoBadge("typescript", "TypeScript", "3178C6", "&variant=branded"),
      makeLogoBadge("react", "React", "61DAFB", "&variant=branded"),
      makeLogoBadge("nextdotjs", "Next.js", "000000", "&variant=branded"),
      makeLogoBadge("tailwindcss", "Tailwind CSS", "06B6D4", "&variant=branded"),
      makeLogoBadge("docker", "Docker", "2496ED", "&variant=branded"),
      makeLogoBadge("postgresql", "PostgreSQL", "4169E1", "&variant=branded"),
      makeLogoBadge("vercel", "Vercel", "000000", "&variant=branded"),
      makeLogoBadge("supabase", "Supabase", "3FCF8E", "&variant=branded"),
    ],
  },
  {
    name: "AI",
    description: "Polished AI-flavored badges for product marketing, demos, and agent-powered tools.",
    icons: [
      dynamicBadge("Built with Claude", "ai badge", "/badge/Built%20with-Claude-D97757.svg?logo=anthropic&variant=secondary", "AI product badge styled with Anthropic / Claude brand color."),
      dynamicBadge("Built with OpenAI", "ai badge", "/badge/Built%20with-OpenAI-412991.svg?logo=ri:SiOpenai&variant=secondary", "Product badge for OpenAI-powered tools and workflows."),
      dynamicBadge("AI Powered", "ai badge", "/badge/AI-powered-7C3AED.svg?logo=ri:SiOpenai&variant=secondary", "Generic AI product badge for feature pages and landing sections."),
      dynamicBadge("Agentic", "ai badge", "/badge/Agentic-workflows-D97757.svg?logo=anthropic&variant=secondary", "Strong fit for autonomous workflow and copiloting products."),
      dynamicBadge("RAG Enabled", "ai badge", "/badge/RAG-enabled-0EA5E9.svg?logo=huggingface&variant=secondary", "Useful for retrieval-augmented search and knowledge products."),
      dynamicBadge("MCP Ready", "ai badge", "/badge/MCP-ready-111827.svg?logo=ri:VscMcp&variant=secondary", "Good badge for tool ecosystems and agent integration docs."),
      dynamicBadge("Runs Local Models", "ai badge", "/badge/Runs-local%20models-111111.svg?logo=ollama&variant=secondary", "Good fit for privacy-first or self-hosted AI products."),
      dynamicBadge("Claude Code", "ai badge", "/badge/Claude-Code-D97757.svg?logo=anthropic&variant=outline", "Brand-forward badge for Claude-powered coding tools."),
      dynamicBadge("OpenAI API", "ai badge", "/badge/OpenAI-API-412991.svg?logo=ri:SiOpenai&variant=secondary", "Integration badge for products built on the OpenAI API."),
      dynamicBadge("Powered by Ollama", "ai badge", "/badge/Powered%20by-Ollama-111111.svg?logo=ollama&variant=secondary", "Good for self-hosted or local-model experiences."),
      makeLogoBadge("anthropic", "Anthropic", "D97757", "&variant=secondary"),
      makeLogoBadge("openai", "OpenAI", "412991", "&variant=secondary"),
      makeLogoBadge("huggingface", "Hugging Face", "FFD21E", "&variant=secondary"),
    ],
  },
]

/** All unique badge paths from all categories. */
export const allBadgePaths: string[] = Array.from(
  new Set([
    ...featuredBadges.map(b => b.badgePath),
    ...categories.flatMap(c => c.icons.map(b => b.badgePath)),
  ])
)
