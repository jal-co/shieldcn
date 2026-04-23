"use client"

import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { BadgeCard, type ShowcaseBadge } from "@/components/badge-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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

const featuredBadges: ShowcaseBadge[] = [
  dynamicBadge("GitHub Stars", "featured github", "/github/stars/vercel/next.js.svg?variant=outline", "A clean social-proof badge that works well in a top README row.", "/docs/badges/github"),
  dynamicBadge("GitHub CI", "featured github", "/github/ci/vercel/next.js.svg?variant=secondary", "A softer CI badge that reads cleanly in a top README row.", "/docs/badges/github"),
  dynamicBadge("npm Version", "featured npm", "/npm/react.svg?variant=secondary", "A softer package version badge that pairs well with download badges.", "/docs/badges/npm"),
  dynamicBadge("Discord Members", "featured discord", "/discord/members/reactiflux.svg?variant=outline", "Community-size badge using the Discord invite API with counts.", "/docs/badges/discord"),
  dynamicBadge("Coverage", "featured static", "/badge/coverage-95%25-blue.svg?theme=blue", "A polished coverage badge for quality-focused README rows."),
  makeLogoBadge("typescript", "TypeScript", "3178C6", "&variant=secondary"),
]

const categories: Category[] = [
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
      dynamicBadge("Discord Online Members", "invite api", "/discord/online-members/reactiflux.svg?theme=blue", "Approximate online members using invite counts.", "/docs/badges/discord"),
    ],
  },
  {
    name: "README Staples",
    description: "A curated set of badges you’d actually use together in a polished README header.",
    icons: [
      dynamicBadge("Build Passing", "quality", "/badge/build-passing-green.svg", "Classic build badge for status rows."),
      dynamicBadge("Coverage 95%", "quality", "/badge/coverage-95%25-blue.svg?theme=blue", "Coverage badge with a stronger visual identity."),
      dynamicBadge("License MIT", "metadata", "/badge/license-MIT-green.svg?variant=outline", "Subtle metadata badge for repo headers."),
      dynamicBadge("Version 2.0", "metadata", "/badge/version-2.0-violet.svg?variant=secondary", "Version badge for changelog or release-oriented projects."),
      dynamicBadge("PRs Welcome", "community", "/badge/PRs-welcome-brightgreen.svg?variant=secondary", "Contributor-friendly signal for open source repos."),
      dynamicBadge("Node >=18", "compatibility", "/badge/node-%3E%3D18-green.svg?variant=outline", "Compatibility badge for tooling and libraries."),
    ],
  },
  {
    name: "Testing & Build",
    description: "Testing tools, CI badges, and build ecosystem examples that look good out of the box.",
    icons: [
      dynamicBadge("GitHub CI", "workflow status", "/github/ci/vercel/next.js.svg?variant=secondary", "Default recommendation for CI badges.", "/docs/badges/github"),
      dynamicBadge("Build Passing", "status", "/badge/build-passing-brightgreen.svg?theme=green", "Bright status badge for quality rows."),
      dynamicBadge("Vitest", "brand", "/badge/Vitest-tested-6E9F18.svg?logo=vitest&variant=secondary", "Branded Vitest badge for modern TS apps."),
      dynamicBadge("Playwright", "brand", "/badge/Playwright-e2e-2EAD33.svg?logo=playwright&variant=secondary", "Branded E2E badge for browser test suites."),
      makeLogoBadge("jest", "Jest", "C21325", "&variant=outline"),
      makeLogoBadge("cypress", "Cypress", "69D3A7", "&variant=outline"),
    ],
  },
  {
    name: "Brand Badges",
    description: "Logo-first badges for tech stack sections and integration grids.",
    icons: [
      makeLogoBadge("typescript", "TypeScript", "3178C6", "&variant=secondary"),
      makeLogoBadge("react", "React", "61DAFB", "&variant=secondary"),
      makeLogoBadge("nextdotjs", "Next.js", "000000", "&variant=secondary"),
      makeLogoBadge("tailwindcss", "Tailwind CSS", "06B6D4", "&variant=secondary"),
      makeLogoBadge("docker", "Docker", "2496ED", "&variant=outline"),
      makeLogoBadge("postgresql", "PostgreSQL", "4169E1", "&variant=outline"),
      makeLogoBadge("vercel", "Vercel", "000000", "&variant=secondary"),
      makeLogoBadge("supabase", "Supabase", "3FCF8E", "&variant=outline"),
    ],
  },
  {
    name: "AI",
    description: "Polished AI-flavored badges for product marketing, demos, and agent-powered tools.",
    icons: [
      dynamicBadge("Built with Claude", "ai badge", "/badge/Built%20with-Claude-D97757.svg?logo=anthropic&variant=secondary", "AI product badge styled with Anthropic / Claude brand color."),
      dynamicBadge("Built with OpenAI", "ai badge", "/badge/Built%20with-OpenAI-412991.svg?logo=openai&variant=secondary", "Product badge for OpenAI-powered tools and workflows."),
      dynamicBadge("AI Powered", "ai badge", "/badge/AI-powered-7C3AED.svg?logo=openai&variant=secondary", "Generic AI product badge for feature pages and landing sections."),
      dynamicBadge("Agentic", "ai badge", "/badge/Agentic-workflows-D97757.svg?logo=anthropic&variant=secondary", "Strong fit for autonomous workflow and copiloting products."),
      dynamicBadge("RAG Enabled", "ai badge", "/badge/RAG-enabled-0EA5E9.svg?logo=huggingface&variant=secondary", "Useful for retrieval-augmented search and knowledge products."),
      dynamicBadge("MCP Ready", "ai badge", "/badge/MCP-ready-111827.svg?logo=openai&variant=outline", "Good badge for tool ecosystems and agent integration docs."),
      dynamicBadge("Runs Local Models", "ai badge", "/badge/Runs-local%20models-111111.svg?logo=ollama&variant=outline", "Good fit for privacy-first or self-hosted AI products."),
      dynamicBadge("Claude Code", "ai badge", "/badge/Claude-Code-D97757.svg?logo=anthropic&variant=outline", "Brand-forward badge for Claude-powered coding tools."),
      dynamicBadge("OpenAI API", "ai badge", "/badge/OpenAI-API-412991.svg?logo=openai&variant=outline", "Integration badge for products built on the OpenAI API."),
      dynamicBadge("Powered by Ollama", "ai badge", "/badge/Powered%20by-Ollama-111111.svg?logo=ollama&variant=outline", "Good for self-hosted or local-model experiences."),
      makeLogoBadge("anthropic", "Anthropic", "D97757", "&variant=secondary"),
      makeLogoBadge("openai", "OpenAI", "412991", "&variant=secondary"),
      makeLogoBadge("huggingface", "Hugging Face", "FFD21E", "&variant=secondary"),
    ],
  },
]

