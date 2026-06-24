"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { BadgeGroupModal } from "@/components/badge-group-modal"
import { BadgeModal } from "@/components/badge-modal"
import { ShowcaseSubmitDialog } from "@/components/showcase-submit-dialog"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { cn } from "@/lib/utils"
import {
  categories,
  featuredBadges,
  groupShowcaseItems,
  type GroupShowcaseItem,
  type ShowcaseBadge,
} from "@/lib/showcase-data"

type ShowcaseCategory = (typeof categories)[number]
type ShowcaseItem =
  | { kind: "badge"; badge: ShowcaseBadge; weight: number }
  | { kind: "group"; group: GroupShowcaseItem; weight: number }

const displayCategories = combineCategories(categories)
const categoryNames = ["All", "Groups", ...displayCategories.map((category) => category.name)]
const totalIconCount = uniqueBadges([
  ...featuredBadges,
  ...displayCategories.flatMap((category) => category.icons),
]).length + groupShowcaseItems.length

const subscribeToHydration = () => () => {}
const getHydratedSnapshot = () => true
const getServerSnapshot = () => false

function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerSnapshot)
}

function uniqueBadges(badges: ShowcaseBadge[]) {
  return Array.from(new Map(badges.map((badge) => [badge.badgePath, badge])).values())
}

function badgeItems(badges: ShowcaseBadge[], offset = 0): ShowcaseItem[] {
  return uniqueBadges(badges).map((badge, index) => ({
    kind: "badge",
    badge,
    weight: index + offset,
  }))
}

function groupItems(offset = 0): ShowcaseItem[] {
  return groupShowcaseItems.map((group, index) => ({
    kind: "group",
    group,
    weight: index + offset,
  }))
}

function combineCategories(source: ShowcaseCategory[]) {
  return source.reduce<ShowcaseCategory[]>((acc, category) => {
    const existing = acc.find((item) => item.name === category.name)

    if (existing) {
      existing.icons = uniqueBadges([...existing.icons, ...category.icons])
      return acc
    }

    acc.push({ ...category })
    return acc
  }, [])
}

function allShowcaseItems() {
  const badges = badgeItems([
    ...featuredBadges,
    ...displayCategories.flatMap((category) => category.icons),
  ])
  const groups = groupItems(500)
  const firstGroups = groups.slice(0, 3)
  const remainingGroups = groups.slice(3)

  return [
    ...badges.slice(0, 5),
    ...firstGroups,
    ...badges.slice(5, 18),
    ...remainingGroups,
    ...badges.slice(18),
  ]
}

const ALL_ITEMS = allShowcaseItems()
const AUTO_CLOSE_THRESHOLD = 10

function categoryCount(name: string) {
  if (name === "All") return totalIconCount
  if (name === "Groups") return groupShowcaseItems.length
  return displayCategories.find((category) => category.name === name)?.icons.length ?? 0
}

function computeItems(category: string, query: string): ShowcaseItem[] {
  const base = category === "All"
    ? ALL_ITEMS
    : category === "Groups"
      ? groupItems()
      : badgeItems(displayCategories.find((c) => c.name === category)?.icons ?? [])

  const q = query.trim().toLowerCase()
  if (!q) return base

  return base.filter((item) =>
    item.kind === "badge" ? badgeMatches(item.badge, q) : groupMatches(item.group, q)
  )
}

function badgeMatches(badge: ShowcaseBadge, q: string) {
  return [badge.title, badge.subtitle, badge.description ?? ""].some((value) =>
    value.toLowerCase().includes(q)
  )
}

function groupMatches(group: GroupShowcaseItem, q: string) {
  return [group.title, group.description].some((value) => value.toLowerCase().includes(q))
}

function buildCategoryOptions(q: string): { name: string; count: number }[] {
  if (!q) {
    return categoryNames.map((name) => ({ name, count: categoryCount(name) }))
  }

  const groupCount = groupShowcaseItems.filter((group) => groupMatches(group, q)).length
  const badgeCount = uniqueBadges([
    ...featuredBadges,
    ...displayCategories.flatMap((category) => category.icons),
  ]).filter((badge) => badgeMatches(badge, q)).length

  const options: { name: string; count: number }[] = [
    { name: "All", count: badgeCount + groupCount },
  ]

  if (groupCount > 0) options.push({ name: "Groups", count: groupCount })

  for (const category of displayCategories) {
    const count = category.icons.filter((badge) => badgeMatches(badge, q)).length
    if (count > 0) options.push({ name: category.name, count })
  }

  return options
}

