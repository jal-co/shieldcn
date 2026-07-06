/**
 * shieldcn
 * components/builder-v2/icon-picker-v2
 *
 * Prototype: visual grid icon picker. Every icon renders as an actual glyph
 * (via /api/icon) instead of a text row — including Lucide, Tabler, Phosphor,
 * FontAwesome, etc. which the v1 picker could not preview at all.
 *
 * - Popular grid on open, fuzzy search across 30k+ icons
 * - Source filter chips
 * - Virtualized rows (8 tiles per row) for large result sets
 * - Enter selects first result; unknown search can be used as a custom slug
 */

"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Check, Search, X, Sparkles, ChevronDown } from "lucide-react"
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
} from "@shieldcn/core/badges/icon-index"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COLS = 8
const ROW_HEIGHT = 64
const MAX_RESULTS = 800

const POPULAR: string[] = [
  "react", "typescript", "javascript", "nodedotjs", "python", "rust", "go",
  "github", "npm", "docker", "vercel", "nextdotjs", "tailwindcss", "discord",
  "lu:Star", "lu:Check", "lu:Heart", "lu:Zap", "lu:Rocket", "lu:Shield",
  "lu:Download", "lu:Package", "lu:Terminal", "lu:Globe", "lu:Code", "lu:Flame",
  "lu:Sparkles", "lu:Trophy", "lu:Coffee", "lu:Bug", "lu:GitBranch", "lu:Cpu",
]

const SOURCE_DOT: Record<string, string> = {
  custom: "bg-primary",
  simple: "bg-zinc-400",
  lucide: "bg-orange-400",
  fa: "bg-blue-400",
  heroicons: "bg-indigo-400",
  tabler: "bg-cyan-400",
  phosphor: "bg-green-400",
  material: "bg-purple-400",
  bootstrap: "bg-violet-400",
  feather: "bg-amber-400",
}

// ---------------------------------------------------------------------------
// Icon index loader (lazy, singleton)
// ---------------------------------------------------------------------------

let iconIndexPromise: Promise<IconEntry[]> | null = null

function loadIconIndex(): Promise<IconEntry[]> {
  if (!iconIndexPromise) {
    iconIndexPromise = import("@shieldcn/core/badges/icon-list.json").then(mod =>
      parseCompactIcons(mod.default as unknown[]),
    )
  }
  return iconIndexPromise
}

// ---------------------------------------------------------------------------
// Glyph — lazy <img> from /api/icon, dimmed until load
// ---------------------------------------------------------------------------

