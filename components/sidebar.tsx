"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const docsNav: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Agent Skill", href: "/docs/skill" },
      { title: "API Reference", href: "/docs/api-reference" },
      { title: "Token Pool", href: "/token-pool" },
      { title: "Sponsor", href: "/sponsor" },
    ],
  },
  {
    title: "Badges",
    items: [
      { title: "Static Badge", href: "/docs/badges/static" },
      { title: "Dynamic JSON", href: "/docs/badges/dynamic-json" },
      { title: "HTTPS Endpoint", href: "/docs/badges/https-endpoint" },
    ],
  },
  {
    title: "npm",
    items: [
      { title: "Overview", href: "/docs/badges/npm" },
      { title: "Version", href: "/docs/badges/npm/version" },
      { title: "Downloads", href: "/docs/badges/npm/downloads" },
      { title: "License", href: "/docs/badges/npm/license" },
      { title: "Node Version", href: "/docs/badges/npm/node" },
      { title: "Types", href: "/docs/badges/npm/types" },
      { title: "Dependents", href: "/docs/badges/npm/dependents" },
    ],
  },
  {
    title: "Discord",
    items: [
      { title: "Overview", href: "/docs/badges/discord" },
      { title: "Online Count", href: "/docs/badges/discord/online" },
      { title: "Members", href: "/docs/badges/discord/members" },
      { title: "Online Members", href: "/docs/badges/discord/online-members" },
    ],
  },
  {
    title: "GitHub",
    items: [
      { title: "Overview", href: "/docs/badges/github" },
      { title: "Stars", href: "/docs/badges/github/stars" },
      { title: "Forks", href: "/docs/badges/github/forks" },
      { title: "License", href: "/docs/badges/github/license" },
      { title: "Releases & Tags", href: "/docs/badges/github/release" },
      { title: "Downloads", href: "/docs/badges/github/downloads" },
      { title: "CI Status", href: "/docs/badges/github/ci" },
      { title: "Issues", href: "/docs/badges/github/issues" },
      { title: "Pull Requests", href: "/docs/badges/github/prs" },
      { title: "Commits", href: "/docs/badges/github/commits" },
      { title: "Repository", href: "/docs/badges/github/repository" },
    ],
  },
  {
    title: "Package Registries",
    items: [
      { title: "PyPI", href: "/docs/badges/pypi" },
      { title: "Crates.io", href: "/docs/badges/crates" },
      { title: "Docker Hub", href: "/docs/badges/docker" },
      { title: "Packagist", href: "/docs/badges/packagist" },
      { title: "RubyGems", href: "/docs/badges/rubygems" },
      { title: "NuGet", href: "/docs/badges/nuget" },
      { title: "Pub.dev", href: "/docs/badges/pub" },
      { title: "Homebrew", href: "/docs/badges/homebrew" },
      { title: "Homebrew Downloads", href: "/docs/badges/homebrew/downloads" },
      { title: "Maven Central", href: "/docs/badges/maven" },
      { title: "CocoaPods", href: "/docs/badges/cocoapods" },
      { title: "JSR", href: "/docs/badges/jsr" },
      { title: "Bundlephobia", href: "/docs/badges/bundlephobia" },
    ],
  },
  {
    title: "Social",
    items: [
      { title: "Bluesky", href: "/docs/badges/bluesky" },
      { title: "YouTube", href: "/docs/badges/youtube" },
      { title: "Mastodon", href: "/docs/badges/mastodon" },
      { title: "Lemmy", href: "/docs/badges/lemmy" },
      { title: "Hacker News", href: "/docs/badges/hackernews" },
      { title: "Twitch", href: "/docs/badges/twitch" },
    ],
  },
  {
    title: "Tools & Services",
    items: [
      { title: "VS Code Marketplace", href: "/docs/badges/vscode" },
      { title: "Open Collective", href: "/docs/badges/opencollective" },
      { title: "Codecov", href: "/docs/badges/codecov" },
      { title: "WakaTime", href: "/docs/badges/wakatime" },
      { title: "Tokscale", href: "/docs/badges/tokscale" },
    ],
  },
  {
    title: "Customization",
    items: [
      { title: "Themes", href: "/docs/customization/themes" },
      { title: "Styles", href: "/docs/customization/styles" },
    ],
  },
  {
    title: "Registry",
    items: [
      { title: "Overview", href: "/docs/registry" },
      { title: "ReadmeBadge", href: "/docs/registry/readme-badge" },
      { title: "ReadmeBadgeRow", href: "/docs/registry/readme-badge-row" },
      { title: "BadgePreview", href: "/docs/registry/badge-preview" },
    ],
  },
]

export { docsNav }

export function Sidebar() {
  const pathname = usePathname()
  const prefersReducedMotion = useReducedMotion()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = React.useState(false)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function check() {
      if (!el) return
      setCanScroll(el.scrollHeight > el.clientHeight + 2)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (!el) return
      const nearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 16
      setCanScroll(!nearBottom && el.scrollHeight > el.clientHeight + 2)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto p-4 pb-14 no-scrollbar"
      >
        <nav className="flex flex-col gap-1">
          {docsNav.map((group, i) => (
            <div key={group.title} className="flex flex-col gap-0.5">
              <p className={cn(
                "px-2 pb-0.5 text-xs font-bold uppercase tracking-wide text-foreground",
                i === 0 ? "pt-0" : "pt-3"
              )}>
                {group.title}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      isActive
                        ? "font-medium text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-md bg-accent"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : {
                                type: "spring",
                                stiffness: 500,
                                damping: 35,
                              }
                        }
                      />
                    )}
                    <span className="relative z-10">{item.title}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col items-center transition-opacity duration-200",
          canScroll ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="h-8 w-full bg-gradient-to-t from-background to-transparent" />
        <button
          type="button"
          aria-label="Scroll down for more"
          onClick={() =>
            scrollRef.current?.scrollBy({ top: 120, behavior: "smooth" })
          }
          className="flex w-full cursor-pointer flex-col items-center gap-0.5 bg-background pb-3 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            More
          </span>
          <ChevronDown className="size-3 motion-safe:animate-pulse text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
