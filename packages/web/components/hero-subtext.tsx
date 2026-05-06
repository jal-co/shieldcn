// shieldcn — components/hero-subtext.tsx
// Hero description with underline-to-background effect on key terms

"use client"

import UnderlineToBackground from "@/components/fancy/text/underline-to-background"

export function HeroSubtext() {
  return (
    <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
      A{" "}
      <UnderlineToBackground
        targetTextColor="var(--background)"
        className="cursor-default text-foreground"
      >
        shields.io
      </UnderlineToBackground>{" "}
      alternative with the visual quality of{" "}
      <UnderlineToBackground
        targetTextColor="var(--background)"
        className="cursor-default text-foreground"
      >
        shadcn/ui
      </UnderlineToBackground>
      . Unlimited combinations.
    </p>
  )
}