export default function ShowcasePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")

  const filteredItems = useMemo(
    () => computeItems(activeCategory, searchQuery),
    [activeCategory, searchQuery]
  )

  const countFor = useCallback(
    (query: string) => computeItems(activeCategory, query).length,
    [activeCategory]
  )

  return (
    <main className="min-w-0 flex-1">
      <section
        id="badge-explorer"
        aria-labelledby="badge-explorer-title"
        className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:px-8 md:py-10"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 id="badge-explorer-title" className="font-heading text-3xl font-semibold tracking-tight md:text-5xl">
                Showcased badges
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {filteredItems.length} visible of {totalIconCount} showcased badges
              </p>
            </div>
            <ShowcaseSubmitDialog />
          </div>
          <CategorySearch
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            countFor={countFor}
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
            <div className="rounded-full bg-muted p-4 text-3xl">🔍</div>
            <div>
              <p className="text-sm font-medium">No matching badges</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing matches that search and category. Clear the filters to see all badges.
              </p>
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
          <div className="flex flex-wrap gap-2">
            {filteredItems.map((item) =>
              item.kind === "badge" ? (
                <BadgeBrick
                  key={`${activeCategory}-${item.badge.badgePath}-${item.badge.title}`}
                  badge={item.badge}
                  weight={item.weight}
                />
              ) : (
                <GroupBrick
                  key={`${activeCategory}-${item.group.badgePath}-${item.group.title}`}
                  item={item.group}
                  weight={item.weight}
                />
              )
            )}
          </div>
        )}
      </section>

      <ChartShowcase />
      <HeaderShowcase />
      <SponsorsShowcase />
    </main>
  )
}

const HEADER_EXAMPLES: { title: string; description: string; src: string; href: string }[] = [
  {
    title: "Surface",
    description: "A clean zinc card — the default, logo plus title and tagline.",
    src: "/header/surface.svg?title=Acme+Toolkit&subtitle=A+delightful+component+library&logo=react",
    href: "/header",
  },
  {
    title: "Glow",
    description: "A soft themed spotlight from the top — here with the blue theme.",
    src: "/header/glow.svg?title=Lumen&subtitle=Illuminate+your+data&logo=react&theme=blue",
    href: "/header",
  },
  {
    title: "Dots",
    description: "A subtle dot grid, the shadcn-docs look.",
    src: "/header/dots.svg?title=shieldcn&subtitle=Headers+for+your+README&logo=shieldcn",
    href: "/header",
  },
  {
    title: "Grid, left aligned",
    description: "A hairline grid with left-aligned content.",
    src: "/header/grid.svg?title=Blueprint&subtitle=Design+tokens+for+engineers&logo=figma&align=left",
    href: "/header",
  },
]

