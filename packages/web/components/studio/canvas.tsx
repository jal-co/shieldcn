/**
 * shieldcn
 * components/studio/canvas
 *
 * Live preview canvas for the README Studio. Renders the block document the way
 * GitHub would: Markdown via react-markdown (GFM), and header/badge/chart/image
 * blocks as live <img> elements. Each block is a selectable, Figma-style frame.
 *
 * Direct manipulation on the canvas:
 *   • Drag the grip handle (left gutter) to reorder blocks.
 *   • Double-click a text block to edit its Markdown in place.
 *   • Drag the corner handle on an image to resize it.
 *
 * Mode behavior: each image block renders in its OWN mode (default dark) and is
 * NOT affected by the site light/dark toggle — unless `themeAware` is on, in
 * which case the preview follows the site theme to demonstrate the <picture>
 * swap that the exported Markdown will produce.
 */

"use client"

import { memo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { GripVertical, Copy, Trash2, Plus } from "lucide-react"
import { IconText1 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconText1"
import { IconImages1 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconImages1"
import { IconTag } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconTag"
import { IconBooleanGroupSubstract } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconBooleanGroupSubstract"
import { IconTrending5 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconTrending5"
import { IconLayoutGrid2 } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconLayoutGrid2"
import { IconAddImage } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconAddImage"
import { IconPeople } from "@central-icons-react/round-filled-radius-3-stroke-1.5/IconPeople"
import { IconAlignmentLeft } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentLeft"
import { IconAlignmentCenter } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentCenter"
import { IconAlignmentRight } from "@central-icons-react/round-filled-radius-1-stroke-1.5/IconAlignmentRight"
import { withBadgeMode } from "@/lib/use-badge-mode"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { buildBadgeUrl } from "@/lib/badge-builder-shared"
import { buildHeaderUrl } from "@/lib/header-builder-shared"
import { buildSponsorsUrl } from "@/lib/sponsors-builder-shared"
import {
  buildChartUrl,
  buildGroupUrl,
  tableToGfm,
  BLOCK_LABELS,
  type Alignment,
  type Block,
  type BlockType,
  type ImageBlock,
  type MarkdownBlock,
} from "@/lib/studio-shared"

const BLOCK_TYPES: BlockType[] = ["markdown", "header", "badges", "group", "chart", "table", "image", "sponsors"]

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

// Tiptap is heavy — keep it out of the initial Studio bundle until a text
// block is actually edited.
const RichTextEditor = dynamic(
  () => import("@/components/studio/rich-text-editor").then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="min-h-[2rem] animate-pulse rounded-md bg-muted/40" /> },
)

const ALIGN_CLASS: Record<Alignment, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
}

// Allow the small, safe set of HTML the Studio emits (aligned wrappers, themed
// <picture> badges, linked images) while stripping scripts, event handlers, and
// dangerous URL protocols. Used when rendering Markdown text blocks so pasted /
// imported content renders without XSS.
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "picture", "source"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "align"],
    img: [...(defaultSchema.attributes?.img ?? []), "width", "height", "align"],
    source: ["media", "srcSet", "srcset", "sizes", "type"],
  },
}

const MARKDOWN_REHYPE = [rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]] as const

/** Ensure a `mode=` query param is present so the badge/chart mode is pinned. */
function ensureMode(url: string, mode: "dark" | "light"): string {
  if (/[?&]mode=/.test(url)) return url
  return url + (url.includes("?") ? "&" : "?") + "mode=" + mode
}

// ---------------------------------------------------------------------------
// Inline-editable Markdown text
// ---------------------------------------------------------------------------

