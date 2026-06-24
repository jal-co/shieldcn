"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, useReducedMotion, AnimatePresence, LayoutGroup, type Transition } from "motion/react"
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
  /**
   * When set, this group is a sub-category nested under a single collapsible
   * parent section on desktop (e.g. all badge providers under "Badge
   * Providers"). Mobile nav still renders these as flat top-level groups.
   */
  section?: string
}

// ---------------------------------------------------------------------------
// Navigation data
// ---------------------------------------------------------------------------

const PROVIDERS_SECTION = "Badge Providers"

const docsNav: NavGroup[] = [
  {
    title: "Getting Started",
    alwaysOpen: true,
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "README Studio", href: "/docs/studio" },
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

  // --- Badge providers (nested under one collapsible parent on desktop) ---
  {
    title: "Source Control",
    section: PROVIDERS_SECTION,
    items: [
      { title: "GitHub", href: "/docs/badges/github" },
      { title: "GitLab", href: "/docs/badges/gitlab" },
    ],
  },
  {
    title: "Package Registries",
    section: PROVIDERS_SECTION,
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
    section: PROVIDERS_SECTION,
    items: [
      { title: "Chrome Web Store", href: "/docs/badges/chrome" },
      { title: "Mozilla Add-ons", href: "/docs/badges/amo" },
      { title: "Flathub", href: "/docs/badges/flathub" },
      { title: "F-Droid", href: "/docs/badges/fdroid" },
    ],
  },
  {
    title: "Social & Community",
    section: PROVIDERS_SECTION,
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
    section: PROVIDERS_SECTION,
    items: [
      { title: "Codecov", href: "/docs/badges/codecov" },
      { title: "Coveralls", href: "/docs/badges/coveralls" },
      { title: "SonarCloud", href: "/docs/badges/sonar" },
    ],
  },
  {
    title: "Tools & Services",
    section: PROVIDERS_SECTION,
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
    title: "Charts",
    alwaysOpen: true,
    items: [{ title: "Overview", href: "/docs/charts" }],
  },
  {
    title: "Headers",
    alwaysOpen: true,
    items: [
      { title: "Overview", href: "/docs/headers" },
      { title: "Generator", href: "/header" },
    ],
  },
  {
    title: "Sponsors",
    alwaysOpen: true,
    items: [
      { title: "Overview", href: "/docs/sponsors" },
      { title: "Generator", href: "/sponsors" },
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

function itemMatchesPath(item: NavItem, pathname: string): boolean {
  return pathname === item.href || (item.children?.some(c => pathname === c.href) ?? false)
}

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some(item => itemMatchesPath(item, pathname))
}

const ITEM_SPRING: Transition = { type: "spring", stiffness: 500, damping: 38 }

// ---------------------------------------------------------------------------
// NavLink — a single leaf link with an animated active rail + hover motion
// ---------------------------------------------------------------------------

function NavLink({
  href,
  title,
  isActive,
  reduce,
}: {
  href: string
  title: string
  isActive: boolean
  reduce: boolean | null
}) {
  return (
    <Link
      href={href}
      data-sidebar-active={isActive ? "true" : undefined}
      className={cn(
        "group/navlink relative flex items-center rounded-md py-1.5 pl-3 pr-2 text-sm leading-5 outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        isActive
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {/* hover wash (sits behind text, only when not active) */}
      {!isActive && (
        <span className="absolute inset-0 rounded-md bg-accent opacity-0 transition-opacity duration-150 group-hover/navlink:opacity-60" />
      )}

      {/* active treatment: tint + sliding rail (shared element) */}
      {isActive && (
        <>
          <motion.span
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-md bg-accent"
            transition={reduce ? { duration: 0 } : ITEM_SPRING}
          />
          <motion.span
            layoutId="sidebar-active-rail"
            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
            transition={reduce ? { duration: 0 } : ITEM_SPRING}
          />
        </>
      )}

      <span
        className={cn(
          "relative z-10 truncate transition-transform duration-150",
          !isActive && "group-hover/navlink:translate-x-0.5",
        )}
      >
        {title}
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// CollapsibleNavItem — a provider/page that has sub-pages
// ---------------------------------------------------------------------------

function CollapsibleNavItem({
  item,
  pathname,
  reduce,
}: {
  item: NavItem
  pathname: string
  reduce: boolean | null
}) {
  const isActive = pathname === item.href
  const hasChildren = (item.children?.length ?? 0) > 0
  const childActive = hasChildren && item.children!.some(c => pathname === c.href)
  const isRelevant = isActive || childActive
  const [open, setOpen] = React.useState(isRelevant)
  const prevPathRef = React.useRef(pathname)

  React.useEffect(() => {
    if (prevPathRef.current !== pathname && isRelevant) setOpen(true)
    prevPathRef.current = pathname
  }, [pathname, isRelevant])

  if (!hasChildren) {
    return <NavLink href={item.href} title={item.title} isActive={isActive} reduce={reduce} />
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <div className="flex-1">
          <NavLink href={item.href} title={item.title} isActive={isActive} reduce={reduce} />
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? `Collapse ${item.title}` : `Expand ${item.title}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronRight className={cn("size-3.5 transition-transform duration-200", open && "rotate-90")} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border/70 pl-2">
              {item.children!.map(child => (
                <NavLink
                  key={child.href}
                  href={child.href}
                  title={child.title}
                  isActive={pathname === child.href}
                  reduce={reduce}
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
// SectionHeading — uniform top-level section header (collapsible or static)
// ---------------------------------------------------------------------------

function SectionHeading({
  title,
  open,
  onToggle,
  active,
}: {
  title: string
  open?: boolean
  onToggle?: () => void
  active?: boolean
}) {
  const classes = cn(
    "flex w-full items-center justify-between px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
    active ? "text-foreground" : "text-muted-foreground/80",
  )
  if (!onToggle) {
    return (
      <p className={classes}>
        <span>{title}</span>
      </p>
    )
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(classes, "rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50")}
    >
      <span>{title}</span>
      <ChevronRight className={cn("size-3 shrink-0 transition-transform duration-200", open && "rotate-90")} />
    </button>
  )
}

// ---------------------------------------------------------------------------
// CollapsibleSection — one top-level group
// ---------------------------------------------------------------------------

function CollapsibleSection({
  group,
  pathname,
  reduce,
}: {
  group: NavGroup
  pathname: string
  reduce: boolean | null
}) {
  const containsActive = groupContainsPath(group, pathname)
  const [open, setOpen] = React.useState(group.alwaysOpen || containsActive)
  const prevPathRef = React.useRef(pathname)

  React.useEffect(() => {
    if (prevPathRef.current !== pathname && containsActive) setOpen(true)
    prevPathRef.current = pathname
  }, [pathname, containsActive])

  const items = (
    <div className="flex flex-col gap-0.5">
      {group.items.map(item => (
        <CollapsibleNavItem key={item.href} item={item} pathname={pathname} reduce={reduce} />
      ))}
    </div>
  )

  if (group.alwaysOpen) {
    return (
      <div className="flex flex-col">
        <SectionHeading title={group.title} active={containsActive} />
        {items}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <SectionHeading title={group.title} open={open} onToggle={() => setOpen(o => !o)} active={containsActive} />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden pt-0.5"
          >
            {items}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProvidersSection — the "Badge Providers" mega-group: collapsible parent,
// live filter, and collapsible category sub-groups.
// ---------------------------------------------------------------------------

function ProviderCategory({
  group,
  pathname,
  reduce,
}: {
  group: NavGroup
  pathname: string
  reduce: boolean | null
}) {
  const containsActive = groupContainsPath(group, pathname)
  const [open, setOpen] = React.useState(containsActive)
  const prevPathRef = React.useRef(pathname)

  React.useEffect(() => {
    if (prevPathRef.current !== pathname && containsActive) setOpen(true)
    prevPathRef.current = pathname
  }, [pathname, containsActive])

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between rounded-md py-1.5 pl-3 pr-2 text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          containsActive ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="truncate">{group.title}</span>
        <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border/70 pl-2">
              {group.items.map(item => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  isActive={pathname === item.href}
                  reduce={reduce}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ProvidersSection({
  groups,
  pathname,
  reduce,
}: {
  groups: NavGroup[]
  pathname: string
  reduce: boolean | null
}) {
  const containsActive = groups.some(g => groupContainsPath(g, pathname))
  const [open, setOpen] = React.useState(containsActive)
  const prevPathRef = React.useRef(pathname)

  React.useEffect(() => {
    if (prevPathRef.current !== pathname && containsActive) setOpen(true)
    prevPathRef.current = pathname
  }, [pathname, containsActive])

  return (
    <div className="flex flex-col">
      <SectionHeading title={PROVIDERS_SECTION} open={open} onToggle={() => setOpen(o => !o)} active={containsActive} />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden pt-0.5"
          >
            <div className="flex flex-col gap-0.5">
              {groups.map(g => (
                <ProviderCategory key={g.title} group={g} pathname={pathname} reduce={reduce} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search (command palette)
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
        <span className="flex-1 text-left text-muted-foreground/80">Search docs</span>
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
  const reduce = useReducedMotion()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = React.useState(false)

  // Split nav into ordered render units: standalone groups + one providers block.
  const renderUnits = React.useMemo(() => {
    const units: ({ kind: "group"; group: NavGroup } | { kind: "providers"; groups: NavGroup[] })[] = []
    const providerGroups = docsNav.filter(g => g.section === PROVIDERS_SECTION)
    let providersInserted = false
    for (const group of docsNav) {
      if (group.section === PROVIDERS_SECTION) {
        if (!providersInserted) {
          units.push({ kind: "providers", groups: providerGroups })
          providersInserted = true
        }
        continue
      }
      units.push({ kind: "group", group })
    }
    return units
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function check() {
      if (!el) return
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 16
      setCanScroll(!nearBottom && el.scrollHeight > el.clientHeight + 2)
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
    const frame = requestAnimationFrame(() => {
      const active = el.querySelector<HTMLElement>('[data-sidebar-active="true"]')
      if (!active) return
      const containerRect = el.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      const isVisible =
        activeRect.top >= containerRect.top + 16 &&
        activeRect.bottom <= containerRect.bottom - 56
      if (!isVisible) {
        active.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname, reduce])

  return (
    <div className="relative flex h-full flex-col">
      {/* Search */}
      <div className="shrink-0 p-4 pb-3">
        <DocsSearch />
      </div>

      {/* Scrollable nav */}
      <div ref={scrollRef} className="no-scrollbar flex-1 overflow-y-auto px-4 pb-14">
        <LayoutGroup>
          <nav className="flex flex-col gap-1">
            {renderUnits.map((unit, i) =>
              unit.kind === "providers" ? (
                <ProvidersSection key={`providers-${i}`} groups={unit.groups} pathname={pathname} reduce={reduce} />
              ) : (
                <CollapsibleSection key={unit.group.title} group={unit.group} pathname={pathname} reduce={reduce} />
              ),
            )}
          </nav>
        </LayoutGroup>
      </div>

      {/* "More" scroll affordance */}
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
          onClick={() => scrollRef.current?.scrollBy({ top: 120, behavior: "smooth" })}
          className="flex w-full cursor-pointer flex-col items-center gap-0.5 bg-background pb-3 pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">More</span>
          <ChevronDown className="size-3 text-muted-foreground motion-safe:animate-pulse" />
        </button>
      </div>
    </div>
  )
}