function HeaderShowcase() {
  const hydrated = useHydrated()
  const { adaptUrl } = useBadgeMode()
  return (
    <section
      id="header-showcase"
      aria-labelledby="header-showcase-title"
      className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 md:px-8"
    >
      <div>
        <h2 id="header-showcase-title" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Headers
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Banner images for the top of your README — your logo, a premade
          background, a title, and a tagline.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {HEADER_EXAMPLES.map((h) => (
          <Link
            key={h.src}
            href={h.href}
            className="group rounded-2xl border border-border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
              {hydrated ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={adaptUrl(h.src)} alt={h.title} className="w-full" />
              ) : (
                <div className="aspect-[750/260] w-full" />
              )}
            </div>
            <div className="px-1 pt-3">
              <p className="text-sm font-medium">{h.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{h.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

const SPONSOR_EXAMPLES: { title: string; description: string; src: string; href: string }[] = [
  {
    title: "Sponsors grid",
    description: "Every active public GitHub Sponsor's avatar, names and all.",
    src: "/sponsors/shadcn.svg",
    href: "/docs/sponsors",
  },
  {
    title: "Pinned tiers",
    description: "Pin logins into a larger Special Sponsors row up top.",
    src: "/sponsors/shadcn.svg?special=vercel,clerk",
    href: "/docs/sponsors",
  },
]

function SponsorsShowcase() {
  const hydrated = useHydrated()
  const { adaptUrl } = useBadgeMode()
  return (
    <section
      id="sponsors-showcase"
      aria-labelledby="sponsors-showcase-title"
      className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 md:px-8"
    >
      <div>
        <h2 id="sponsors-showcase-title" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Sponsors
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A grid of your account&apos;s active public GitHub Sponsors — avatars,
          names, and links, with optional pinned tiers.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SPONSOR_EXAMPLES.map((s) => (
          <Link
            key={s.src}
            href={s.href}
            className="group rounded-2xl border border-border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
              {hydrated ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={adaptUrl(s.src)} alt={s.title} className="w-full" />
              ) : (
                <div className="aspect-[2/1] w-full" />
              )}
            </div>
            <div className="px-1 pt-3">
              <p className="text-sm font-medium">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

const CHART_EXAMPLES: { title: string; description: string; src: string; href: string }[] = [
  {
    title: "GitHub stars over time",
    description: "Star history for any repo — like starcharts, shadcn-styled.",
    src: "/chart/github/stars/shadcn-ui/ui.svg?theme=blue",
    href: "/docs/charts",
  },
  {
    title: "GitHub issues over time",
    description: "Cumulative issues opened, sampled from the search API.",
    src: "/chart/github/issues/honojs/hono.svg?theme=rose",
    href: "/docs/charts",
  },
  {
    title: "npm downloads",
    description: "Weekly downloads for the last year from the npm API.",
    src: "/chart/npm/zod.svg?theme=emerald",
    href: "/docs/charts",
  },
  {
    title: "Inline JSON data",
    description: "Bring your own numbers with ?values= — or a remote ?url=.",
    src: "/chart/json.svg?values=120,180,150,210,260,240,300,280,340&title=Latency&label=ms&theme=violet",
    href: "/docs/charts",
  },
]

function ChartShowcase() {
  const hydrated = useHydrated()
  const { adaptUrl } = useBadgeMode()
  return (
    <section
      id="chart-showcase"
      aria-labelledby="chart-showcase-title"
      className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-16 md:px-8"
    >
      <div>
        <h2 id="chart-showcase-title" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Charts
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Shadcn-styled graphs for GitHub stars, issues, npm downloads, and your own JSON data.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CHART_EXAMPLES.map((c) => (
          <Link
            key={c.src}
            href={c.href}
            className="group rounded-2xl border border-border bg-card p-3 transition-colors hover:border-foreground/20"
          >
            <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30">
              {hydrated ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={adaptUrl(c.src)} alt={c.title} className="w-full" />
              ) : (
                <div className="aspect-[2/1] w-full" />
              )}
            </div>
            <div className="px-1 pt-3">
              <p className="text-sm font-medium">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function CategorySearch({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  countFor,
}: {
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeCategory: string
  setActiveCategory: (category: string) => void
  countFor: (query: string) => number
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/") return

      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      const isEditable =
        tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable
      if (isEditable) return

      event.preventDefault()
      inputRef.current?.focus()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const q = searchQuery.trim().toLowerCase()
  const options = buildCategoryOptions(q)
  const currentIndex = Math.min(activeIndex, options.length - 1)

  function scrollOptionIntoView(index: number) {
    listRef.current
      ?.querySelector(`[data-option-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }

  function moveActive(delta: number) {
    if (!open) {
      setOpen(true)
      return
    }
    const next = (currentIndex + delta + options.length) % options.length
    setActiveIndex(next)
    scrollOptionIntoView(next)
  }

  function commitActive() {
    const option = options[currentIndex]
    if (!option) return
    setActiveCategory(option.name)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 shadow-xs transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring"
          onClick={() => {
            setOpen(true)
            inputRef.current?.focus()
          }}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />

          {activeCategory !== "All" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
              {activeCategory}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveCategory("All")
                }}
                className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Clear category filter"
              >
                <X className="size-3" />
              </button>
            </span>
          ) : null}

          <input
            ref={inputRef}
            value={searchQuery}
            onChange={(event) => {
              const value = event.target.value
              setSearchQuery(value)
              setActiveIndex(0)
              const count = countFor(value)
              setOpen(!(value.trim() && count > 0 && count <= AUTO_CLOSE_THRESHOLD))
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false)
              } else if (event.key === "ArrowDown") {
                event.preventDefault()
                moveActive(1)
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                moveActive(-1)
              } else if (event.key === "Enter" && open) {
                event.preventDefault()
                commitActive()
              }
            }}
            placeholder="Search badges or filter by category"
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded={open}
            aria-controls="showcase-category-list"
            aria-activedescendant={open ? `showcase-category-${currentIndex}` : undefined}
            aria-label="Search badges or filter by category"
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setSearchQuery("")
              }}
              className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear badge search"
            >
              <X className="size-4" />
            </button>
          ) : (
            <Kbd className="shrink-0">/</Kbd>
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="end"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="max-h-80 w-(--radix-popover-trigger-width) overflow-y-auto p-1.5"
      >
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {q ? "Categories with matches" : "Filter by category"}
        </p>
        <div ref={listRef} id="showcase-category-list" role="listbox" className="flex flex-col">
          {options.map((option, index) => {
            const isSelected = activeCategory === option.name
            const isActive = index === currentIndex
            return (
              <button
                key={option.name}
                id={`showcase-category-${index}`}
                data-option-index={index}
                type="button"
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => {
                  setActiveCategory(option.name)
                  setOpen(false)
                }}
                className={cn(
                  "flex min-h-10 items-center justify-between gap-3 rounded-md px-2 text-sm transition-colors duration-150 ease-out",
                  isActive ? "bg-muted text-foreground" : "text-foreground",
                  isSelected && !isActive ? "bg-muted/50" : ""
                )}
              >
                <span className="truncate">{option.name}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {option.count}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function getBadgeFlex(weight: number, title: string) {
  if (title.length > 24 || weight % 13 === 0) {
    return "min-w-[15rem] max-w-[26rem] grow-[3]"
  }
  if (weight % 7 === 0 || weight % 11 === 0) {
    return "min-w-[12.5rem] max-w-[22rem] grow-[2]"
  }
  return "min-w-[10rem] max-w-[18rem] grow"
}

function BadgeBrick({ badge, weight }: { badge: ShowcaseBadge; weight: number }) {
  const [modalOpen, setModalOpen] = useState(false)
  const mounted = useHydrated()
  const { adaptUrl } = useBadgeMode()

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group flex h-28 min-w-0 basis-40 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background p-3.5 text-center shadow-xs transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-muted/35 hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 active:scale-[0.99]",
          getBadgeFlex(weight, badge.title)
        )}
        aria-label={`Customize ${badge.title} badge`}
      >
        <span className="flex flex-1 w-full items-center justify-center overflow-hidden">
          {mounted ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={adaptUrl(badge.badgePath)}
              alt={badge.title}
              className="inline-block h-8 max-w-full"
              loading="lazy"
            />
          ) : (
            <span className="h-8" />
          )}
        </span>

        <span className="w-full min-w-0">
          <span className="block truncate text-sm font-medium leading-tight">{badge.title}</span>
          <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">
            {badge.subtitle}
          </span>
        </span>
      </button>

      <BadgeModal
        title={badge.title}
        subtitle={badge.subtitle}
        badgePath={badge.badgePath}
        description={badge.description}
        docsHref={badge.docsHref}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}

function GroupBrick({ item, weight }: { item: GroupShowcaseItem; weight: number }) {
  const [modalOpen, setModalOpen] = useState(false)
  const mounted = useHydrated()
  const { adaptUrl } = useBadgeMode()

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group flex h-28 min-w-0 basis-72 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background p-3.5 text-center shadow-xs transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-muted/35 hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 active:scale-[0.99]",
          weight % 2 === 0 ? "min-w-[18rem] max-w-[34rem] grow-[4]" : "min-w-[16rem] max-w-[30rem] grow-[3]"
        )}
        aria-label={`Customize ${item.title} badge group`}
      >
        <span className="flex flex-1 w-full items-center justify-center overflow-hidden">
          {mounted ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={adaptUrl(item.badgePath)}
              alt={item.title}
              className="inline-block h-8 max-w-full"
              loading="lazy"
            />
          ) : (
            <span className="h-8" />
          )}
        </span>

        <span className="w-full min-w-0">
          <span className="block truncate text-sm font-medium leading-tight">{item.title}</span>
          <span className="mt-1 block truncate text-[11px] text-muted-foreground">badge group</span>
        </span>
      </button>

      <BadgeGroupModal
        title={item.title}
        description={item.description}
        badgePath={item.badgePath}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
