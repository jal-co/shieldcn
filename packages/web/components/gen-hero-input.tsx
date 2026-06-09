// shieldcn — components/gen-hero-input.tsx
// Landing page input that navigates to /gen with the URL param

"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useOpenPanel } from "@openpanel/nextjs"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function GenHeroInput() {
  const [value, setValue] = useState("")
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { track } = useOpenPanel()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError("Enter a GitHub username or owner/repo first.")
      inputRef.current?.focus()
      return
    }
    setError("")

    // Smart routing: if it looks like a username (no slash, no URL), go to profile.
    // If it contains a slash (owner/repo) or is a full URL, go to repo generator.
    const isRepo = trimmed.includes("/") || trimmed.startsWith("http")
    track("generator_input", {
      input: trimmed,
      type: isRepo ? "repo" : "profile",
      source: "homepage",
    })
    if (isRepo) {
      router.push(`/gen?url=${encodeURIComponent(trimmed)}`)
    } else {
      router.push(`/gen/profile?user=${encodeURIComponent(trimmed)}`)
    }
  }

  // Dismiss on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") inputRef.current?.blur()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const showHint = !focused && value.length === 0

  return (
    <div className="w-full max-w-lg">
      {/* CTA bubble with tail */}
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "mb-0 flex flex-col items-center transition-all duration-200",
          showHint
            ? "cursor-pointer opacity-100 group"
            : "pointer-events-none -translate-y-1 opacity-0"
        )}
      >
        <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm transition-colors group-hover:border-border group-hover:text-foreground">
          Try it — username for profile, owner/repo for badges
        </span>
        <svg
          className="-mt-px text-border/60 transition-colors group-hover:text-border"
          width="12"
          height="6"
          viewBox="0 0 12 6"
          fill="none"
        >
          <path
            d="M0 0L6 6L12 0"
            fill="var(--background)"
            stroke="currentColor"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="0"
            x2="12"
            y2="0"
            stroke="var(--background)"
            strokeWidth="2"
          />
        </svg>
      </button>

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder="jal-co or jal-co/ui"
          value={value}
          id="homepage-generator-target"
          name="target"
          aria-label="GitHub username or repository"
          aria-describedby={error ? "homepage-generator-error" : undefined}
          aria-invalid={error ? "true" : undefined}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError("")
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
          }}
          className="h-10 flex-1 bg-background dark:bg-background"
        />

        <Button onClick={handleSubmit} className="h-10 shrink-0" size="sm">
          Generate my badges
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
      {error && (
        <p id="homepage-generator-error" className="mt-2 text-sm text-destructive" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}
