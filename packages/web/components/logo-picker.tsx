/**
 * shieldcn
 * components/logo-picker
 *
 * Icon picker with 30,000+ searchable icons from SimpleIcons, Lucide,
 * FontAwesome, Heroicons, Tabler, Phosphor, Material, Bootstrap, and Feather.
 *
 * Features:
 * - Lazy loads the full icon index on first open
 * - Source filter (SimpleIcons, Lucide, etc.)
 * - Fuzzy search across slug and title
 * - Popular icons for quick access
 * - Virtualized list for performance
 */

"use client"

import * as React from "react"
import { SearchablePicker, type SearchablePickerSection } from "@/components/searchable-picker"
import {
  parseCompactIcons,
  ICON_SOURCES,
  type IconEntry,
} from "@shieldcn/core/badges/icon-index"

// ---------------------------------------------------------------------------
// Curated popular icons — shown before search
// ---------------------------------------------------------------------------

const POPULAR_ICONS: { value: string; label: string; group: string; source: string }[] = [
  { value: "", label: "Auto (provider default)", group: "Default", source: "" },
  { value: "false", label: "None (hide logo)", group: "Default", source: "" },
  { value: "shieldcn", label: "shieldcn", group: "Default", source: "shieldcn" },
  // Brands (SimpleIcons)
  { value: "react", label: "React", group: "Brands", source: "Simple Icons" },
  { value: "typescript", label: "TypeScript", group: "Brands", source: "Simple Icons" },
  { value: "javascript", label: "JavaScript", group: "Brands", source: "Simple Icons" },
  { value: "nodedotjs", label: "Node.js", group: "Brands", source: "Simple Icons" },
  { value: "python", label: "Python", group: "Brands", source: "Simple Icons" },
  { value: "github", label: "GitHub", group: "Brands", source: "Simple Icons" },
  { value: "discord", label: "Discord", group: "Brands", source: "Simple Icons" },
  { value: "docker", label: "Docker", group: "Brands", source: "Simple Icons" },
  { value: "vercel", label: "Vercel", group: "Brands", source: "Simple Icons" },
  { value: "nextdotjs", label: "Next.js", group: "Brands", source: "Simple Icons" },
  { value: "tailwindcss", label: "Tailwind CSS", group: "Brands", source: "Simple Icons" },
  { value: "npm", label: "npm", group: "Brands", source: "Simple Icons" },
  { value: "rust", label: "Rust", group: "Brands", source: "Simple Icons" },
  { value: "go", label: "Go", group: "Brands", source: "Simple Icons" },
  // Lucide utility icons
  { value: "lu:Check", label: "Check", group: "Utility", source: "Lucide" },
  { value: "lu:X", label: "X / Close", group: "Utility", source: "Lucide" },
  { value: "lu:ArrowRight", label: "Arrow Right", group: "Utility", source: "Lucide" },
  { value: "lu:Star", label: "Star", group: "Utility", source: "Lucide" },
  { value: "lu:Heart", label: "Heart", group: "Utility", source: "Lucide" },
  { value: "lu:Download", label: "Download", group: "Utility", source: "Lucide" },
  { value: "lu:Rocket", label: "Rocket", group: "Utility", source: "Lucide" },
  { value: "lu:Zap", label: "Zap", group: "Utility", source: "Lucide" },
  { value: "lu:Shield", label: "Shield", group: "Utility", source: "Lucide" },
  { value: "lu:Settings", label: "Settings", group: "Utility", source: "Lucide" },
  { value: "lu:Search", label: "Search", group: "Utility", source: "Lucide" },
  { value: "lu:Eye", label: "Eye", group: "Utility", source: "Lucide" },
  { value: "lu:Globe", label: "Globe", group: "Utility", source: "Lucide" },
  { value: "lu:Code", label: "Code", group: "Utility", source: "Lucide" },
  { value: "lu:Terminal", label: "Terminal", group: "Utility", source: "Lucide" },
  { value: "lu:Package", label: "Package", group: "Utility", source: "Lucide" },
]