function Glyph({ slug, size = 22 }: { slug: string; size?: number }) {
  const [loaded, setLoaded] = React.useState(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/icon?slug=${encodeURIComponent(slug)}`}
      alt=""
      loading="lazy"
      width={size}
      height={size}
      onLoad={() => setLoaded(true)}
      className={cn(
        "object-contain transition-opacity duration-200",
        loaded ? "opacity-100" : "opacity-0",
      )}
      style={{ width: size, height: size }}
    />
  )
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

function IconTile({
  icon,
  selected,
  onSelect,
}: {
  icon: IconEntry
  selected: boolean
  onSelect: (slug: string) => void
}) {
  return (
    <button
      type="button"
      title={`${icon.title} — ${icon.slug}`}
      onClick={() => onSelect(icon.slug)}
      className={cn(
        "group relative flex h-14 flex-col items-center justify-center gap-1 rounded-lg transition-colors",
        selected
          ? "bg-primary/10 ring-1 ring-primary"
          : "hover:bg-muted",
      )}
    >
      <Glyph slug={icon.slug} />
      <span className="max-w-full truncate px-1 text-[9px] leading-none text-muted-foreground/70 group-hover:text-muted-foreground">
        {icon.title}
      </span>
      <span
        className={cn(
          "absolute right-1 top-1 size-1.5 rounded-full",
          SOURCE_DOT[icon.source] || "bg-muted-foreground/40",
        )}
      />
      {selected && (
        <Check className="absolute left-1 top-1 size-3 text-primary" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Virtualized grid
// ---------------------------------------------------------------------------

function IconGrid({
  icons,
  value,
  onSelect,
}: {
  icons: IconEntry[]
  value: string
  onSelect: (slug: string) => void
}) {
  const parentRef = React.useRef<HTMLDivElement>(null)
  const rowCount = Math.ceil(icons.length / COLS)

  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer output is intentionally read fresh each render
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  })

  return (
    <div ref={parentRef} className="h-[300px] overflow-y-auto px-2 pb-2">
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map(row => (
          <div
            key={row.key}
            className="absolute left-0 grid w-full grid-cols-8 gap-1"
            style={{ top: row.start, height: ROW_HEIGHT }}
          >
            {icons
              .slice(row.index * COLS, row.index * COLS + COLS)
              .map(icon => (
                <IconTile
                  key={`${icon.source}:${icon.slug}`}
                  icon={icon}
                  selected={icon.slug === value}
                  onSelect={onSelect}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

interface IconPickerV2Props {
  value: string
  onChange: (value: string) => void
  ariaLabel?: string
  /** When a brand overlay is active, offer its hosted marks (logo=brand / brand-alt). */
  hasBrand?: boolean
}

export function IconPickerV2({ value, onChange, ariaLabel = "Badge icon", hasBrand = false }: IconPickerV2Props) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)
  const [source, setSource] = React.useState("all")
  const [allIcons, setAllIcons] = React.useState<IconEntry[] | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      loadIconIndex().then(setAllIcons).catch(() => setAllIcons([]))
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setSearch("")
      setSource("all")
    }
  }

  const searching = deferredSearch.trim().length >= 2

  const results = React.useMemo<IconEntry[]>(() => {
    if (!allIcons) return []
    if (searching) {
      const q = deferredSearch.toLowerCase().trim()
      const filtered = allIcons.filter(i => {
        if (source !== "all" && i.source !== source) return false
        return i.title.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q)
      })
      filtered.sort((a, b) => {
        const rank = (t: string) => (t === q ? 0 : t.startsWith(q) ? 1 : 2)
        const d = rank(a.title.toLowerCase()) - rank(b.title.toLowerCase())
        return d !== 0 ? d : a.title.localeCompare(b.title)
      })
      return filtered.slice(0, MAX_RESULTS)
    }
    if (source !== "all") {
      return allIcons.filter(i => i.source === source).slice(0, 2000)
    }
    // Popular grid
    const bySlug = new Map(allIcons.map(i => [i.slug, i]))
    return POPULAR.map(slug =>
      bySlug.get(slug) ?? {
        slug,
        title: slug.replace(/^lu:/, ""),
        source: slug.startsWith("lu:") ? "lucide" : "simple",
        sourceLabel: "",
      },
    )
  }, [allIcons, deferredSearch, searching, source])

  const handleSelect = (slug: string) => {
    onChange(slug)
    setOpen(false)
  }

  const displayLabel = !value
    ? hasBrand ? "Auto (brand mark)" : "Auto"
    : value === "false"
      ? "None"
      : value === "brand"
        ? "Brand mark"
        : value === "brand-alt"
          ? "Brand alt mark"
          : value.startsWith("data:")
            ? "Custom SVG"
            : value

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors hover:bg-muted/50"
        >
          <span className="flex min-w-0 items-center gap-2">
            {value && value !== "false" && !value.startsWith("data:") && !value.startsWith("brand") && (
              <Glyph slug={value} size={16} />
            )}
            <span className={cn("truncate font-mono text-xs", !value && "text-muted-foreground")}>
              {displayLabel}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(560px,calc(100vw-2rem))] p-0"
      >
        {/* Search */}
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-3.5 shrink-0 text-muted-foreground/60" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && search.trim()) {
                handleSelect(results[0]?.slug ?? search.trim())
              }
            }}
            placeholder="Search 30,000+ icons…"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <X className="size-3.5 text-muted-foreground/60 hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Source chips */}
        <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5 [scrollbar-width:none]">
          {ICON_SOURCES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSource(s.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                source === s.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s.value !== "all" && (
                <span className={cn("size-1.5 rounded-full", SOURCE_DOT[s.value] || "bg-muted-foreground/40")} />
              )}
              {s.label}
            </button>
          ))}
        </div>

        {/* Quick states */}
        <div className="flex items-center gap-1.5 border-b px-3 py-2">
          <QuickChip label="Auto" active={value === ""} onClick={() => handleSelect("")} />
          <QuickChip label="None" active={value === "false"} onClick={() => handleSelect("false")} />
          {hasBrand && (
            <>
              <QuickChip label="Brand mark" active={value === "brand"} onClick={() => handleSelect("brand")} />
              <QuickChip label="Brand alt" active={value === "brand-alt"} onClick={() => handleSelect("brand-alt")} />
            </>
          )}
          {!searching && source === "all" && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Sparkles className="size-3" /> Popular
            </span>
          )}
          {searching && (
            <span className="ml-auto text-[10px] text-muted-foreground/60">
              {results.length === MAX_RESULTS ? `${MAX_RESULTS}+` : results.length} results
            </span>
          )}
        </div>

        {/* Grid */}
        {!allIcons ? (
          <div className="flex h-[300px] items-center justify-center text-xs text-muted-foreground">
            Loading icon index…
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <p>No icons found for &ldquo;{search}&rdquo;</p>
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="text-foreground hover:underline"
            >
              Use &ldquo;{search.trim()}&rdquo; as custom slug →
            </button>
          </div>
        ) : (
          <IconGrid icons={results} value={value} onSelect={handleSelect} />
        )}
      </PopoverContent>
    </Popover>
  )
}

function QuickChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
        active ? "bg-primary/10 text-primary ring-1 ring-primary/40" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  )
}
