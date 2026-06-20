"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, useReducedMotion, AnimatePresence, LayoutGroup } from "motion/react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Search, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"

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
      { title: "CLI", href: "/docs/cli" },
      { title: "Agent Skill", href: "/docs/skill" },
      { title: "Self-Hosting", href: "/docs/self-hosting" },
      { title: "API Reference", href: "/docs/api-reference" },
      { title: "Token Pool", href: "/token-pool" },
      { title: "Sponsor", href: "/sponsor" },
    ],
  },
  {
    title: "Customization",
    items: [
      { title: "Themes", href: "/docs/customization/themes" },
      { title: "Styles", href: "/docs/customization/styles" },
      { title: "Logos & Icons", href: "/docs/customization/logos" },
      { title: "Fonts", href: "/docs/customization/fonts" },
      { title: "Light & Dark Mode", href: "/docs/customization/light-dark-mode" },
    ],
  },
  {
    title: "Badges",
    alwaysOpen: true,
    items: [
      { title: "Badge Group", href: "/docs/badges/group" },
      { title: "Static Badge", href: "/docs/badges/static" },
      { title: "Dynamic JSON", href: "/docs/badges/dynamic-json" },
      { title: "HTTPS Endpoint", href: "/docs/badges/https-endpoint" },
    ],
  },
  {
    title: "Charts",
    alwaysOpen: true,
    items: [
      { title: "Overview", href: "/docs/charts" },
    ],
  },
  {
    title: "Source Control",
    items: [
      { title: "GitHub", href: "/docs/badges/github" },
      { title: "GitLab", href: "/docs/badges/gitlab" },
    ],
  },
  {
    title: "Package Registries",
    items: [
      { title: "npm", href: "/docs/badges/npm" },
      { title: "PyPI", href: "/docs/badges/pypi" },
      { title: "Crates.io", href: "/docs/badges/crates" },
      { title: "Docker Hub", href: "/docs/badges/docker" },
      { title: "Conda", href: "/docs/badges/conda" },
      { title: "Packagist", href: "/docs/badges/packagist" },
      { title: "RubyGems", href: "/docs/badges/rubygems" },
      { title: "NuGet", href: "/docs/badges/nuget" },
      { title: "Pub.dev", href: "/docs/badges/pub" },
      { title: "Homebrew", href: "/docs/badges/homebrew" },
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
      { title: "Discord", href: "/docs/badges/discord" },
      { title: "NBA", href: "/docs/badges/nba" },
      { title: "Bluesky", href: "/docs/badges/bluesky" },
      { title: "X / Twitter", href: "/docs/badges/x" },
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
      { title: "Liberapay", href: "/docs/badges/liberapay" },
      { title: "WakaTime", href: "/docs/badges/wakatime" },
      { title: "Weblate", href: "/docs/badges/weblate" },
      { title: "Modrinth", href: "/docs/badges/modrinth" },
      { title: "Tokscale", href: "/docs/badges/tokscale" },
      { title: "skills.sh", href: "/docs/badges/skills" },
      { title: "Country Flags", href: "/docs/badges/flag" },
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
  const [open, setOpen] = React.useState(containsActive)
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
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-sm px-2 pb-1 text-xs font-bold uppercase tracking-wide transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          containsActive ? "text-foreground" : "text-muted-foreground",
          index === 0 ? "pt-0" : "pt-4",
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
            className="overflow-hidden pt-0.5"
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
          data-sidebar-active={isActive ? "true" : undefined}
          className={cn(
            "relative flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
      data-sidebar-active={isActive ? "true" : undefined}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
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
        className="group flex h-10 w-full items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-muted-foreground shadow-sm shadow-black/5 transition-all hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-white/[0.03] dark:shadow-none dark:hover:bg-white/[0.05]"
      >
        <Search className="size-4 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-muted-foreground" />
        <span className="flex-1 text-left text-muted-foreground/80">
          Search docs
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
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

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const frame = requestAnimationFrame(() => {
      const active = el.querySelector<HTMLElement>(
        '[data-sidebar-active="true"]',
      )
      if (!active) return

      const containerRect = el.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      const isVisible =
        activeRect.top >= containerRect.top + 16 &&
        activeRect.bottom <= containerRect.bottom - 56

      if (!isVisible) {
        active.scrollIntoView({
          block: "center",
          behavior: prefersReducedMotion ? "auto" : "smooth",
        })
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [pathname, prefersReducedMotion])

  return (
    <div className="relative h-full flex flex-col">
      {/* Search */}
      <div className="shrink-0 p-4 pb-3">
        <DocsSearch />
      </div>

      {/* Scrollable nav */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-14 no-scrollbar"
      >
        <LayoutGroup>
          <nav className="flex flex-col gap-1.5">
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
        </LayoutGroup>
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