// ---------------------------------------------------------------------------
// Source badge colors for visual distinction
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
  simple: "bg-zinc-700 text-zinc-200",
  lucide: "bg-orange-700/80 text-orange-100",
  fa: "bg-blue-700/80 text-blue-100",
  heroicons: "bg-indigo-700/80 text-indigo-100",
  tabler: "bg-cyan-700/80 text-cyan-100",
  phosphor: "bg-green-700/80 text-green-100",
  material: "bg-purple-700/80 text-purple-100",
  bootstrap: "bg-violet-700/80 text-violet-100",
  feather: "bg-amber-700/80 text-amber-100",
  shieldcn: "bg-primary text-primary-foreground",
}

const SOURCE_SHORT: Record<string, string> = {
  simple: "SI",
  lucide: "Lu",
  fa: "FA",
  heroicons: "Hi",
  tabler: "Tb",
  phosphor: "Ph",
  material: "MD",
  bootstrap: "Bs",
  feather: "Fi",
  shieldcn: "\u2014",
}

// ---------------------------------------------------------------------------
// Icon index loader (lazy, singleton)
// ---------------------------------------------------------------------------

let iconIndexPromise: Promise<IconEntry[]> | null = null

function loadIconIndex(): Promise<IconEntry[]> {
  if (!iconIndexPromise) {
    iconIndexPromise = import("@shieldcn/core/badges/icon-list.json").then(mod => {
      return parseCompactIcons(mod.default as unknown[])
    })
  }
  return iconIndexPromise
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LogoPickerProps {
  value: string
  onChange: (value: string) => void
}

export function LogoPicker({ value, onChange }: LogoPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState("all")
  const [allIcons, setAllIcons] = React.useState<IconEntry[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const loadingRef = React.useRef(false)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const ensureIconIndex = React.useCallback(() => {
    if (allIcons || loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    loadIconIndex()
      .then(icons => {
        if (mountedRef.current) setAllIcons(icons)
      })
      .catch(() => {
        if (mountedRef.current) setAllIcons([])
      })
      .finally(() => {
        loadingRef.current = false
        if (mountedRef.current) setLoading(false)
      })
  }, [allIcons])

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      ensureIconIndex()
    } else {
      setSearch("")
      setSourceFilter("all")
    }
  }, [ensureIconIndex])

  // Focus input on open
  React.useEffect(() => {
    if (!open) return
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timeout)
  }, [open])

  // Display label for current value
  const displayLabel = React.useMemo(() => {
    if (!value) return "Auto"
    if (value === "false") return "None"
    const popular = POPULAR_ICONS.find(o => o.value === value)
    if (popular) return popular.label
    // Check if it's a lu: prefix
    if (value.startsWith("lu:")) return value.slice(3)
    if (value.startsWith("ri:")) return value.slice(3)
    // Check full icon list
    if (allIcons) {
      const icon = allIcons.find(i => i.slug === value)
      if (icon) return icon.title
    }
    return value
  }, [value, allIcons])

  // Search results
  const searchResults = React.useMemo(() => {
    if (!allIcons || !search.trim() || search.length < 2) return []
    const q = search.toLowerCase()
    const filtered = allIcons.filter(i => {
      if (sourceFilter !== "all" && i.source !== sourceFilter) return false
      return i.title.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)
    })
    // Sort: exact title match first, then starts-with, then includes
    filtered.sort((a, b) => {
      const at = a.title.toLowerCase()
      const bt = b.title.toLowerCase()
      const aExact = at === q ? 0 : at.startsWith(q) ? 1 : 2
      const bExact = bt === q ? 0 : bt.startsWith(q) ? 1 : 2
      if (aExact !== bExact) return aExact - bExact
      return at.localeCompare(bt)
    })
    return filtered.slice(0, 50)
  }, [allIcons, search, sourceFilter])

  // Browse results (no search, just filtered by source)
  const browseResults = React.useMemo(() => {
    if (!allIcons || search.length >= 2 || sourceFilter === "all") return []
    return allIcons
      .filter(i => i.source === sourceFilter)
      .slice(0, 50)
  }, [allIcons, search, sourceFilter])

  // Group popular icons
  const popularGroups = React.useMemo(() => {
    const map = new Map<string, typeof POPULAR_ICONS>()
    for (const opt of POPULAR_ICONS) {
      if (!map.has(opt.group)) map.set(opt.group, [])
      map.get(opt.group)!.push(opt)
    }
    return map
  }, [])

  const handleSelect = (slug: string) => {
    onChange(slug)
    setOpen(false)
    setSearch("")
    setSourceFilter("all")
  }

  const showingSearch = search.length >= 2
  const showingBrowse = !showingSearch && sourceFilter !== "all"
  const showingPopular = !showingSearch && !showingBrowse
  const resultCount = showingSearch ? searchResults.length : showingBrowse ? browseResults.length : 0

  const sections = React.useMemo<SearchablePickerSection[]>(() => {
    if (showingSearch) {
      if (searchResults.length === 0) return []
      return [{
        heading: `${resultCount} result${resultCount === 1 ? "" : "s"}`,
        items: searchResults.map(icon => ({
          value: icon.slug,
          label: icon.title,
          tag: SOURCE_SHORT[icon.source] || icon.source,
          tagClassName: SOURCE_COLORS[icon.source] || "bg-muted text-muted-foreground",
          meta: icon.slug,
        })),
        footer: resultCount >= 50 && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
            Showing first 50 results. Refine your search for more.
          </div>
        ),
      }]
    }

    if (showingBrowse) {
      return [{
        heading: `${ICON_SOURCES.find(s => s.value === sourceFilter)?.label} (${resultCount}${browseResults.length >= 50 ? "+" : ""})`,
        items: browseResults.map(icon => ({
          value: icon.slug,
          label: icon.title,
          tag: SOURCE_SHORT[icon.source] || icon.source,
          tagClassName: SOURCE_COLORS[icon.source] || "bg-muted text-muted-foreground",
          meta: icon.slug,
        })),
        footer: browseResults.length >= 50 && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
            Type to search within this source.
          </div>
        ),
      }]
    }

    if (showingPopular) {
      return Array.from(popularGroups.entries()).map(([group, opts]) => ({
        heading: group,
        items: opts.map(opt => ({
          value: opt.value,
          commandValue: opt.value || opt.label,
          label: opt.label,
          tag: opt.source || undefined,
          tagClassName: SOURCE_COLORS[opt.source] || "bg-muted text-muted-foreground",
        })),
      }))
    }

    return []
  }, [
    browseResults,
    popularGroups,
    resultCount,
    searchResults,
    showingBrowse,
    showingPopular,
    showingSearch,
    sourceFilter,
  ])

  const emptyContent = showingSearch && !loading ? (
    <div className="p-4 text-center text-xs text-muted-foreground">
      <p>No icons found for &ldquo;{search}&rdquo;</p>
      <button
        type="button"
        onClick={() => handleSelect(search.trim())}
        className="mt-2 text-foreground hover:underline"
      >
        Use &ldquo;{search}&rdquo; as custom slug →
      </button>
    </div>
  ) : undefined

  return (
    <SearchablePicker
      value={value}
      triggerLabel={displayLabel}
      triggerLabelClassName="font-mono"
      placeholder="Search 30,000+ icons..."
      emptyLabel="No icons found."
      emptyContent={emptyContent}
      search={search}
      onSearchChange={setSearch}
      searchInputRef={inputRef}
      onSearchKeyDown={event => {
        if (event.key === "Enter" && search.trim()) {
          if (searchResults.length > 0) {
            handleSelect(searchResults[0].slug)
          } else {
            handleSelect(search.trim())
          }
        }
      }}
      filters={[...ICON_SOURCES]}
      activeFilter={sourceFilter}
      onFilterChange={setSourceFilter}
      sections={sections}
      onValueChange={handleSelect}
      open={open}
      onOpenChange={handleOpenChange}
      loading={loading}
      loadingLabel="Loading icon index..."
      listHeader={showingPopular && !loading ? (
        <div className="border-b px-3 py-2 text-[10px] text-muted-foreground">
          Search or filter by source to browse 30,000+ icons
        </div>
      ) : undefined}
      showSectionSeparators={showingPopular}
    />
  )
}
