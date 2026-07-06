/**
 * shieldcn
 * components/searchable-picker
 *
 * Reusable searchable popover picker shell for controls that need search,
 * filter chips, grouped results, selected state, compact item tags, and
 * optional icon previews.
 *
 * The results list is virtualized with @tanstack/react-virtual so it can
 * render tens of thousands of rows without a hard result cap. Keyboard
 * navigation (Arrow keys + Enter) is handled manually since virtualization
 * is incompatible with cmdk's DOM-based selection.
 */

"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface SearchablePickerFilter {
  value: string
  label: string
}

export interface SearchablePickerItem {
  value: string
  label: string
  commandValue?: string
  /** Optional leading preview node (e.g. an icon glyph or brand logo). */
  icon?: React.ReactNode
  tag?: string
  tagClassName?: string
  meta?: string
  metaClassName?: string
  disabled?: boolean
}

export interface SearchablePickerSection {
  heading?: string
  items: SearchablePickerItem[]
  footer?: React.ReactNode
}

interface SearchablePickerProps {
  value: string
  triggerLabel: string
  /**
   * Accessible name for the trigger button. The trigger's visible text is
   * just the current value (e.g. "Auto"), which doesn't say what the picker
   * is *for* — screen readers need this to announce more than "Auto,
   * combobox". Falls back to `triggerLabel` if omitted.
   */
  ariaLabel?: string
  placeholder: string
  emptyLabel: string
  search: string
  onSearchChange: (value: string) => void
  sections: SearchablePickerSection[]
  onValueChange: (value: string) => void
  activeFilter?: string
  filters?: SearchablePickerFilter[]
  onFilterChange?: (value: string) => void
  allFilterValue?: string
  clearableFilters?: boolean
  className?: string
  triggerClassName?: string
  triggerLabelClassName?: string
  contentClassName?: string
  listClassName?: string
  loading?: boolean
  loadingLabel?: string
  listHeader?: React.ReactNode
  emptyContent?: React.ReactNode
  searchInputRef?: React.Ref<HTMLInputElement>
  onSearchKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showSectionSeparators?: boolean
}

// ---------------------------------------------------------------------------
// Flattened row model — sections/items collapsed into a single virtual list
// ---------------------------------------------------------------------------

type Row =
  | { kind: "header"; node: React.ReactNode }
  | { kind: "heading"; label?: string; separator: boolean }
  | { kind: "item"; item: SearchablePickerItem; sectionKey: string }
  | { kind: "footer"; node: React.ReactNode; key: string }

const ESTIMATED_ROW = 32

