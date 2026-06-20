"use client"

import { useState, useSyncExternalStore } from "react"
import { Copy, Check } from "lucide-react"
import { useBadgeMode } from "@/lib/use-badge-mode"

/** Hydration flag without a setState-in-effect (lint-clean). */
function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false)
}

interface ChartPreviewProps {
  /** Chart URL path (e.g. "/chart/github/stars/vercel/next.js.svg?area=true") */
  src: string
  /** Alt text for the chart */
  alt?: string
  /** Optional description shown below the chart */
  description?: string
  /** Code to display (defaults to markdown img syntax) */
  code?: string
}

/**
 * Full-width chart preview with a copy button. Unlike BadgePreview this does
 * not force a fixed height — charts have their own aspect ratio.
 */
export function ChartPreview({ src, alt, description, code }: ChartPreviewProps) {
  const [copied, setCopied] = useState(false)
  const mounted = useHydrated()
  const { adaptUrl } = useBadgeMode()

  const adaptedSrc = adaptUrl(src)
  const fullUrl = `https://shieldcn.dev${src}`
  const displayCode = code ?? `![${alt || "chart"}](${fullUrl})`

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden not-prose my-4">
      <div className="flex items-center justify-center bg-muted/30 p-4">
        {mounted ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={adaptedSrc} alt={alt || "chart preview"} className="w-full max-w-2xl rounded-md" />
        ) : (
          <div className="aspect-[2/1] w-full max-w-2xl" />
        )}
      </div>
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
