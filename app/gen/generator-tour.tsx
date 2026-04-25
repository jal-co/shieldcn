// shieldcn — app/gen/generator-tour.tsx
// Tour overlay + provider for the badge generator page

"use client"

import { useEffect, useRef, useState } from "react"
import { useOpenPanel } from "@openpanel/nextjs"
import { TourProvider, useTour, TourAlertDialog, type TourStep } from "@/components/tour"
import { TOUR_STEP_IDS } from "@/lib/tour-constants"

const STORAGE_KEY = "shieldcn-gen-tour-completed"

const steps: TourStep[] = [
  {
    selectorId: TOUR_STEP_IDS.URL_INPUT,
    position: "bottom",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Enter your repo</p>
        <p className="text-xs text-muted-foreground">
          Paste a GitHub URL or type <code className="rounded bg-muted px-1 text-[11px]">owner/repo</code> and
          hit Generate. We&apos;ll detect your stack and create badges automatically.
        </p>
      </div>
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.GLOBAL_DEFAULTS,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Customize the look</p>
        <p className="text-xs text-muted-foreground">
          Change variant, size, theme, and mode to style all your badges at once.
          These settings apply globally.
        </p>
      </div>
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.BADGE_GROUP,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Your badges</p>
        <p className="text-xs text-muted-foreground">
          Badges are grouped by category. Click any badge to customize it individually.
        </p>
      </div>
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.BADGE_POPOVER,
    position: "bottom",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Customize each badge</p>
        <p className="text-xs text-muted-foreground">
          Override the variant, colors, icon, or label for this specific badge.
          Hit the red button to remove it from your set.
        </p>
      </div>
    ),
  },
  {
    selectorId: TOUR_STEP_IDS.COPY_ACTIONS,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Copy &amp; go</p>
        <p className="text-xs text-muted-foreground">
          Copy the markdown, download it as a file, or save the config to reload later.
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">→</kbd> or <span className="font-medium text-primary">Finish</span> to close the tour.
        </p>
      </div>
    ),
  },
]

export function GeneratorTourProvider({ children }: { children: React.ReactNode }) {
  const { track } = useOpenPanel()
  return (
    <TourProvider
      onComplete={() => {
        localStorage.setItem(STORAGE_KEY, "true")
        track("tour_completed", { tour: "generator" })
      }}
      className="rounded-lg"
    >
      {children}
      <GeneratorTourTrigger />
    </TourProvider>
  )
}

import type React from "react"
import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TourReplayButton() {
  const { setIsTourCompleted, startTour, isTourCompleted, setSteps } = useTour()
  const hasReset = useRef(false)

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground"
      onClick={() => {
        // Reset tour state and re-trigger
        localStorage.removeItem(STORAGE_KEY)
        setIsTourCompleted(false)
        if (!hasReset.current) {
          hasReset.current = true
          setSteps(steps)
        }
        setTimeout(() => startTour(), 100)
      }}
    >
      <CircleHelp className="size-3.5" />
      How to use
    </Button>
  )
}

function GeneratorTourTrigger() {
  const op = useOpenPanel()
  const { setSteps, isTourCompleted, setIsTourCompleted, currentStep, isActive } = useTour()
  const [showDialog, setShowDialog] = useState(false)
  const hasFilledInput = useRef(false)

  useEffect(() => {
    // Check localStorage for completion
    const completed = localStorage.getItem(STORAGE_KEY) === "true"
    if (completed) {
      setIsTourCompleted(true)
      return
    }

    setSteps(steps)

    // Delay to let the page render
    const timer = setTimeout(() => {
      setShowDialog(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [setSteps, setIsTourCompleted])

  // When entering the badge popover step, click the first badge to open it
  useEffect(() => {
    if (!isActive || currentStep !== 3) return
    const badge = document.getElementById(TOUR_STEP_IDS.BADGE_POPOVER)
    if (badge) {
      badge.click()
    }
  }, [isActive, currentStep])

  // When leaving the badge popover step, close the popover and scroll down
  useEffect(() => {
    if (!isActive || currentStep !== 4) return

    // Close the popover by clicking its trigger (toggle)
    requestAnimationFrame(() => {
      const badge = document.getElementById(TOUR_STEP_IDS.BADGE_POPOVER)
      if (badge) badge.click()
    })

    // Scroll the copy actions into view
    setTimeout(() => {
      const el = document.getElementById(TOUR_STEP_IDS.COPY_ACTIONS)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 150)
  }, [isActive, currentStep])

  // When tour starts (step 0), fill the input and trigger generate
  useEffect(() => {
    if (!isActive || currentStep !== 0 || hasFilledInput.current) return
    hasFilledInput.current = true

    const input = document.querySelector<HTMLInputElement>("#url-input")
    if (!input) return

    // Type out the demo text character by character
    const demo = "vercel/next.js"
    let i = 0
    input.focus()

    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    const typeChar = () => {
      if (i < demo.length) {
        i++
        nativeSetter?.call(input, demo.slice(0, i))
        input.dispatchEvent(new Event("input", { bubbles: true }))
        setTimeout(typeChar, 40 + Math.random() * 30)
      } else {
        // Press enter after typing
        setTimeout(() => {
          input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
        }, 300)
      }
    }
    setTimeout(typeChar, 400)
  }, [isActive, currentStep])

  // Persist completion to localStorage
  useEffect(() => {
    if (isTourCompleted) {
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }, [isTourCompleted])

  const handleOpenChange = (open: boolean) => {
    setShowDialog(open)
    if (!open) {
      // User skipped — remember it
      localStorage.setItem(STORAGE_KEY, "true")
      setIsTourCompleted(true)
      op.track("tour_skipped", { tour: "generator" })
    }
  }

  return <TourAlertDialog isOpen={showDialog} setIsOpen={handleOpenChange} />
}
