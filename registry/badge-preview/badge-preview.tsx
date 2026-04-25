/**
 * shieldcn
 * BadgePreview
 * by Justin Levine
 * shieldcn.dev
 *
 * Visual badge preview component for documentation pages and app UIs.
 * Renders a live badge image with an optional copyable code snippet below.
 *
 * Props:
 * - src: badge image URL
 * - alt?: accessible alt text (default "badge")
 * - code?: code snippet to display below the badge
 * - label?: optional label above the badge
 * - mode?: background mode ("dark" | "light", default "dark")
 * - className?: additional class names
 */

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgePreviewProps extends React.ComponentProps<"div"> {
  /** Badge image URL. */
  src: string
  /** Accessible alt text. @default "badge" */
  alt?: string
  /** Code snippet to display below the badge. */
  code?: string
  /** Optional label above the badge. */
  label?: string
  /** Background mode. @default "dark" */
  mode?: "dark" | "light"
  /** Additional class names. */
  className?: string
}

function BadgePreview({
  src,
  alt = "badge",
  code,
  label,
  mode = "dark",
  className,
  ...props
}: BadgePreviewProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div
      data-slot="badge-preview"
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        className
      )}
      {...props}
    >
      {label && (
        <div className="border-b border-border px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-center px-6 py-8",
          mode === "dark" ? "bg-zinc-950" : "bg-zinc-100"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="inline-block max-w-full"
          loading="lazy"
          decoding="async"
        />
      </div>

      {code && (
        <div className="relative border-t border-border bg-muted/30">
          <pre className="overflow-x-auto px-4 py-3">
            <code className="text-xs text-muted-foreground">{code}</code>
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "absolute right-2 top-2 rounded-md border border-border px-2 py-1 text-[10px] font-medium transition-colors",
              copied
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  )
}

export { BadgePreview }
export type { BadgePreviewProps }
