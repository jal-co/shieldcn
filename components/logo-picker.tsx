"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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

interface LogoOption {
  value: string
  label: string
  group: string
}

const LOGO_OPTIONS: LogoOption[] = [
  // Special
  { value: "", label: "Auto (provider default)", group: "Default" },
  { value: "false", label: "None (hide logo)", group: "Default" },

  // Popular SimpleIcons
  { value: "npm", label: "npm", group: "Simple Icons" },
  { value: "react", label: "React", group: "Simple Icons" },
  { value: "typescript", label: "TypeScript", group: "Simple Icons" },
  { value: "javascript", label: "JavaScript", group: "Simple Icons" },
  { value: "nodedotjs", label: "Node.js", group: "Simple Icons" },
  { value: "github", label: "GitHub", group: "Simple Icons" },
  { value: "discord", label: "Discord", group: "Simple Icons" },
  { value: "python", label: "Python", group: "Simple Icons" },
  { value: "rust", label: "Rust", group: "Simple Icons" },
  { value: "go", label: "Go", group: "Simple Icons" },
  { value: "docker", label: "Docker", group: "Simple Icons" },
  { value: "vercel", label: "Vercel", group: "Simple Icons" },
  { value: "nextdotjs", label: "Next.js", group: "Simple Icons" },
  { value: "tailwindcss", label: "Tailwind CSS", group: "Simple Icons" },
  { value: "vuedotjs", label: "Vue.js", group: "Simple Icons" },
  { value: "svelte", label: "Svelte", group: "Simple Icons" },
  { value: "angular", label: "Angular", group: "Simple Icons" },
  { value: "postgresql", label: "PostgreSQL", group: "Simple Icons" },
  { value: "redis", label: "Redis", group: "Simple Icons" },
  { value: "mongodb", label: "MongoDB", group: "Simple Icons" },
  { value: "kubernetes", label: "Kubernetes", group: "Simple Icons" },
  { value: "railway", label: "Railway", group: "Simple Icons" },
  { value: "swift", label: "Swift", group: "Simple Icons" },
  { value: "kotlin", label: "Kotlin", group: "Simple Icons" },
  { value: "dart", label: "Dart", group: "Simple Icons" },
  { value: "flutter", label: "Flutter", group: "Simple Icons" },
  { value: "deno", label: "Deno", group: "Simple Icons" },
  { value: "bun", label: "Bun", group: "Simple Icons" },
  { value: "linux", label: "Linux", group: "Simple Icons" },
  { value: "apple", label: "Apple", group: "Simple Icons" },
  { value: "windows", label: "Windows", group: "Simple Icons" },

  // Lucide
  { value: "lucide:star", label: "Star", group: "Lucide" },
  { value: "lucide:heart", label: "Heart", group: "Lucide" },
  { value: "lucide:shield", label: "Shield", group: "Lucide" },
  { value: "lucide:zap", label: "Zap", group: "Lucide" },
  { value: "lucide:check", label: "Check", group: "Lucide" },
  { value: "lucide:download", label: "Download", group: "Lucide" },
  { value: "lucide:rocket", label: "Rocket", group: "Lucide" },
  { value: "lucide:code", label: "Code", group: "Lucide" },
  { value: "lucide:book-open", label: "Book Open", group: "Lucide" },
  { value: "lucide:git-branch", label: "Git Branch", group: "Lucide" },
  { value: "lucide:git-pull-request", label: "Git PR", group: "Lucide" },
  { value: "lucide:git-commit-horizontal", label: "Git Commit", group: "Lucide" },
  { value: "lucide:users", label: "Users", group: "Lucide" },
  { value: "lucide:globe", label: "Globe", group: "Lucide" },
  { value: "lucide:lock", label: "Lock", group: "Lucide" },
  { value: "lucide:eye", label: "Eye", group: "Lucide" },
  { value: "lucide:tag", label: "Tag", group: "Lucide" },
  { value: "lucide:package", label: "Package", group: "Lucide" },
  { value: "lucide:terminal", label: "Terminal", group: "Lucide" },
  { value: "lucide:settings", label: "Settings", group: "Lucide" },

  // React Icons
  { value: "ri:FaReact", label: "FA React", group: "React Icons" },
  { value: "ri:FaGithub", label: "FA GitHub", group: "React Icons" },
  { value: "ri:FaNpm", label: "FA npm", group: "React Icons" },
  { value: "ri:FaDocker", label: "FA Docker", group: "React Icons" },
  { value: "ri:FaPython", label: "FA Python", group: "React Icons" },
  { value: "ri:FaRust", label: "FA Rust", group: "React Icons" },
  { value: "ri:MdHome", label: "MD Home", group: "React Icons" },
  { value: "ri:MdSettings", label: "MD Settings", group: "React Icons" },
  { value: "ri:BsLightningFill", label: "BS Lightning", group: "React Icons" },
  { value: "ri:BsGithub", label: "BS GitHub", group: "React Icons" },
  { value: "ri:SiTypescript", label: "SI TypeScript", group: "React Icons" },
  { value: "ri:SiTailwindcss", label: "SI Tailwind", group: "React Icons" },
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
    const opt = LOGO_OPTIONS.find(o => o.value === value)
    if (opt) return opt.label
    return value // custom slug typed by user
  }, [value])

  const groups = React.useMemo(() => {
    const map = new Map<string, LogoOption[]>()
    for (const opt of LOGO_OPTIONS) {
      if (!map.has(opt.group)) map.set(opt.group, [])
      map.get(opt.group)!.push(opt)
    }
    return map
  }, [])

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
          <span className="truncate text-xs">{displayLabel}</span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
            <input
              placeholder="Search or type any slug..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && search) {
                  onChange(search)
                  setOpen(false)
                  setSearch("")
                }
              }}
              className="flex h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList>
            <CommandEmpty>
              <button
                onClick={() => { onChange(search); setOpen(false); setSearch("") }}
                className="w-full px-2 py-1.5 text-xs text-left hover:bg-accent rounded"
              >
                Use &quot;{search}&quot; as custom slug
              </button>
            </CommandEmpty>
            {Array.from(groups.entries()).map(([group, opts]) => (
              <React.Fragment key={group}>
                <CommandGroup heading={group}>
                  {opts.map(opt => (
                    <CommandItem
                      key={opt.value}
                      value={`${opt.label} ${opt.value}`}
                      onSelect={() => {
                        onChange(opt.value)
                        setOpen(false)
                        setSearch("")
                      }}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
