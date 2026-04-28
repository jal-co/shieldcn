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
import { Check, ChevronsUpDown, Search, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  parseCompactIcons,
  ICON_SOURCES,
  type IconEntry,
} from "@/lib/badges/icon-index"

// ---------------------------------------------------------------------------
// Curated popular icons — shown before search
// ---------------------------------------------------------------------------

const POPULAR_ICONS: { value: string; label: string; group: string; source: string }[] = [
  { value: "", label: "Auto (provider default)", group: "Default", source: "" },
  { value: "false", label: "None (hide logo)", group: "Default", source: "" },
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
}

// ---------------------------------------------------------------------------
// Icon index loader (lazy, singleton)
// ---------------------------------------------------------------------------

let iconIndexPromise: Promise<IconEntry[]> | null = null

function loadIconIndex(): Promise<IconEntry[]> {
  if (!iconIndexPromise) {
    iconIndexPromise = import("@/lib/badges/icon-list.json").then(mod => {
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

  // Load icon index on first open
  React.useEffect(() => {
    if (open && !allIcons && !loading) {
      setLoading(true)
      loadIconIndex().then(icons => {
        setAllIcons(icons)
        setLoading(false)
      })
    }
  }, [open, allIcons, loading])

  // Focus input on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setSearch("")
      setSourceFilter("all")
    }
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
  }

  const showingSearch = search.length >= 2
  const showingBrowse = !showingSearch && sourceFilter !== "all"
  const showingPopular = !showingSearch && !showingBrowse
  const resultCount = showingSearch ? searchResults.length : showingBrowse ? browseResults.length : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9"
        >
          <span className="truncate text-xs font-mono">{displayLabel}</span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command shouldFilter={false}>
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              placeholder="Search 30,000+ icons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && search.trim()) {
                  // If there's a result, select the first one
                  if (searchResults.length > 0) {
                    handleSelect(searchResults[0].slug)
                  } else {
                    // Use as custom slug
                    handleSelect(search.trim())
                  }
                }
              }}
              className="flex h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="ml-1 rounded-sm p-0.5 opacity-50 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Source filter tabs */}
          <div className="flex flex-wrap gap-1 border-b px-3 py-2">
            {ICON_SOURCES.map(src => (
              <button
                key={src.value}
                type="button"
                onClick={() => setSourceFilter(sourceFilter === src.value ? "all" : src.value)}
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                  sourceFilter === src.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {src.label}
              </button>
            ))}
          </div>

          <CommandList className="max-h-[320px]">
            {loading && (
              <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading icon index...
              </div>
            )}

            {/* Search results */}
            {showingSearch && !loading && (
              <>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <p>No icons found for &ldquo;{search}&rdquo;</p>
                    <button
                      onClick={() => handleSelect(search.trim())}
                      className="mt-2 text-foreground hover:underline"
                    >
                      Use &ldquo;{search}&rdquo; as custom slug →
                    </button>
                  </div>
                ) : (
                  <CommandGroup heading={`${resultCount} result${resultCount === 1 ? "" : "s"}`}>
                    {searchResults.map(icon => (
                      <IconItem
                        key={icon.slug}
                        icon={icon}
                        isSelected={value === icon.slug}
                        onSelect={handleSelect}
                      />
                    ))}
                    {resultCount >= 50 && (
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                        Showing first 50 results. Refine your search for more.
                      </div>
                    )}
                  </CommandGroup>
                )}
              </>
            )}

            {/* Browse by source */}
            {showingBrowse && !loading && (
              <CommandGroup heading={`${ICON_SOURCES.find(s => s.value === sourceFilter)?.label} (${resultCount}${browseResults.length >= 50 ? "+" : ""})`}>
                {browseResults.map(icon => (
                  <IconItem
                    key={icon.slug}
                    icon={icon}
                    isSelected={value === icon.slug}
                    onSelect={handleSelect}
                  />
                ))}
                {browseResults.length >= 50 && (
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                    Type to search within this source.
                  </div>
                )}
              </CommandGroup>
            )}

            {/* Popular icons (default view) */}
            {showingPopular && !loading && (
              <>
                <div className="px-3 py-2 text-[10px] text-muted-foreground">
                  Search or filter by source to browse 30,000+ icons
                </div>
                <CommandSeparator />
                {Array.from(popularGroups.entries()).map(([group, opts]) => (
                  <React.Fragment key={group}>
                    <CommandGroup heading={group}>
                      {opts.map(opt => (
                        <CommandItem
                          key={opt.value}
                          value={opt.value}
                          onSelect={() => handleSelect(opt.value)}
                          className="text-xs"
                        >
                          <Check className={cn("mr-1.5 size-3", value === opt.value ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{opt.label}</span>
                          {opt.source && (
                            <span className="text-[10px] text-muted-foreground">{opt.source}</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandSeparator />
                  </React.Fragment>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Icon list item with source badge
// ---------------------------------------------------------------------------

function IconItem({
  icon,
  isSelected,
  onSelect,
}: {
  icon: IconEntry
  isSelected: boolean
  onSelect: (slug: string) => void
}) {
  return (
    <CommandItem
      value={icon.slug}
      onSelect={() => onSelect(icon.slug)}
      className="text-xs gap-1.5"
    >
      <Check className={cn("size-3 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
      <span className="flex-1 truncate">{icon.title}</span>
      <span className={cn(
        "inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium leading-none shrink-0",
        SOURCE_COLORS[icon.source] || "bg-muted text-muted-foreground",
      )}>
        {SOURCE_SHORT[icon.source] || icon.source}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
        {icon.slug}
      </span>
    </CommandItem>
  )
}
