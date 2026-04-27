"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react"
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
import iconList from "@/lib/badges/icon-list.json"

interface IconEntry {
  slug: string
  title: string
  source: "simple"
}

const allIcons = iconList as IconEntry[]

// Curated popular icons for quick access
const POPULAR_ICONS = [
  { value: "", label: "Auto (provider default)", group: "Default" },
  { value: "false", label: "None (hide logo)", group: "Default" },
  // Popular SimpleIcons
  { value: "npm", label: "npm", group: "Popular" },
  { value: "react", label: "React", group: "Popular" },
  { value: "typescript", label: "TypeScript", group: "Popular" },
  { value: "javascript", label: "JavaScript", group: "Popular" },
  { value: "nodedotjs", label: "Node.js", group: "Popular" },
  { value: "github", label: "GitHub", group: "Popular" },
  { value: "discord", label: "Discord", group: "Popular" },
  { value: "python", label: "Python", group: "Popular" },
  { value: "docker", label: "Docker", group: "Popular" },
  { value: "vercel", label: "Vercel", group: "Popular" },
  { value: "nextdotjs", label: "Next.js", group: "Popular" },
  { value: "tailwindcss", label: "Tailwind CSS", group: "Popular" },
  // Popular React Icons
  { value: "ri:GoStarFill", label: "Star", group: "React Icons" },
  { value: "ri:GoHeartFill", label: "Heart", group: "React Icons" },
  { value: "ri:GoCheckFill", label: "Check", group: "React Icons" },
  { value: "ri:GoDownload", label: "Download", group: "React Icons" },
  { value: "ri:GoRocket", label: "Rocket", group: "React Icons" },
  { value: "ri:GoZap", label: "Zap", group: "React Icons" },
]

interface LogoPickerProps {
  value: string
  onChange: (value: string) => void
}

export function LogoPicker({ value, onChange }: LogoPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const displayLabel = React.useMemo(() => {
    if (!value) return "Auto"
    if (value === "false") return "None"
    const popular = POPULAR_ICONS.find(o => o.value === value)
    if (popular) return popular.label
    // Check full icon list
    const icon = allIcons.find(i => i.slug === value)
    if (icon) return icon.title
    return value
  }, [value])

  // Search results from full icon list
  const searchResults = React.useMemo(() => {
    if (!search.trim() || search.length < 2) return []
    const q = search.toLowerCase()
    return allIcons
      .filter(i => i.title.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q))
      .slice(0, 30)
  }, [search])

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
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
            <input
              placeholder="Search 5,000+ icons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && search.trim()) {
                  handleSelect(search.trim())
                }
              }}
              className="flex h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList className="max-h-[300px]">
            {search.length >= 2 ? (
              // Search results mode
              <>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No icons found for "{search}"
                    <button
                      onClick={() => handleSelect(search.trim())}
                      className="block w-full mt-2 text-foreground hover:underline"
                    >
                      Use "{search}" as custom slug →
                    </button>
                  </div>
                ) : (
                  <CommandGroup heading={`Results (${searchResults.length}${searchResults.length === 30 ? "+" : ""})`}>
                    {searchResults.map(icon => (
                      <CommandItem
                        key={icon.slug}
                        value={icon.slug}
                        onSelect={() => handleSelect(icon.slug)}
                        className="text-xs"
                      >
                        <Check className={cn("mr-1.5 size-3", value === icon.slug ? "opacity-100" : "opacity-0")} />
                        <span>{icon.title}</span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                          {icon.slug}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            ) : (
              // Popular icons mode
              <>
                <div className="px-3 py-2 text-[10px] text-muted-foreground">
                  Type to search 40,000+ icons from SimpleIcons & React Icons
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
                          <span>{opt.label}</span>
                          {opt.value && opt.value !== "false" && (
                            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{opt.value}</span>
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