export function SearchablePicker({
  value,
  triggerLabel,
  ariaLabel,
  placeholder,
  emptyLabel,
  search,
  onSearchChange,
  sections,
  onValueChange,
  activeFilter = "all",
  filters = [],
  onFilterChange,
  allFilterValue = "all",
  clearableFilters = true,
  className,
  triggerClassName,
  triggerLabelClassName,
  contentClassName,
  listClassName,
  loading = false,
  loadingLabel = "Loading...",
  listHeader,
  emptyContent,
  searchInputRef,
  onSearchKeyDown,
  open,
  onOpenChange,
  showSectionSeparators = false,
}: SearchablePickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const resolvedOpen = open ?? internalOpen

  const setOpen = React.useCallback((nextOpen: boolean) => {
    setInternalOpen(nextOpen)
    onOpenChange?.(nextOpen)
  }, [onOpenChange])

  const visibleSections = React.useMemo(
    () => sections.filter(section => section.items.length > 0),
    [sections],
  )
  const hasItems = visibleSections.length > 0

  const selectItem = React.useCallback((nextValue: string) => {
    onValueChange(nextValue)
    setOpen(false)
  }, [onValueChange, setOpen])

  // Flatten sections into virtual rows and track which rows are selectable.
  const { rows, itemRowIndexes } = React.useMemo(() => {
    const flat: Row[] = []
    const selectable: number[] = []
    if (listHeader) flat.push({ kind: "header", node: listHeader })
    visibleSections.forEach((section, sectionIndex) => {
      if (section.heading || (showSectionSeparators && sectionIndex > 0)) {
        flat.push({
          kind: "heading",
          label: section.heading,
          separator: showSectionSeparators && sectionIndex > 0,
        })
      }
      const sectionKey = section.heading ?? String(sectionIndex)
      for (const item of section.items) {
        if (!item.disabled) selectable.push(flat.length)
        flat.push({ kind: "item", item, sectionKey })
      }
      if (section.footer) {
        flat.push({ kind: "footer", node: section.footer, key: `${sectionKey}-footer` })
      }
    })
    return { rows: flat, itemRowIndexes: selectable }
  }, [visibleSections, listHeader, showSectionSeparators])

  // Active row for keyboard navigation (index into `rows`).
  const [activeRow, setActiveRow] = React.useState<number>(-1)
  const parentRef = React.useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer output is intentionally read fresh each render
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW,
    overscan: 10,
  })

  // Reset active row to the first selectable whenever the result set changes.
  React.useEffect(() => {
    setActiveRow(itemRowIndexes.length > 0 ? itemRowIndexes[0] : -1)
  }, [itemRowIndexes])

  const moveActive = React.useCallback((direction: 1 | -1) => {
    if (itemRowIndexes.length === 0) return
    const pos = itemRowIndexes.indexOf(activeRow)
    const nextPos =
      pos === -1
        ? direction === 1 ? 0 : itemRowIndexes.length - 1
        : (pos + direction + itemRowIndexes.length) % itemRowIndexes.length
    const nextRow = itemRowIndexes[nextPos]
    setActiveRow(nextRow)
    virtualizer.scrollToIndex(nextRow, { align: "auto" })
  }, [activeRow, itemRowIndexes, virtualizer])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveActive(1)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      moveActive(-1)
      return
    }
    if (event.key === "Enter") {
      const row = rows[activeRow]
      if (row && row.kind === "item" && !row.item.disabled) {
        event.preventDefault()
        selectItem(row.item.value)
        return
      }
    }
    onSearchKeyDown?.(event)
  }, [activeRow, moveActive, onSearchKeyDown, rows, selectItem])

  return (
    <Popover open={resolvedOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={resolvedOpen}
          aria-label={ariaLabel ?? triggerLabel}
          className={cn("h-9 w-full justify-between font-normal", triggerClassName, className)}
        >
          <span className={cn("truncate text-xs", triggerLabelClassName)}>
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[min(380px,calc(100vw-2rem))] p-0", contentClassName)}
        align="start"
      >
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              placeholder={placeholder}
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-autocomplete="list"
              className="flex h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
                className="ml-1 rounded-sm p-0.5 opacity-50 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {filters.length > 0 && onFilterChange && (
            <div className="flex flex-wrap gap-1 border-b px-3 py-2">
              {filters.map(filter => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    const nextFilter =
                      clearableFilters && activeFilter === filter.value
                        ? allFilterValue
                        : filter.value
                    onFilterChange(nextFilter)
                  }}
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                    activeFilter === filter.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {loadingLabel}
            </div>
          ) : hasItems ? (
            <div
              ref={parentRef}
              className={cn("max-h-[320px] overflow-y-auto overflow-x-hidden p-1", listClassName)}
              role="listbox"
            >
              <div
                className="relative w-full"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
              >
                {virtualizer.getVirtualItems().map(virtualRow => {
                  const row = rows[virtualRow.index]
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="absolute left-0 top-0 w-full"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      {row.kind === "header" && row.node}

                      {row.kind === "heading" && (
                        <>
                          {row.separator && <div className="mx-1 my-1 h-px bg-border" />}
                          {row.label && (
                            <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
                              {row.label}
                            </div>
                          )}
                        </>
                      )}

                      {row.kind === "footer" && row.node}

                      {row.kind === "item" && (() => {
                        const { item } = row
                        const selected = value === item.value
                        const active = virtualRow.index === activeRow
                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            disabled={item.disabled}
                            onClick={() => selectItem(item.value)}
                            onMouseMove={() => setActiveRow(virtualRow.index)}
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-xs outline-none",
                              active && "bg-accent text-accent-foreground",
                              item.disabled && "pointer-events-none opacity-50",
                            )}
                          >
                            <Check className={cn("size-3 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                            {item.icon && (
                              <span className="flex size-4 shrink-0 items-center justify-center">
                                {item.icon}
                              </span>
                            )}
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.tag && (
                              <span className={cn(
                                "inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[9px] font-medium leading-none",
                                item.tagClassName ?? "bg-muted text-muted-foreground",
                              )}>
                                {item.tag}
                              </span>
                            )}
                            {item.meta && (
                              <span className={cn(
                                "max-w-[100px] truncate text-[10px] font-mono text-muted-foreground",
                                item.metaClassName,
                              )}>
                                {item.meta}
                              </span>
                            )}
                          </button>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            emptyContent ?? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {emptyLabel}
              </div>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
