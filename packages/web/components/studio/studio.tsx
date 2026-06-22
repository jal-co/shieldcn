/**
 * shieldcn
 * components/studio/studio
 *
 * README Studio — a Figma-style editor for composing a complete README from
 * Markdown text, header banners, badge rows, and charts.
 *
 * Layout (desktop):
 *   ┌───────────── toolbar (title · export · reset) ─────────────┐
 *   │ Layers   │            Canvas (live preview)      │ Inspector│
 *   │ + blocks │   selectable, reorderable blocks      │  props   │
 *   └──────────┴──────────────────────────────────────┴──────────┘
 *
 * State persists to localStorage so a work-in-progress README survives reloads.
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Copy, Check, Download, RotateCcw, Plus, Trash2, Copy as Duplicate,
  ChevronUp, ChevronDown, Type, Image as ImageIcon, Images, Tag, LineChart, Table as TableIcon, Code2, Eye, GripVertical, SunMoon, X,
} from "lucide-react"
import { useSyncExternalStore } from "react"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { BlockFrame } from "@/components/studio/canvas"
import {
  MarkdownInspector,
  HeaderInspector,
  BadgesInspector,
  ChartInspector,
  TableInspector,
  ImageInspector,
  Tip,
} from "@/components/studio/inspectors"
import {
  BLOCK_LABELS,
  documentToMarkdown,
  makeBlock,
  makeStarterDocument,
  newId,
  type Block,
  type BlockType,
  type BadgesBlock,
  type ChartBlock,
  type HeaderBlock,
  type MarkdownBlock,
  type TableBlock,
  type ImageBlock,
} from "@/lib/studio-shared"

const STORAGE_KEY = "shieldcn:studio:v1"
const SETTINGS_KEY = "shieldcn:studio:settings:v1"

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  markdown: Type,
  header: ImageIcon,
  badges: Tag,
  chart: LineChart,
  table: TableIcon,
  image: Images,
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function loadBlocks(): Block[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Block[]
    return null
  } catch {
    return null
  }
}

function blockSummary(block: Block): string {
  switch (block.type) {
    case "markdown": {
      const firstLine = block.content.split("\n").find(l => l.trim()) ?? ""
      return firstLine.replace(/^#+\s*/, "").slice(0, 32) || "Empty text"
    }
    case "header": return block.state.title || "Header"
    case "badges": return `${block.badges.length} badge${block.badges.length === 1 ? "" : "s"}`
    case "chart": return `${block.state.kind} chart`
    case "table": return `${block.rows.length}×${block.headers.length} table`
    case "image": return block.alt || "image"
  }
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

