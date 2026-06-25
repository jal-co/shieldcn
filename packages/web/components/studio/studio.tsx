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

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Plus, Trash2, Copy as Duplicate,
  ChevronUp, ChevronDown, Type, GripVertical, X, MoreHorizontal,
} from "lucide-react"
import { motion, AnimatePresence, useReducedMotion, type Transition } from "motion/react"
import { IconMarkdown } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconMarkdown"
import { IconEyeOpen } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconEyeOpen"
import { IconClipboard2 } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconClipboard2"
import { IconFileDownload } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconFileDownload"
import { IconArrowUndoUp } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconArrowUndoUp"
import { IconArrowRedoDown } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconArrowRedoDown"
import { IconArrowRotateCounterClockwise } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconArrowRotateCounterClockwise"
import { IconCheckmark1 } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconCheckmark1"
import { IconLayoutDashboard } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconLayoutDashboard"
import { IconFileArrowRightIn } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconFileArrowRightIn"
import { IconFileArrowRightOut } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconFileArrowRightOut"
import { IconTrashCan } from "@central-icons-react/round-outlined-radius-3-stroke-1.5/IconTrashCan"
import { IconText1 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconText1"
import { IconImages1 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconImages1"
import { IconTag } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconTag"
import { IconBooleanGroupSubstract } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconBooleanGroupSubstract"
import { IconTrending5 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconTrending5"
import { IconLayoutGrid2 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconLayoutGrid2"
import { IconAddImage } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconAddImage"
import { IconPeople } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconPeople"
import { useSyncExternalStore } from "react"
import { useBadgeMode } from "@/lib/use-badge-mode"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { TooltipProvider } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { BlockFrame } from "@/components/studio/canvas"
import {
  MarkdownInspector,
  HeaderInspector,
  BadgesInspector,
  GroupInspector,
  ChartInspector,
  TableInspector,
  ImageInspector,
  SponsorsInspector,
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
  type GroupBlock,
  type ChartBlock,
  type HeaderBlock,
  type MarkdownBlock,
  type TableBlock,
  type ImageBlock,
  type SponsorsBlock,
} from "@/lib/studio-shared"
import { markdownToDocument } from "@/lib/studio-import"

const STORAGE_KEY = "shieldcn:studio:v1"
const SETTINGS_KEY = "shieldcn:studio:settings:v1"

const BLOCK_ICONS: Record<BlockType, React.ComponentType<{ className?: string }>> = {
  markdown: IconText1,
  header: IconImages1,
  badges: IconTag,
  group: IconBooleanGroupSubstract,
  chart: IconTrending5,
  table: IconLayoutGrid2,
  image: IconAddImage,
  sponsors: IconPeople,
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
    case "group": return `${block.badges.length}-badge group`
    case "chart": return `${block.state.kind} chart`
    case "table": return `${block.rows.length}×${block.headers.length} table`
    case "image": return block.alt || "image"
    case "sponsors": return block.state.login ? `@${block.state.login} sponsors` : "sponsors"
  }
}

// ---------------------------------------------------------------------------
// Toolbar primitives
// ---------------------------------------------------------------------------

/* ────────────────────────────────────────────
 * COPY-CONFIRM MICRO-INTERACTION
 *
 *     0ms   click → clipboard write, state flips to "copied"
 *     0ms   clipboard glyph exits (scale 1 → 0.5, fades out)
 *   spring  checkmark enters (scale 0.5 → 1, slight overshoot)
 *  2000ms   reverts to the clipboard glyph
 * ──────────────────────────────────────────── */
const ICON_SPRING: Transition = { type: "spring", visualDuration: 0.22, bounce: 0.42 }

/* ────────────────────────────────────────────
 * DELETE DROPZONE STORYBOARD
 *
 *     0ms   user starts dragging an existing block
 *   spring  a dashed trash panel springs in from the right edge (x 120% → 0)
 *    hover  dragging over it reddens the panel; the trash icon swells (1 → 1.15)
 *     drop  the dragged block is removed (undoable), panel springs back out
 *   cancel  drop elsewhere → panel springs back out (x 0 → 120%)
 * ──────────────────────────────────────────── */
const PANEL_SPRING: Transition = { type: "spring", visualDuration: 0.34, bounce: 0.26 }
const PANEL_HIDDEN = { x: "100%", opacity: 0 } as const
const PANEL_SHOWN = { x: 0, opacity: 1 } as const

/* ────────────────────────────────────────────
 * BLOCK POOF STORYBOARD
 *   add     new block pops in (scale 0.96 → 1, fade)
 *   delete  block poofs away (scale → 0.6, blur 4px, fade) while the rest of
 *           the list springs up to close the gap (layout)
 * ──────────────────────────────────────────── */
const POOF_TRANSITION: Transition = { type: "spring", visualDuration: 0.26, bounce: 0.15 }
const POOF_GONE = { opacity: 0, scale: 0.6, filter: "blur(4px)" } as const

/** Slides in from the right while a block is dragged; dropping on it deletes. */
function DeleteDropzone({ onDelete, reduceMotion }: { onDelete: () => void; reduceMotion: boolean }) {
  const [over, setOver] = useState(false)
  // Anchored at the inspector's left edge (md:right-80). z-30 sits BELOW the
  // inspector (z-40) so the panel is occluded while tucked behind it, then
  // slides left out from behind the bar. On mobile it slides from the edge.
  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-30 flex items-center md:right-80">
      <motion.div
        initial={reduceMotion ? PANEL_SHOWN : PANEL_HIDDEN}
        animate={PANEL_SHOWN}
        exit={reduceMotion ? { opacity: 0 } : PANEL_HIDDEN}
        transition={PANEL_SPRING}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (!over) setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); onDelete() }}
        className={cn(
          "pointer-events-auto flex h-44 w-32 flex-col items-center justify-center gap-2 rounded-l-2xl border-2 border-r-0 border-dashed text-center shadow-lg backdrop-blur-sm transition-colors",
          over
            ? "border-destructive bg-destructive/20 text-destructive"
            : "border-destructive/40 bg-destructive/10 text-destructive/80",
        )}
      >
        <motion.div animate={{ scale: over ? 1.15 : 1 }} transition={ICON_SPRING}>
          <IconTrashCan size={28} />
        </motion.div>
        <span className="px-2 text-xs font-medium leading-tight">{over ? "Release to delete" : "Drag here to delete"}</span>
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

export function Studio() {
  const reduceMotion = useReducedMotion()
  const { mode } = useBadgeMode()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<"design" | "code">("design")
  // Editable Markdown-tab buffer. null = mirror the live export; a string = the
  // user is editing raw Markdown (parsed back into blocks on commit). The ref
  // mirrors the state so commitCode can dedupe within a single event batch
  // (the textarea's onBlur and the Tabs onValueChange can both fire on a tab
  // switch before React re-renders).
  const [codeDraft, setCodeDraftState] = useState<string | null>(null)
  const codeDraftRef = useRef<string | null>(null)
  const setCodeDraft = useCallback((value: string | null) => {
    codeDraftRef.current = value
    setCodeDraftState(value)
  }, [])
  const [themeAware, setThemeAware] = useState(false)
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false)
  // Reorder drag source (existing block) and palette drag source (new block).
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragNewType, setDragNewType] = useState<BlockType | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragOverEdge, setDragOverEdge] = useState<"top" | "bottom" | null>(null)
  // Undo/redo history. Snapshots are recorded from a blocks-change effect with a
  // skip guard so programmatic undo/redo writes don't re-enter the stack. Rapid
  // edits within 500ms coalesce into a single entry so typing isn't per-keystroke.
  const historyRef = useRef<{ past: Block[][]; future: Block[][] }>({ past: [], future: [] })
  const prevBlocksRef = useRef<Block[]>([])
  const skipHistoryRef = useRef(false)
  const lastPushRef = useRef(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const dragging = dragFrom !== null || dragNewType !== null

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

  // Record history whenever `blocks` changes from a user edit (skip on undo/redo).
  useEffect(() => {
    if (!hydrated) return
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      prevBlocksRef.current = blocks
      return
    }
    const prev = prevBlocksRef.current
    if (prev !== blocks && prev.length > 0) {
      const now = Date.now()
      if (now - lastPushRef.current > 500) {
        historyRef.current.past.push(prev)
        if (historyRef.current.past.length > 200) historyRef.current.past.shift()
        lastPushRef.current = now
      }
      historyRef.current.future = []
      setCanUndo(historyRef.current.past.length > 0)
      setCanRedo(false)
    }
    prevBlocksRef.current = blocks
  }, [hydrated, blocks])

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

  const insertBlockAfter = useCallback((id: string, type: BlockType) => {
    const block = makeBlock(type)
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx === -1) return [...prev, block]
      const copy = [...prev]
      copy.splice(idx + 1, 0, block)
      return copy
    })
    setSelectedId(block.id)
    setMobileInspectorOpen(true)
  }, [])

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

  // Insert a brand-new block at an absolute index (used by palette drag-to-drop).
  const addBlockAt = useCallback((type: BlockType, index: number) => {
    const block = makeBlock(type)
    setBlocks(prev => {
      const copy = [...prev]
      const at = Math.min(Math.max(index, 0), copy.length)
      copy.splice(at, 0, block)
      return copy
    })
    setSelectedId(block.id)
    setMobileInspectorOpen(true)
  }, [])

  // Move an existing block to land *before* `insertIndex` (pre-removal index).
  const moveBlockToIndex = useCallback((from: number, insertIndex: number) => {
    setBlocks(prev => {
      if (from < 0 || from >= prev.length) return prev
      const copy = [...prev]
      const [moved] = copy.splice(from, 1)
      let target = from < insertIndex ? insertIndex - 1 : insertIndex
      target = Math.min(Math.max(target, 0), copy.length)
      copy.splice(target, 0, moved)
      return copy
    })
  }, [])

  // --- drag (reorder + palette drop) ---------------------------------------

  const clearDrag = useCallback(() => {
    setDragFrom(null)
    setDragNewType(null)
    setDragOverIndex(null)
    setDragOverEdge(null)
  }, [])

  const handleCanvasDrop = useCallback((i: number) => {
    const edge = dragOverEdge ?? "bottom"
    const insertIndex = edge === "top" ? i : i + 1
    if (dragNewType) addBlockAt(dragNewType, insertIndex)
    else if (dragFrom !== null) moveBlockToIndex(dragFrom, insertIndex)
    clearDrag()
  }, [dragOverEdge, dragNewType, dragFrom, addBlockAt, moveBlockToIndex, clearDrag])

  const handleAppendDrop = useCallback(() => {
    if (dragNewType) addBlockAt(dragNewType, blocks.length)
    else if (dragFrom !== null) moveBlockToIndex(dragFrom, blocks.length)
    clearDrag()
  }, [dragNewType, dragFrom, blocks.length, addBlockAt, moveBlockToIndex, clearDrag])

  // Drop the dragged block onto the delete zone → remove it (undoable via ⌘Z).
  const deleteDraggedBlock = useCallback(() => {
    const id = dragFrom !== null ? blocks[dragFrom]?.id : undefined
    if (id) removeBlock(id)
    clearDrag()
  }, [dragFrom, blocks, removeBlock, clearDrag])

  // --- undo / redo ---------------------------------------------------------

  const undo = useCallback(() => {
    const h = historyRef.current
    if (h.past.length === 0) return
    const prev = h.past.pop()!
    h.future.push(prevBlocksRef.current)
    skipHistoryRef.current = true
    setBlocks(prev)
    setSelectedId(id => (prev.some(b => b.id === id) ? id : prev[0]?.id ?? null))
    setCanUndo(h.past.length > 0)
    setCanRedo(true)
  }, [])

  const redo = useCallback(() => {
    const h = historyRef.current
    if (h.future.length === 0) return
    const next = h.future.pop()!
    h.past.push(prevBlocksRef.current)
    skipHistoryRef.current = true
    setBlocks(next)
    setSelectedId(id => (next.some(b => b.id === id) ? id : next[0]?.id ?? null))
    setCanUndo(true)
    setCanRedo(h.future.length > 0)
  }, [])

  // Keyboard shortcuts: ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z or ⌘/Ctrl+Y redo. Never
  // hijack the browser's native undo while the user is typing in a field/editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      if (key !== "z" && key !== "y") return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.closest('[contenteditable="true"]'))) return
      if (key === "y" || (key === "z" && e.shiftKey)) { e.preventDefault(); redo() }
      else { e.preventDefault(); undo() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo])

  // Clicking the empty canvas background (not a block) clears the selection.
  const deselect = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelectedId(null)
  }, [])

  const reset = useCallback(() => {
    const fresh = makeStarterDocument()
    historyRef.current = { past: [], future: [] }
    lastPushRef.current = 0
    skipHistoryRef.current = true
    setBlocks(fresh)
    setSelectedId(fresh[0]?.id ?? null)
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  // --- export --------------------------------------------------------------

  const markdown = hydrated ? documentToMarkdown(blocks, baseUrl, themeAware) : ""
  // What the Markdown tab shows / what Copy & Download emit: the in-progress
  // edit when editing, otherwise the live export.
  const shownMarkdown = codeDraft ?? markdown

  // Parse the edited Markdown back into typed blocks. Guarded so it runs at most
  // once per batch, and skips re-parsing (which would regenerate every block ID)
  // when the source is unchanged from the live export.
  const commitCode = useCallback((source: string) => {
    if (codeDraftRef.current === null) return
    setCodeDraft(null)
    if (source === documentToMarkdown(blocks, baseUrl, themeAware)) return
    const next = markdownToDocument(source, baseUrl)
    setBlocks(next)
    setSelectedId(next[0]?.id ?? null)
  }, [blocks, baseUrl, themeAware, setCodeDraft])

  const copyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(shownMarkdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shownMarkdown])

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([shownMarkdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "README.md"
    a.click()
    URL.revokeObjectURL(url)
  }, [shownMarkdown])

  // Import a README.md file → parse to blocks. Flows through setBlocks, so the
  // import lands in the undo history and ⌘Z reverts it (no confirm needed).
  const fileInputRef = useRef<HTMLInputElement>(null)
  const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // reset so the same file can be re-imported
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      const next = markdownToDocument(text, baseUrl)
      if (next.length === 0) return
      setBlocks(next)
      setSelectedId(next[0]?.id ?? null)
    }
    reader.readAsText(file)
  }, [baseUrl])

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
  ) : selected.type === "group" ? (
    <GroupInspector block={selected as GroupBlock} onChange={updateBlock} />
  ) : selected.type === "table" ? (
    <TableInspector block={selected as TableBlock} onChange={updateBlock} />
  ) : selected.type === "image" ? (
    <ImageInspector block={selected as ImageBlock} onChange={updateBlock} />
  ) : selected.type === "sponsors" ? (
    <SponsorsInspector block={selected as SponsorsBlock} onChange={updateBlock} />
  ) : (
    <ChartInspector block={selected as ChartBlock} onChange={updateBlock} />
  )

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex h-full flex-col">
      {/* Toolbar — three intentional zones: identity (left), mode switch
          (absolutely centered on md+), and grouped actions (right). */}
      <div className="relative flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
        {/* Zone 1 — identity + document state */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
            <IconLayoutDashboard size={16} />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight">README Studio</span>
            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-medium uppercase tracking-wide">Beta</Badge>
            <span className="hidden text-xs text-muted-foreground xl:inline">{blocks.length} blocks</span>
          </div>
        </div>

        {/* Zone 2 — mode switch, optically centered, overlay so the side zones
            don't pull it off-center. Pointer-events gated to the control. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 justify-center md:flex">
          <div className="pointer-events-auto">
            <Tabs value={view} onValueChange={v => {
              const next = v as "design" | "code"
              if (next === "code") setCodeDraft(markdown)
              else if (view === "code" && codeDraft !== null) commitCode(codeDraft)
              setView(next)
            }}>
              <TabsList className="h-8">
                <TabsTrigger value="design" className="gap-1.5 text-xs"><IconEyeOpen size={14} /> Design</TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5 text-xs"><IconMarkdown size={14} /> Markdown</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Zone 3 — three legible tiers: Edit · Export · More */}
        <div className="flex items-center gap-2">
          {/* EDIT — undo/redo are universal, so icon-only is legible */}
          <ButtonGroup aria-label="Edit history">
            <Tip label="Undo (⌘Z)">
              <Button variant="outline" size="icon" className="size-8 text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={!canUndo} onClick={undo} aria-label="Undo">
                <IconArrowUndoUp size={15} />
              </Button>
            </Tip>
            <Tip label="Redo (⇧⌘Z)">
              <Button variant="outline" size="icon" className="size-8 text-muted-foreground hover:text-foreground disabled:opacity-40" disabled={!canRedo} onClick={redo} aria-label="Redo">
                <IconArrowRedoDown size={15} />
              </Button>
            </Tip>
          </ButtonGroup>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />

          {/* IMPORT — bring a README.md file in (the one 'in' action) */}
          <Tip label="Open a README.md file into the studio">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <IconFileArrowRightIn size={15} /> <span className="hidden lg:inline">Import</span>
            </Button>
          </Tip>

          {/* EXPORT — primary; menu offers clipboard + file. The button face
              flashes a spring "Copied" after a clipboard copy (the menu closes,
              so the confirmation lives on the trigger). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 shadow-sm" aria-label="Export README">
                <span className="relative grid size-3.5 place-items-center">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {copied ? (
                      <motion.span key="done" initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={reduceMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }} transition={ICON_SPRING} className="absolute inset-0 grid place-items-center">
                        <IconCheckmark1 size={15} />
                      </motion.span>
                    ) : (
                      <motion.span key="exp" initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={reduceMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }} transition={ICON_SPRING} className="absolute inset-0 grid place-items-center">
                        <IconFileArrowRightOut size={15} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span>{copied ? "Copied" : "Export"}</span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={copyMarkdown}>
                <IconClipboard2 size={15} /> Copy to clipboard
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={downloadMarkdown}>
                <IconFileDownload size={15} /> Download .md
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />

          {/* MORE — low-frequency settings & destructive action, labeled in a menu */}
          <DropdownMenu>
            <Tip label="More options">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" aria-label="More options">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
            </Tip>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Export options</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={themeAware}
                onCheckedChange={setThemeAware}
                onSelect={e => e.preventDefault()}
              >
                <span className="flex flex-col">
                  <span>Adaptive light &amp; dark</span>
                  <span className="text-xs text-muted-foreground">Export badges, headers &amp; charts as &lt;picture&gt; that follows the reader&apos;s theme</span>
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={reset}>
                <IconArrowRotateCounterClockwise size={15} /> Reset to the starter document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file picker driving Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            className="hidden"
            onChange={onImportFile}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — add + layers */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-muted/20 lg:flex">
          <div className="border-b border-border p-3">
            <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Add block</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["markdown", "header", "badges", "group", "chart", "table", "image", "sponsors"] as BlockType[]).map(type => {
                const Icon = BLOCK_ICONS[type]
                return (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="h-auto flex-col gap-1 py-2.5 text-xs"
                    onClick={() => addBlock(type)}
                    draggable
                    onDragStart={e => { setDragNewType(type); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", type) }}
                    onDragEnd={clearDrag}
                    title="Click to add, or drag into the canvas"
                  >
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
        {/* Clicking the bare editor surface (the gutters around the README card)
            deselects. The guard inside `deselect` (target === currentTarget)
            keeps bubbled clicks from blocks, buttons, and the card from firing. */}
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/40" onClick={deselect}>
          {/* Mobile add bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border bg-background px-3 py-2 lg:hidden">
            {(["markdown", "header", "badges", "group", "chart", "table", "image", "sponsors"] as BlockType[]).map(type => {
              const Icon = BLOCK_ICONS[type]
              return (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 text-xs"
                  onClick={() => addBlock(type)}
                  draggable
                  onDragStart={e => { setDragNewType(type); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", type) }}
                  onDragEnd={clearDrag}
                >
                  <Plus className="size-3" /> <Icon className="size-3.5" /> {BLOCK_LABELS[type]}
                </Button>
              )
            })}
          </div>

          {view === "code" ? (
            <div className="flex h-full flex-col gap-2 p-4">
              <p className="text-xs text-muted-foreground">Edit or paste GitHub-flavored Markdown. Changes parse back into blocks when you click away or switch to Design.</p>
              <textarea
                value={shownMarkdown}
                spellCheck={false}
                onChange={e => setCodeDraft(e.target.value)}
                onBlur={e => { if (codeDraft !== null) commitCode(e.target.value) }}
                aria-label="README Markdown source"
                className="min-h-[60vh] flex-1 resize-none rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
          ) : (
            <div className="mx-auto max-w-3xl p-4 sm:p-6" onClick={deselect}>
              <div
                className="rounded-xl border border-border bg-background p-4 shadow-sm sm:p-6"
                onClick={deselect}
                onDragOver={e => { if (dragging) e.preventDefault() }}
                onDrop={e => { e.preventDefault(); handleAppendDrop() }}
              >
                {blocks.length === 0 ? (
                  <div
                    className="flex flex-col items-center gap-4 px-6 py-16 text-center"
                    onDragOver={e => { if (dragging) e.preventDefault() }}
                    onDrop={e => { e.preventDefault(); if (dragNewType) addBlockAt(dragNewType, 0); clearDrag() }}
                  >
                    <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                      <Type className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Start your README</p>
                      <p className="mx-auto max-w-xs text-sm text-muted-foreground">Add a block to begin. Mix text, headers, badges, charts, tables, and images, then export clean Markdown.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {(["markdown", "header", "badges", "group", "chart", "table", "image", "sponsors"] as BlockType[]).map(type => {
                        const Icon = BLOCK_ICONS[type]
                        return (
                          <Button
                            key={type}
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => addBlock(type)}
                            draggable
                            onDragStart={e => { setDragNewType(type); e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", type) }}
                            onDragEnd={clearDrag}
                          >
                            <Icon className="size-3.5" /> {BLOCK_LABELS[type]}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1" onClick={deselect}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {blocks.map((block, i) => (
                        <motion.div
                          key={block.id}
                          layout
                          initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={reduceMotion ? { opacity: 0 } : POOF_GONE}
                          transition={POOF_TRANSITION}
                        >
                          <BlockFrame
                            block={block}
                            index={i}
                            siteMode={mode}
                            themeAware={themeAware}
                            selected={block.id === selectedId}
                            isDragging={dragFrom === i}
                            dropEdge={dragOverIndex === i && dragging && dragFrom !== i ? dragOverEdge : null}
                            dropVariant={dragNewType ? "add" : "move"}
                            onSelect={() => selectBlock(block.id)}
                            onDelete={() => removeBlock(block.id)}
                            onDuplicate={() => duplicateBlock(block.id)}
                            onInsertBelow={type => insertBlockAfter(block.id, type)}
                            onChange={updateBlock}
                            onDragStart={() => setDragFrom(i)}
                            onDragEnter={edge => { setDragOverIndex(i); setDragOverEdge(edge) }}
                            onDrop={() => handleCanvasDrop(i)}
                            onDragEnd={clearDrag}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right — inspector */}
        <aside className="relative z-40 hidden w-80 shrink-0 flex-col border-l border-border bg-background md:flex">
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

      {/* Delete dropzone — slides in from the right while reordering an existing
          block; drop on it to remove the block. Hidden when adding a new block. */}
      <AnimatePresence>
        {dragFrom !== null ? (
          <DeleteDropzone onDelete={deleteDraggedBlock} reduceMotion={!!reduceMotion} />
        ) : null}
      </AnimatePresence>

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
