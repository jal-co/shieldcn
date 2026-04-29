// shieldcn — components/github-star-cta.tsx
// CTA popover for the header GitHub button

"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, Star } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const STORAGE_KEY = "shieldcn-star-cta-dismissed"
const VISIT_STORAGE_KEY = "shieldcn-star-cta-home-visits"

export function GitHubStarCta({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const hasDismissed = localStorage.getItem(STORAGE_KEY) === "true"
    setDismissed(hasDismissed)

    if (hasDismissed) return

    const rawVisits = localStorage.getItem(VISIT_STORAGE_KEY)
    const visits = rawVisits ? Number.parseInt(rawVisits, 10) || 0 : 0
    const nextVisits = visits + 1
    localStorage.setItem(VISIT_STORAGE_KEY, String(nextVisits))

    if (nextVisits < 2) return

    openTimerRef.current = window.setTimeout(() => {
      setOpen(true)
    }, 900)

    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (!open) return

    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
    }, 7000)

    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [open])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setDismissed(true)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={["relative inline-flex", className].filter(Boolean).join(" ")}>
          {children}

          {!dismissed && !open && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-1 -top-1 flex size-2.5"
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-400 ring-2 ring-background" />
            </span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="w-72 rounded-lg p-0"
      >
        <div className="relative overflow-visible rounded-lg border bg-background p-4 shadow-lg">
          <div
            aria-hidden="true"
            className="absolute -top-1 right-6 h-3 w-3 rotate-45 border-l border-t bg-background"
          />

          <button
            type="button"
            aria-label="Dismiss leave a star prompt"
            onClick={dismiss}
            className="absolute right-3 top-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>

          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex size-6 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Star className="size-3.5 fill-current" />
            </span>
            <span className="font-medium">Support shieldcn</span>
          </div>

          <div className="space-y-2 pr-6">
            <p className="text-sm font-semibold">Leave a star</p>
            <p className="text-xs text-muted-foreground">
                If shieldcn helped, starring the repo is the easiest way to support it.
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <Sparkles className="size-3" />
              Quick, free, and genuinely helpful.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
