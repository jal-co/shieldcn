"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion, AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Search, FileText, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

interface NavItem {
  title: string
  href: string
  children?: NavItem[]
}

interface NavGroup {
  title: string
  items: NavItem[]
  /** If true, always show expanded (no collapse toggle). */
  alwaysOpen?: boolean
}

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

const docsNav: NavGroup[] = [
  {
    title: "Getting Started",
    alwaysOpen: true,
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Agent Skill", href: "/docs/skill" },
      { title: "Self-Hosting", href: "/docs/self-hosting" },
      { title: "API Reference", href: "/docs/api-reference" },
      { title: "Token Pool", href: "/token-pool" },
      { title: "Sponsor", href: "/sponsor" },
    ],
  },
  {
    title: "Badges",
    alwaysOpen: true,
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
    title: "GitLab",
    items: [
      { title: "Overview", href: "/docs/badges/gitlab" },
      { title: "Stars", href: "/docs/badges/gitlab/stars" },
      { title: "Forks", href: "/docs/badges/gitlab/forks" },
      { title: "Pipeline", href: "/docs/badges/gitlab/pipeline" },
      { title: "Issues", href: "/docs/badges/gitlab/issues" },
      { title: "Release", href: "/docs/badges/gitlab/release" },
      { title: "License", href: "/docs/badges/gitlab/license" },
      { title: "Repository", href: "/docs/badges/gitlab/repository" },
    ],
  },
  {
    title: "Package Registries",
    items: [
      { title: "PyPI", href: "/docs/badges/pypi" },
      { title: "Crates.io", href: "/docs/badges/crates" },
      { title: "Docker Hub", href: "/docs/badges/docker" },
      { title: "Conda", href: "/docs/badges/conda" },
      { title: "Packagist", href: "/docs/badges/packagist" },
      { title: "RubyGems", href: "/docs/badges/rubygems" },
      { title: "NuGet", href: "/docs/badges/nuget" },
      { title: "Pub.dev", href: "/docs/badges/pub" },
      {
        title: "Homebrew",
        href: "/docs/badges/homebrew",
        children: [
          { title: "Downloads", href: "/docs/badges/homebrew/downloads" },
        ],
      },
      { title: "Maven Central", href: "/docs/badges/maven" },
      { title: "CocoaPods", href: "/docs/badges/cocoapods" },
      { title: "JSR", href: "/docs/badges/jsr" },
      { title: "Bundlephobia", href: "/docs/badges/bundlephobia" },
      { title: "jsDelivr", href: "/docs/badges/jsdelivr" },
      { title: "Chocolatey", href: "/docs/badges/chocolatey" },
      { title: "Snapcraft", href: "/docs/badges/snapcraft" },
    ],
  },
  {
    title: "App Stores",
    items: [
      { title: "Chrome Web Store", href: "/docs/badges/chrome" },
      { title: "Mozilla Add-ons", href: "/docs/badges/amo" },
      { title: "Flathub", href: "/docs/badges/flathub" },
      { title: "F-Droid", href: "/docs/badges/fdroid" },
    ],
  },
  {
    title: "Social & Community",
    items: [
      { title: "Bluesky", href: "/docs/badges/bluesky" },
      { title: "YouTube", href: "/docs/badges/youtube" },
      { title: "Mastodon", href: "/docs/badges/mastodon" },
      { title: "Lemmy", href: "/docs/badges/lemmy" },
      { title: "Hacker News", href: "/docs/badges/hackernews" },
      { title: "Twitch", href: "/docs/badges/twitch" },
      { title: "Discourse", href: "/docs/badges/discourse" },
      { title: "Matrix", href: "/docs/badges/matrix" },
      { title: "Stack Exchange", href: "/docs/badges/stackexchange" },
    ],
  },
  {
    title: "Code Quality",
    items: [
      { title: "Codecov", href: "/docs/badges/codecov" },
      { title: "Coveralls", href: "/docs/badges/coveralls" },
      { title: "SonarCloud", href: "/docs/badges/sonar" },
    ],
  },
  {
    title: "Tools & Services",
    items: [
      { title: "VS Code Marketplace", href: "/docs/badges/vscode" },
      { title: "Open VSX", href: "/docs/badges/openvsx" },
      { title: "Open Collective", href: "/docs/badges/opencollective" },
      {
        title: "Liberapay",
        href: "/docs/badges/liberapay",
        children: [
          { title: "Receiving", href: "/docs/badges/liberapay/receiving" },
          { title: "Patrons", href: "/docs/badges/liberapay/patrons" },
          { title: "Goal", href: "/docs/badges/liberapay/goal" },
        ],
      },
      { title: "WakaTime", href: "/docs/badges/wakatime" },
      {
        title: "Weblate",
        href: "/docs/badges/weblate",
        children: [
          { title: "Translation", href: "/docs/badges/weblate/translation" },
          { title: "Languages", href: "/docs/badges/weblate/languages" },
        ],
      },
      {
        title: "Modrinth",
        href: "/docs/badges/modrinth",
        children: [
          { title: "Downloads", href: "/docs/badges/modrinth/downloads" },
          { title: "Followers", href: "/docs/badges/modrinth/followers" },
          { title: "Version", href: "/docs/badges/modrinth/version" },
          { title: "Game Versions", href: "/docs/badges/modrinth/game-versions" },
        ],
      },
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if any item (or its children) in a group matches the pathname. */
function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some(
    item =>
      pathname === item.href ||
      item.children?.some(c => pathname === c.href),
  )
}

// ---------------------------------------------------------------------------
// Collapsible section heading — wraps an entire NavGroup
// ---------------------------------------------------------------------------

function CollapsibleSection({
  group,
  pathname,
  index,
  prefersReducedMotion,
}: {
  group: NavGroup
  pathname: string
  index: number
  prefersReducedMotion: boolean | null
}) {
  const containsActive = groupContainsPath(group, pathname)
  const [open, setOpen] = React.useState(true)
  const prevPathRef = React.useRef(pathname)

  // Auto-expand when navigating into this section
  React.useEffect(() => {
    if (prevPathRef.current !== pathname && containsActive) {
      setOpen(true)
    }
    prevPathRef.current = pathname
  }, [pathname, containsActive])

  if (group.alwaysOpen) {
    return (
      <div className="flex flex-col gap-0.5">
        <p
          className={cn(
            "px-2 pb-0.5 text-xs font-bold uppercase tracking-wide text-foreground",
            index === 0 ? "pt-0" : "pt-3",
          )}
        >
          {group.title}
        </p>
        {group.items.map(item => (
          <CollapsibleNavItem
            key={item.href}
            item={item}
            pathname={pathname}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex w-full items-center justify-between px-2 pb-0.5 text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm",
          index === 0 ? "pt-0" : "pt-3",
        )}
      >
        <span>{group.title}</span>
        <ChevronRight
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.15, ease: "easeInOut" }
            }
            className="overflow-hidden"
          >
            {group.items.map(item => (
              <CollapsibleNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible nav item — for providers with sub-pages
// ---------------------------------------------------------------------------

function CollapsibleNavItem({
  item,
  pathname,
  prefersReducedMotion,
}: {
  item: NavItem
  pathname: string
  prefersReducedMotion: boolean | null
}) {
  const isActive = pathname === item.href
  const hasChildren = item.children && item.children.length > 0
  const childActive = hasChildren && item.children!.some(c => pathname === c.href)
  const isRelevant = isActive || childActive
  const [open, setOpen] = React.useState(isRelevant)
  const prevPathRef = React.useRef(pathname)

  // Auto-expand only when navigating TO this provider's pages
  React.useEffect(() => {
    if (prevPathRef.current !== pathname && isRelevant) {
      setOpen(true)
    }
    prevPathRef.current = pathname
  }, [pathname, isRelevant])

  if (!hasChildren) {
    return (
      <NavLink
        href={item.href}
        title={item.title}
        isActive={isActive}
        prefersReducedMotion={prefersReducedMotion}
      />
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center">
        <Link
          href={item.href}
          className={cn(
            "relative flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            isActive
              ? "font-medium text-accent-foreground"
              : "text-muted-foreground",
          )}
        >
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-md bg-accent"
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 500, damping: 35 }
              }
            />
          )}
          <span className="relative z-10">{item.title}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? `Collapse ${item.title}` : `Expand ${item.title}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.15, ease: "easeInOut" }
            }
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 border-l border-border ml-3 pl-2">
              {item.children!.map(child => (
                <NavLink
                  key={child.href}
                  href={child.href}
                  title={child.title}
                  isActive={pathname === child.href}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single nav link
// ---------------------------------------------------------------------------

function NavLink({
  href,
  title,
  isActive,
  prefersReducedMotion,
}: {
  href: string
  title: string
  isActive: boolean
  prefersReducedMotion: boolean | null
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isActive
          ? "font-medium text-accent-foreground"
          : "text-muted-foreground",
      )}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-md bg-accent"
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 35 }
          }
        />
      )}
      <span className="relative z-10">{title}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

interface SearchItem {
  title: string
  href: string
  group: string
}

function buildSearchIndex(groups: NavGroup[]): SearchItem[] {
  const result: SearchItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      result.push({ title: item.title, href: item.href, group: group.title })
      if (item.children) {
        for (const child of item.children) {
          result.push({ title: child.title, href: child.href, group: `${group.title} › ${item.title}` })
        }
      }
    }
  }
  return result
}

const searchIndex = buildSearchIndex(docsNav)

function DocsSearch() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement))
      ) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const onSelect = React.useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  // Group items by their group name
  const grouped = React.useMemo(() => {
    const map = new Map<string, SearchItem[]>()
    for (const item of searchIndex) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    return map
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full items-center gap-2 rounded-md border border-border bg-transparent px-2.5 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Search docs...</span>
        <kbd className="pointer-events-none select-none rounded border border-border px-1 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search documentation"
        description="Search all badge providers, guides, and reference docs."
      >
        <CommandInput placeholder="Search docs..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Array.from(grouped.entries()).map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map(item => (
                <CommandItem
                  key={item.href}
                  value={`${item.group} ${item.title}`}
                  onSelect={() => onSelect(item.href)}
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

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
    <div className="relative h-full flex flex-col">
      {/* Search */}
      <div className="shrink-0 p-4 pb-2">
        <DocsSearch />
      </div>

      {/* Scrollable nav */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-14 no-scrollbar"
      >
        <nav className="flex flex-col gap-1">
          {docsNav.map((group, i) => (
            <CollapsibleSection
              key={group.title}
              group={group}
              pathname={pathname}
              index={i}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col items-center transition-opacity duration-200",
          canScroll ? "opacity-100" : "pointer-events-none opacity-0",
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
