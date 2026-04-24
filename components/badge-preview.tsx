"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface BadgePreviewProps {
  /** Badge URL path (e.g., "/npm/react.svg?variant=secondary") */
  src: string
  /** Alt text for the badge */
  alt?: string
  /** Optional description shown below the badge */
  description?: string
  /** Code to display (defaults to markdown img syntax) */
  code?: string
}

export function BadgePreview({ src, alt, description, code }: BadgePreviewProps) {
  const [copied, setCopied] = useState(false)

  const fullUrl = `https://shieldcn.dev${src}`
  const displayCode = code ?? `![${alt || "badge"}](${fullUrl})`

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden not-prose my-4">
      {/* Preview area */}
      <div className="flex items-center justify-center bg-muted/30 px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || "badge preview"} className="h-8" />
      </div>
      {/* Code area */}
      <div className="relative border-t border-border bg-muted/50">
        {description && (
          <p className="px-4 pt-3 text-xs text-muted-foreground">{description}</p>
        )}
        <div className="flex items-center gap-2 px-4 py-3">
          <code className="flex-1 text-xs font-mono text-muted-foreground break-all select-all">
            {displayCode}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Copy code"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Group of badge previews shown in a grid.
 */
export function BadgePreviewGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 not-prose my-6">
      {children}
    </div>
  )
}

/**
 * Compact badge preview for use inside a grid.
 */
export function BadgePreviewCard({ src, alt, description }: BadgePreviewProps) {
  const [copied, setCopied] = useState(false)

  const fullUrl = `https://shieldcn.dev${src}`
  const displayCode = `![${alt || "badge"}](${fullUrl})`

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-center bg-muted/30 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || "badge preview"} className="h-7" />
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-muted/50 px-3 py-2.5">
        <span className="flex-1 text-[11px] text-muted-foreground truncate">
          {description || alt || src}
        </span>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Copy markdown"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        </button>
      </div>
    </div>
  )
}