export function Studio() {
  const { mode } = useBadgeMode()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<"design" | "code">("design")
  const [themeAware, setThemeAware] = useState(false)
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  // Hydrate from localStorage or seed a starter document.
  useEffect(() => {
    const saved = loadBlocks()
    const initial = saved ?? makeStarterDocument()
    let savedThemeAware = false
    try { savedThemeAware = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")?.themeAware === true } catch { /* ignore */ }
    // One-time client hydration from localStorage; mismatch avoided by the
    // `hydrated` gate below. (react-compiler set-state-in-effect debt.)
    /* eslint-disable react-hooks/set-state-in-effect */
    setBlocks(initial)
    setSelectedId(initial[0]?.id ?? null)
    setThemeAware(savedThemeAware)
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks)) } catch { /* ignore quota */ }
  }, [blocks, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ themeAware })) } catch { /* ignore quota */ }
  }, [themeAware, hydrated])

  const selected = blocks.find(b => b.id === selectedId) ?? null
  const selectedIndex = blocks.findIndex(b => b.id === selectedId)

  // Selecting a block opens the inspector. On mobile that inspector is a
  // bottom sheet; on desktop the open flag is inert (sheet is md:hidden).
  const selectBlock = useCallback((id: string) => {
    setSelectedId(id)
    setMobileInspectorOpen(true)
  }, [])

  // --- mutations -----------------------------------------------------------

  const updateBlock = useCallback((next: Block) => {
    setBlocks(prev => prev.map(b => (b.id === next.id ? next : b)))
  }, [])

  const addBlock = useCallback((type: BlockType) => {
    const block = makeBlock(type)
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === selectedId)
      if (idx === -1) return [...prev, block]
      const copy = [...prev]
      copy.splice(idx + 1, 0, block)
      return copy
    })
    setSelectedId(block.id)
    setMobileInspectorOpen(true)
  }, [selectedId])

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      const next = prev.filter(b => b.id !== id)
      setSelectedId(next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? null)
      return next
    })
  }, [])

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx === -1) return prev
      const clone = structuredClone(prev[idx])
      clone.id = newId(clone.type)
      const copy = [...prev]
      copy.splice(idx + 1, 0, clone)
      setSelectedId(clone.id)
      return copy
    })
  }, [])

  const moveBlock = useCallback((from: number, to: number) => {
    setBlocks(prev => {
      if (to < 0 || to >= prev.length || from === to) return prev
      const copy = [...prev]
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      return copy
    })
  }, [])

  const reset = useCallback(() => {
    const fresh = makeStarterDocument()
    setBlocks(fresh)
    setSelectedId(fresh[0]?.id ?? null)
  }, [])

  // --- export --------------------------------------------------------------

  const markdown = hydrated ? documentToMarkdown(blocks, baseUrl, themeAware) : ""

  const copyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(documentToMarkdown(blocks, baseUrl, themeAware))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [blocks, baseUrl, themeAware])

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([documentToMarkdown(blocks, baseUrl, themeAware)], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "README.md"
    a.click()
    URL.revokeObjectURL(url)
  }, [blocks, baseUrl, themeAware])

  if (!hydrated) {
    return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading studio…</div>
  }

  const inspectorBody = !selected ? (
    <p className="text-sm text-muted-foreground">Select a block to edit its properties.</p>
  ) : selected.type === "markdown" ? (
    <MarkdownInspector block={selected as MarkdownBlock} onChange={updateBlock} />
  ) : selected.type === "header" ? (
    <HeaderInspector block={selected as HeaderBlock} onChange={updateBlock} />
  ) : selected.type === "badges" ? (
    <BadgesInspector block={selected as BadgesBlock} onChange={updateBlock} />
  ) : selected.type === "table" ? (
    <TableInspector block={selected as TableBlock} onChange={updateBlock} />
  ) : selected.type === "image" ? (
    <ImageInspector block={selected as ImageBlock} onChange={updateBlock} />
  ) : (
    <ChartInspector block={selected as ChartBlock} onChange={updateBlock} />
  )

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold tracking-tight">README Studio</h1>
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium uppercase tracking-wide">Beta</Badge>
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">· {blocks.length} blocks</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden md:flex">
            <Tabs value={view} onValueChange={v => setView(v as "design" | "code")}>
              <TabsList className="h-8">
                <TabsTrigger value="design" className="gap-1.5 text-xs"><Eye className="size-3.5" /> Design</TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5 text-xs"><Code2 className="size-3.5" /> Markdown</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
          <Tip label={themeAware ? "Adaptive light/dark is ON — badges, headers & charts export as <picture> and follow the reader's GitHub theme" : "Make the whole README adaptive — export badges, headers & charts as <picture> that follow the reader's light/dark theme"}>
            <span className="inline-flex">
              <Toggle
                size="sm"
                variant="outline"
                pressed={themeAware}
                onPressedChange={setThemeAware}
                aria-label="Adaptive light and dark mode for the whole README"
                className="h-8 gap-1.5 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90"
              >
                <SunMoon className="size-3.5" /> <span className="hidden lg:inline">Adaptive</span>
              </Toggle>
            </span>
          </Tip>
          <Tip label="Copy README Markdown">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={copyMarkdown}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </Tip>
          <Tip label="Download README.md">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={downloadMarkdown}>
              <Download className="size-3.5" /> <span className="hidden sm:inline">Download</span>
            </Button>
          </Tip>
          <Tip label="Reset to the starter document">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={reset}>
              <RotateCcw className="size-3.5" /> <span className="hidden lg:inline">Reset</span>
            </Button>
          </Tip>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — add + layers */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-muted/20 lg:flex">
          <div className="border-b border-border p-3">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add block</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["markdown", "header", "badges", "chart", "table", "image"] as BlockType[]).map(type => {
                const Icon = BLOCK_ICONS[type]
                return (
                  <Button key={type} variant="outline" size="sm" className="h-auto flex-col gap-1 py-2.5 text-xs" onClick={() => addBlock(type)}>
                    <Icon className="size-4" />
                    {BLOCK_LABELS[type]}
                  </Button>
                )
              })}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <p className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Layers</p>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
              {blocks.map((block, i) => {
                const Icon = BLOCK_ICONS[block.type]
                const active = block.id === selectedId
                return (
                  <li
                    key={block.id}
                    draggable
                    onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = "move" }}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverIndex !== i) setDragOverIndex(i) }}
                    onDragLeave={() => setDragOverIndex(prev => (prev === i ? null : prev))}
                    onDrop={() => { if (dragFrom !== null) moveBlock(dragFrom, i); setDragFrom(null); setDragOverIndex(null) }}
                    onDragEnd={() => { setDragFrom(null); setDragOverIndex(null) }}
                    className={cn(
                      "group flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm transition-colors",
                      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground",
                      dragOverIndex === i && dragFrom !== null && dragFrom !== i && "opacity-60 ring-2 ring-primary ring-inset",
                    )}
                  >
                    <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing" aria-hidden />
                    <button className="flex min-w-0 flex-1 items-center gap-2 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => setSelectedId(block.id)}>
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate text-xs">{blockSummary(block)}</span>
                    </button>
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <Tip label="Move up"><button className="rounded p-1 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30" disabled={i === 0} onClick={() => moveBlock(i, i - 1)} aria-label="Move up"><ChevronUp className="size-3.5" /></button></Tip>
                      <Tip label="Move down"><button className="rounded p-1 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-30" disabled={i === blocks.length - 1} onClick={() => moveBlock(i, i + 1)} aria-label="Move down"><ChevronDown className="size-3.5" /></button></Tip>
                      <Tip label="Duplicate"><button className="rounded p-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => duplicateBlock(block.id)} aria-label="Duplicate"><Duplicate className="size-3" /></button></Tip>
                      <Tip label="Delete"><button className="rounded p-1 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onClick={() => removeBlock(block.id)} aria-label="Delete"><Trash2 className="size-3.5" /></button></Tip>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* Center — canvas / markdown */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/40">
          {/* Mobile add bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2 lg:hidden">
            {(["markdown", "header", "badges", "chart", "table", "image"] as BlockType[]).map(type => {
              const Icon = BLOCK_ICONS[type]
              return (
                <Button key={type} variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={() => addBlock(type)}>
                  <Plus className="size-3" /> <Icon className="size-3.5" /> {BLOCK_LABELS[type]}
                </Button>
              )
            })}
          </div>

          {view === "code" ? (
            <pre className="m-4 overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs leading-relaxed">
              <code className="font-mono">{markdown}</code>
            </pre>
          ) : (
            <div className="mx-auto max-w-3xl p-4 sm:p-6">
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm sm:p-6">
                {blocks.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                      <Type className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Start your README</p>
                      <p className="mx-auto max-w-xs text-sm text-muted-foreground">Add a block to begin. Mix text, headers, badges, charts, tables, and images, then export clean Markdown.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {(["markdown", "header", "badges", "chart", "table", "image"] as BlockType[]).map(type => {
                        const Icon = BLOCK_ICONS[type]
                        return (
                          <Button key={type} variant="outline" size="sm" className="gap-1.5" onClick={() => addBlock(type)}>
                            <Icon className="size-3.5" /> {BLOCK_LABELS[type]}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {blocks.map(block => (
                      <BlockFrame
                        key={block.id}
                        block={block}
                        siteMode={mode}
                        themeAware={themeAware}
                        selected={block.id === selectedId}
                        onSelect={() => selectBlock(block.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right — inspector */}
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-background md:flex">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {selected ? `${BLOCK_LABELS[selected.type]} settings` : "Inspector"}
            </p>
            {selected ? (
              <Tip label="Delete block">
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => removeBlock(selected.id)} aria-label="Delete block">
                  <Trash2 className="size-3.5" />
                </Button>
              </Tip>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {inspectorBody}
          </div>
        </aside>
      </div>

      {/* Mobile inspector — bottom sheet (below md, where the side panel is hidden) */}
      {mobileInspectorOpen && selected ? (
        <div className="md:hidden" role="dialog" aria-modal="true" aria-label={`${BLOCK_LABELS[selected.type]} settings`}>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileInspectorOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-xl border-t border-border bg-background shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{BLOCK_LABELS[selected.type]} settings</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="size-8" disabled={selectedIndex <= 0} onClick={() => moveBlock(selectedIndex, selectedIndex - 1)} aria-label="Move block up"><ChevronUp className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" disabled={selectedIndex >= blocks.length - 1} onClick={() => moveBlock(selectedIndex, selectedIndex + 1)} aria-label="Move block down"><ChevronDown className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => { removeBlock(selected.id); setMobileInspectorOpen(false) }} aria-label="Delete block"><Trash2 className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setMobileInspectorOpen(false)} aria-label="Close"><X className="size-4" /></Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {inspectorBody}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </TooltipProvider>
  )
}
