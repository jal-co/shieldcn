// shieldcn — components/scroll-cta.tsx
// Bouncing "try it" scroll indicator that scrolls to a target section

"use client"

import { ChevronDown } from "lucide-react"

interface ScrollCtaProps {
  targetId: string
  label?: string
}

export function ScrollCta({ targetId, label = "try it" }: ScrollCtaProps) {
  const handleClick = () => {
    const el = document.getElementById(targetId)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
      <button
        type="button"
        onClick={handleClick}
        className="group flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md px-3 py-1"
      >
        <span className="text-xs font-medium uppercase tracking-widest">
          {label}
        </span>
        <ChevronDown className="size-4 animate-bounce" />
      </button>
    </div>
  )
}
