// shieldcn — app/gen/profile/profile-tour.tsx
// Tour overlay + provider for the profile badge generator page

"use client"

import { useEffect, useRef, useState } from "react"
import { useOpenPanel } from "@openpanel/nextjs"
import {
  TourProvider,
  useTour,
  TourAlertDialog,
  type TourStep,
} from "@/components/tour"
import { PROFILE_TOUR_STEP_IDS } from "@/lib/tour-constants"
import type React from "react"
import { CircleHelp } from "lucide-react"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "shieldcn-profile-tour-completed"

const steps: TourStep[] = [
  {
    selectorId: PROFILE_TOUR_STEP_IDS.USER_INPUT,
    position: "bottom",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Enter a GitHub username</p>
        <p className="text-xs text-muted-foreground">
          Type any GitHub username and hit Generate. We&apos;ll scan their
          profile, repos, and social links to create profile README badges.
        </p>
      </div>
    ),
  },
  {
    selectorId: PROFILE_TOUR_STEP_IDS.GLOBAL_DEFAULTS,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Customize the look</p>
        <p className="text-xs text-muted-foreground">
          Change variant, size, theme, and mode. These apply to all badges at
          once.
        </p>
      </div>
    ),
  },
  {
    selectorId: PROFILE_TOUR_STEP_IDS.BADGE_GROUP,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Your profile badges</p>
        <p className="text-xs text-muted-foreground">
          Badges are grouped by type — profile stats, social links, skills, and
          top repos. Click any badge to customize it.
        </p>
      </div>
    ),
  },
  {
    selectorId: PROFILE_TOUR_STEP_IDS.BADGE_POPOVER,
    position: "bottom",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Per-badge overrides</p>
        <p className="text-xs text-muted-foreground">
          Override variant, colors, icon, or label for any specific badge. Hit
          the red button to remove it.
        </p>
      </div>
    ),
  },
  {
    selectorId: PROFILE_TOUR_STEP_IDS.TEMPLATE_OUTPUT,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">README template</p>
        <p className="text-xs text-muted-foreground">
          Toggle between a full profile README template with sections and
          headings, or just the raw badge markdown.
        </p>
      </div>
    ),
  },
  {
    selectorId: PROFILE_TOUR_STEP_IDS.COPY_ACTIONS,
    position: "top",
    content: (
      <div className="space-y-2">
        <p className="text-sm font-semibold">Copy &amp; deploy</p>
        <p className="text-xs text-muted-foreground">
          Copy the README, download it, or save the config. Paste it into your{" "}
          <code className="rounded bg-muted px-1 text-[11px]">
            username/username
          </code>{" "}
          repo to go live.
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
            →
          </kbd>{" "}
          or <span className="font-medium text-primary">Finish</span> to close
          the tour.
        </p>
      </div>
    ),
  },
]

export function ProfileTourProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { track } = useOpenPanel()
  return (
    <TourProvider
      onComplete={() => {
        localStorage.setItem(STORAGE_KEY, "true")
        track("tour_completed", { tour: "profile-generator" })
      }}
      className="rounded-lg"
    >
      {children}
      <ProfileTourTrigger />
    </TourProvider>
  )
}

export function ProfileTourReplayButton() {
  const { setIsTourCompleted, startTour, setSteps } = useTour()
  const hasReset = useRef(false)

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-xs text-muted-foreground"
      onClick={() => {
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

function ProfileTourTrigger() {
  const op = useOpenPanel()
  const {
    setSteps,
    isTourCompleted,
    setIsTourCompleted,
    currentStep,
    isActive,
  } = useTour()
  const [showDialog, setShowDialog] = useState(false)
  const hasFilledInput = useRef(false)

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY) === "true"
    if (completed) {
      setIsTourCompleted(true)
      return
    }

    setSteps(steps)

    const timer = setTimeout(() => {
      setShowDialog(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [setSteps, setIsTourCompleted])

  // When entering the badge popover step, click the first badge to open it
  useEffect(() => {
    if (!isActive || currentStep !== 3) return
    const badge = document.getElementById(
      PROFILE_TOUR_STEP_IDS.BADGE_POPOVER,
    )
    if (badge) {
      badge.click()
    }
  }, [isActive, currentStep])

  // When leaving the badge popover step, close the popover
  useEffect(() => {
    if (!isActive || currentStep !== 4) return

    requestAnimationFrame(() => {
      const badge = document.getElementById(
        PROFILE_TOUR_STEP_IDS.BADGE_POPOVER,
      )
      if (badge) badge.click()
    })

    setTimeout(() => {
      const el = document.getElementById(
        PROFILE_TOUR_STEP_IDS.TEMPLATE_OUTPUT,
      )
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }, 150)
  }, [isActive, currentStep])

  // When tour starts (step 0), fill the input and trigger generate
  useEffect(() => {
    if (!isActive || currentStep !== 0 || hasFilledInput.current) return
    hasFilledInput.current = true

    const input = document.querySelector<HTMLInputElement>("#user-input")
    if (!input) return

    const demo = "jal-co"
    let i = 0
    input.focus()

    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set
    const typeChar = () => {
      if (i < demo.length) {
        i++
        nativeSetter?.call(input, demo.slice(0, i))
        input.dispatchEvent(new Event("input", { bubbles: true }))
        setTimeout(typeChar, 40 + Math.random() * 30)
      } else {
        setTimeout(() => {
          input.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              bubbles: true,
            }),
          )
        }, 300)
      }
    }
    setTimeout(typeChar, 400)
  }, [isActive, currentStep])

  useEffect(() => {
    if (isTourCompleted) {
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }, [isTourCompleted])

  const handleOpenChange = (open: boolean) => {
    setShowDialog(open)
    if (!open) {
      localStorage.setItem(STORAGE_KEY, "true")
      setIsTourCompleted(true)
      op.track("tour_skipped", { tour: "profile-generator" })
    }
  }

  return <TourAlertDialog isOpen={showDialog} setIsOpen={handleOpenChange} />
}
