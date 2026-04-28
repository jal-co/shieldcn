// shieldcn — components/gen-hero-input.tsx
// Landing page input that navigates to /gen with the URL param

"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CornerDownLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function GenHeroInput() {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return

    // Smart routing: if it looks like a username (no slash, no URL), go to profile
    // If it contains a slash (owner/repo) or is a full URL, go to repo generator
    const isRepo =
      trimmed.includes("/") || trimmed.startsWith("http")
    if (isRepo) {
      router.push(`/gen?url=${encodeURIComponent(trimmed)}`)
    } else {
      router.push(`/gen/profile?user=${encodeURIComponent(trimmed)}`)
    }
  }

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") inputRef.current?.blur()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const showHint = focused || value.length > 0

  return (
    <div className="mx-auto w-full max-w-lg -mt-1">
      {/* CTA bubble with tail */}
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "mx-auto mb-0 flex flex-col items-center transition-all duration-200",
          showHint
            ? "opacity-0 -translate-y-1 pointer-events-none"
            : "opacity-100 cursor-pointer group"
        )}
      >
        <span className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs font-semibold text-zinc-600 shadow-sm group-hover:text-zinc-900 group-hover:border-border transition-colors dark:bg-white dark:text-zinc-600 dark:group-hover:text-zinc-900">
          Try it — username for profile, owner/repo for badges
        </span>
        {/* Tail */}
        <svg
          className="-mt-px text-border/60 group-hover:text-border transition-colors"
          width="12"
          height="6"
          viewBox="0 0 12 6"
          fill="none"
        >
          <path
            d="M0 0L6 6L12 0"
            fill="white"
            stroke="currentColor"
            strokeWidth="1"
          />
          <line x1="0" y1="0" x2="12" y2="0" stroke="white" strokeWidth="2" />
        </svg>
      </button>

      <div className="relative flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="sindresorhus or vercel/next.js"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          className="h-10 flex-1 !bg-background pr-24"
        />

        {/* Inline enter hint */}
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-150",
            value.trim() ? "opacity-100" : "opacity-0"
          )}
        >
          <span>Generate</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            <CornerDownLeft className="size-2.5" />
          </kbd>
        </div>
      </div>
    </div>
  )
}
