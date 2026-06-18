/**
 * shieldcn
 * components/searchable-picker
 *
 * Reusable searchable popover picker shell for controls that need search,
 * filter chips, grouped results, selected state, and compact item tags.
 */

"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
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

export interface SearchablePickerFilter {
  value: string
  label: string
}

export interface SearchablePickerItem {
  value: string
  label: string
  commandValue?: string
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

export function SearchablePicker({
  value,
  triggerLabel,
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

  const visibleSections = sections.filter(section => section.items.length > 0)
  const hasItems = visibleSections.length > 0

  const selectItem = React.useCallback((nextValue: string) => {
    onValueChange(nextValue)
    setOpen(false)
  }, [onValueChange, setOpen])

  return (
    <Popover open={resolvedOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={resolvedOpen}
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
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              placeholder={placeholder}
              value={search}
              onChange={event => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
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

          <CommandList className={cn("max-h-[320px]", listClassName)}>
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {loadingLabel}
              </div>
            ) : hasItems ? (
              <>
                {listHeader}
                {visibleSections.map((section, sectionIndex) => (
                  <React.Fragment key={section.heading ?? sectionIndex}>
                    {showSectionSeparators && sectionIndex > 0 && <CommandSeparator />}
                    <CommandGroup heading={section.heading}>
                    {section.items.map(item => (
                        <CommandItem
                          key={`${section.heading ?? sectionIndex}:${item.value || item.commandValue || item.label}`}
                          value={item.commandValue ?? item.value}
                          disabled={item.disabled}
                          onSelect={() => selectItem(item.value)}
                          className="text-xs gap-1.5"
                        >
                          <Check className={cn("size-3 shrink-0", value === item.value ? "opacity-100" : "opacity-0")} />
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
                        </CommandItem>
                      ))}
                      {section.footer}
                    </CommandGroup>
                  </React.Fragment>
                ))}
              </>
            ) : (
              emptyContent ?? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {emptyLabel}
                </div>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