function MarkdownContent({ block, onChange }: { block: MarkdownBlock; onChange: (b: Block) => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <RichTextEditor
        value={block.content}
        onCommit={md => { setEditing(false); if (md !== block.content) onChange({ ...block, content: md }) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      title="Double-click to edit"
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-m-0 prose-pre:bg-muted prose-pre:text-foreground",
        block.align === "center" && "text-center",
        block.align === "right" && "text-right",
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={MARKDOWN_REHYPE as never}>{block.content || "*Empty text block — double-click to edit.*"}</ReactMarkdown>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline-resizable image
// ---------------------------------------------------------------------------

function ImageContent({ block, selected, onChange }: { block: ImageBlock; selected: boolean; onChange: (b: Block) => void }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)

  if (!block.src) return <p className="text-sm text-muted-foreground italic">Add an image URL or path in the inspector.</p>

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = imgRef.current?.offsetWidth ?? (Number(block.width) || 0)
    const onMove = (ev: PointerEvent) => {
      setLiveWidth(Math.max(40, Math.round(startW + (ev.clientX - startX))))
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      setLiveWidth(w => {
        if (w !== null && String(w) !== (block.width ?? "")) onChange({ ...block, width: String(w) })
        return null
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const width = liveWidth !== null ? `${liveWidth}px` : block.width ? `${block.width}px` : undefined

  return (
    <div className={cn("flex", ALIGN_CLASS[block.align ?? "left"])}>
      <div className="group/img relative inline-block max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={block.src}
          alt={block.alt}
          style={width ? { width } : undefined}
          className="block max-w-full rounded-md"
        />
        <div
          onPointerDown={startResize}
          onClick={e => e.stopPropagation()}
          role="slider"
          aria-label="Resize image width"
          aria-valuenow={liveWidth ?? (Number(block.width) || 0)}
          tabIndex={-1}
          className={cn(
            "absolute -bottom-1.5 -right-1.5 z-10 size-4 cursor-nwse-resize rounded-sm border-2 border-primary bg-background shadow-sm transition-opacity",
            "hidden md:block",
            selected || liveWidth !== null ? "opacity-100" : "opacity-0 group-hover/img:opacity-100",
          )}
        />
        {liveWidth !== null ? (
          <span className="pointer-events-none absolute -top-7 right-0 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background shadow">
            {liveWidth}px
          </span>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Static block content (markdown + image delegate to the editors above)
// ---------------------------------------------------------------------------

function BlockContent({
  block, siteMode, themeAware, selected, onChange,
}: {
  block: Block
  siteMode: "dark" | "light"
  themeAware: boolean
  selected: boolean
  onChange: (b: Block) => void
}) {
  switch (block.type) {
    case "markdown":
      return <MarkdownContent block={block} onChange={onChange} />

    case "header": {
      const mode = themeAware ? siteMode : block.state.mode
      const url = buildHeaderUrl({ ...block.state, mode }, "")
      return (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={block.alt} className="max-w-full rounded-md" />
        </div>
      )
    }

    case "badges": {
      if (block.badges.length === 0) {
        return <p className="text-sm text-muted-foreground italic">No badges yet — add one in the inspector.</p>
      }
      return (
        <div className={cn("flex flex-wrap items-center gap-2", ALIGN_CLASS[block.align])}>
          {block.badges.map(b => {
            const mode = themeAware ? siteMode : (b.state.mode as "dark" | "light")
            const url = withBadgeMode(buildBadgeUrl({ ...b.state, mode }, ""), mode)
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={b.id} src={url} alt={b.alt} className="max-w-full" />
            )
          })}
        </div>
      )
    }

    case "table": {
      const gfm = tableToGfm(block)
      return (
        <div className={cn(
          "prose prose-sm dark:prose-invert max-w-none prose-table:my-0",
          block.align === "center" && "flex justify-center",
          block.align === "right" && "flex justify-end",
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{gfm}</ReactMarkdown>
        </div>
      )
    }

    case "image":
      return <ImageContent block={block} selected={selected} onChange={onChange} />

    case "group": {
      const mode = themeAware ? siteMode : block.mode
      const url = buildGroupUrl(block, "", mode)
      if (!url) return <p className="text-sm text-muted-foreground italic">Add badge segments in the inspector.</p>
      return (
        <div className={cn("flex", ALIGN_CLASS[block.align])}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={block.alt} className="max-w-full rounded-md" />
        </div>
      )
    }

    case "chart": {
      const mode = themeAware ? siteMode : block.state.mode
      const built = buildChartUrl({ ...block.state, mode }, "")
      if (!built) return <p className="text-sm text-muted-foreground italic">Fill in the chart inputs in the inspector.</p>
      const url = ensureMode(built, mode)
      return (
        <div className={cn("flex", ALIGN_CLASS[block.align])}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={block.alt} className="max-w-full rounded-md" />
        </div>
      )
    }

    case "sponsors": {
      const mode = themeAware ? siteMode : block.state.mode
      if (!block.state.login.trim()) return <p className="text-sm text-muted-foreground italic">Enter a GitHub login in the inspector.</p>
      const url = buildSponsorsUrl({ ...block.state, mode }, "")
      return (
        <div className={cn("flex", ALIGN_CLASS[block.align])}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={block.alt} className="max-w-full rounded-md" />
        </div>
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Block frame — selection, drag-to-reorder, drop target
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Floating per-block toolbar — lightweight quick actions on the selected block
// (alignment + duplicate + delete). Heavier config stays in the right drawer.
// ---------------------------------------------------------------------------

function ToolbarBtn({ label, active, danger, onClick, children }: {
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  )
}

function BlockToolbar({ block, onChange, onDuplicate, onDelete }: {
  block: Block
  onChange: (b: Block) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  // Header is always centered; text blocks align per-paragraph in the editor.
  const canAlign = block.type !== "header" && block.type !== "markdown"
  const current = (block as { align?: Alignment }).align ?? "left"
  const setAlign = (align: Alignment) => onChange({ ...block, align } as Block)
  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute right-1 top-0 z-30 flex -translate-y-[calc(100%+6px)] items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md"
    >
      {canAlign ? (
        <>
          <ToolbarBtn label="Align left" active={current === "left"} onClick={() => setAlign("left")}><IconAlignmentLeft size={14} /></ToolbarBtn>
          <ToolbarBtn label="Align center" active={current === "center"} onClick={() => setAlign("center")}><IconAlignmentCenter size={14} /></ToolbarBtn>
          <ToolbarBtn label="Align right" active={current === "right"} onClick={() => setAlign("right")}><IconAlignmentRight size={14} /></ToolbarBtn>
          <span className="mx-0.5 h-5 w-px bg-border" />
        </>
      ) : null}
      <ToolbarBtn label="Duplicate block" onClick={onDuplicate}><Copy className="size-3.5" /></ToolbarBtn>
      <ToolbarBtn label="Delete block" danger onClick={onDelete}><Trash2 className="size-3.5" /></ToolbarBtn>
    </div>
  )
}

interface BlockFrameProps {
  block: Block
  index: number
  selected: boolean
  siteMode: "dark" | "light"
  themeAware: boolean
  isDragging: boolean
  /** Which edge to draw the insertion line on (null = not a drop target). */
  dropEdge: "top" | "bottom" | null
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  onInsertBelow: (type: BlockType) => void
  onChange: (b: Block) => void
  onDragStart: () => void
  onDragEnter: () => void
  onDrop: () => void
  onDragEnd: () => void
}

export const BlockFrame = memo(function BlockFrame({
  block, index, selected, siteMode, themeAware, isDragging, dropEdge,
  onSelect, onDelete, onDuplicate, onInsertBelow, onChange, onDragStart, onDragEnter, onDrop, onDragEnd,
}: BlockFrameProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onContextMenu={onSelect}
      onKeyDown={e => {
        // Only react to keys aimed at the frame itself — never while typing in
        // the inline editor or an inspector field (those bubble from children).
        if (e.target !== e.currentTarget) return
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect() }
        else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onDelete() }
      }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragEnter() }}
      onDrop={e => { e.preventDefault(); onDrop() }}
      className={cn(
        "group relative cursor-pointer rounded-lg border-2 border-transparent px-4 py-3 transition-colors",
        "hover:border-border/70 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected && "border-primary bg-primary/[0.03] hover:border-primary",
        isDragging && "opacity-40",
      )}
    >
      {/* Floating quick-action toolbar (alignment + duplicate + delete). */}
      {selected ? <BlockToolbar block={block} onChange={onChange} onDuplicate={onDuplicate} onDelete={onDelete} /> : null}
      {/* Insertion line — shows exactly where the dragged block will land. */}
      {dropEdge ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-1 z-20 flex items-center",
            dropEdge === "top" ? "-top-1" : "-bottom-1",
          )}
          aria-hidden
        >
          <span className="size-2 shrink-0 rounded-full bg-primary ring-2 ring-background" />
          <span className="h-0.5 flex-1 rounded-full bg-primary" />
          <span className="size-2 shrink-0 rounded-full bg-primary ring-2 ring-background" />
        </div>
      ) : null}
      {/* Drag handle (left gutter) — only this initiates a reorder drag. */}
      <div
        draggable
        onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(index)); onDragStart() }}
        onDragEnd={onDragEnd}
        onClick={e => e.stopPropagation()}
        title="Drag to reorder"
        aria-label="Drag to reorder block"
        className={cn(
          "absolute -left-7 top-1/2 z-10 hidden -translate-y-1/2 cursor-grab rounded p-1 text-muted-foreground/50 transition-opacity active:cursor-grabbing md:block",
          "opacity-0 group-hover:opacity-100 hover:text-foreground",
          selected && "opacity-100",
        )}
      >
        <GripVertical className="size-4" />
      </div>
      <BlockContent block={block} siteMode={siteMode} themeAware={themeAware} selected={selected} onChange={onChange} />
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Plus className="size-3.5" /> Insert below
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            {BLOCK_TYPES.map(type => {
              const Icon = BLOCK_ICONS[type]
              return (
                <ContextMenuItem key={type} onSelect={() => onInsertBelow(type)}>
                  <Icon className="size-3.5" /> {BLOCK_LABELS[type]}
                </ContextMenuItem>
              )
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onSelect={onDuplicate}>
          <Copy className="size-3.5" /> Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})