const ALL_CATEGORY_NAMES = ["All", ...categories.map((c) => c.name)]
const totalIconCount = categories.reduce((sum, c) => sum + c.icons.length, 0)

export default function ShowcasePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  const activeCategoryData = categories.find((c) => c.name === activeCategory)

  const filteredIcons = useMemo(() => {
    const icons = activeCategory === "All"
      ? Array.from(
          new Map(categories.flatMap((c) => c.icons).map((icon) => [icon.badgePath, icon])).values()
        )
      : activeCategoryData?.icons ?? []

    if (!searchQuery.trim()) return icons

    const q = searchQuery.toLowerCase()
    return icons.filter((icon) =>
      [icon.title, icon.subtitle, icon.description ?? ""].some((value) =>
        value.toLowerCase().includes(q)
      )
    )
  }, [activeCategory, activeCategoryData, searchQuery])

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-14 md:px-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Badge Showcase</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A curated set of shieldcn badge examples designed to look good in real-world README rows,
            docs pages, package pages, and community sections. Click any card to tweak it and copy the exact output.
          </p>
          <p className="text-xs text-muted-foreground">
            {totalIconCount}+ curated examples · focused on useful, polished badge patterns
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Featured examples</h2>
            <span className="text-xs text-muted-foreground">starter row ideas</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featuredBadges.map((badge) => (
              <BadgeCard key={`featured-${badge.badgePath}-${badge.title}`} badge={badge} />
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search badges by name, provider, or use case…"
            className="h-10 pl-9 pr-9"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORY_NAMES.map((cat) => {
            const count = cat === "All"
              ? totalIconCount
              : categories.find((c) => c.name === cat)?.icons.length ?? 0
            const isActive = activeCategory === cat

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                <span>{cat}</span>
                <Badge
                  variant={isActive ? "outline" : "secondary"}
                  className={isActive
                    ? "h-4 min-w-[18px] justify-center border-primary-foreground/20 bg-primary-foreground/10 px-1 text-[10px] text-primary-foreground"
                    : "h-4 min-w-[18px] justify-center px-1 text-[10px]"
                  }
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>

        {activeCategory !== "All" && activeCategoryData ? (
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="text-sm font-medium">{activeCategoryData.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{activeCategoryData.description}</p>
          </div>
        ) : null}

        {filteredIcons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="text-4xl opacity-30">🔍</div>
            <div>
              <p className="text-sm font-medium">No badges found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different search or switch category.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setActiveCategory("All")
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredIcons.map((badge) => (
              <BadgeCard key={`${activeCategory}-${badge.badgePath}-${badge.title}`} badge={badge} />
            ))}
          </div>
        )}

        {filteredIcons.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {filteredIcons.length} badge{filteredIcons.length === 1 ? "" : "s"}
            {searchQuery ? ` matching “${searchQuery}”` : ""}
            {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
          </p>
        ) : null}
      </div>
    </main>
  )
}
