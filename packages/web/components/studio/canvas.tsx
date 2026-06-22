/**
 * shieldcn
 * components/studio/canvas
 *
 * Live preview canvas for the README Studio. Renders the block document the way
 * GitHub would: Markdown via react-markdown (GFM), and header/badge/chart/image
 * blocks as live <img> elements. Each block is a selectable, Figma-style frame.
 *
 * Mode behavior: each image block renders in its OWN mode (default dark) and is
 * NOT affected by the site light/dark toggle — unless `themeAware` is on, in
 * which case the preview follows the site theme to demonstrate the <picture>
 * swap that the exported Markdown will produce.
 */

"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { withBadgeMode } from "@/lib/use-badge-mode"
import { cn } from "@/lib/utils"
import { buildBadgeUrl } from "@/lib/badge-builder-shared"
import { buildHeaderUrl } from "@/lib/header-builder-shared"
import {
  buildChartUrl,
  tableToGfm,
  type Alignment,
  type Block,
} from "@/lib/studio-shared"

const ALIGN_CLASS: Record<Alignment, string> = {
  left: "justify-start text-left",
  center: "justify-center text-center",
  right: "justify-end text-right",
}

/** Ensure a `mode=` query param is present so the badge/chart mode is pinned. */
function ensureMode(url: string, mode: "dark" | "light"): string {
  if (/[?&]mode=/.test(url)) return url
  return url + (url.includes("?") ? "&" : "?") + "mode=" + mode
}

function BlockContent({ block, siteMode, themeAware }: { block: Block; siteMode: "dark" | "light"; themeAware: boolean }) {
  switch (block.type) {
    case "markdown":
      return (
        <div className={cn(
          "prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-m-0 prose-pre:bg-muted prose-pre:text-foreground",
          block.align === "center" && "text-center",
          block.align === "right" && "text-right",
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content || "*Empty text block — edit it in the inspector.*"}</ReactMarkdown>
        </div>
      )

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
              <img key={b.id} src={url} alt={b.alt} className="h-[var(--badge-h,1.75rem)]" />
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

    case "image": {
      if (!block.src) return <p className="text-sm text-muted-foreground italic">Add an image URL or path in the inspector.</p>
      return (
        <div className={cn("flex", ALIGN_CLASS[block.align ?? "left"])}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            style={block.width ? { width: `${block.width}px` } : undefined}
            className="max-w-full rounded-md"
          />
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
  }
}

interface BlockFrameProps {
  block: Block
  selected: boolean
  siteMode: "dark" | "light"
  themeAware: boolean
  onSelect: () => void
}

export const BlockFrame = memo(function BlockFrame({ block, selected, siteMode, themeAware, onSelect }: BlockFrameProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect() } }}
      className={cn(
        "group relative cursor-pointer rounded-lg border-2 border-transparent px-4 py-3 transition-colors",
        "hover:border-border/70 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected && "border-primary bg-primary/[0.03] hover:border-primary",
      )}
    >
      <BlockContent block={block} siteMode={siteMode} themeAware={themeAware} />
    </div>
  )
})
