"use client"

/**
 * shieldcn
 * components/onboarding/onboarding-flow.tsx
 *
 * Tiered onboarding — a stepped checklist shown after sign-up (and re-openable
 * from the dashboard) that adapts to the viewer's plan. Every tier gets an
 * onboarding: Free is guided to save their first README (the account hook),
 * Plus adds migration, AI, and a managed brand. Progress is tracked in
 * localStorage per user so it survives reloads and doesn't nag once done.
 *
 * Pattern adapted from blocks.so onboarding-02 (stepped cards), rebuilt on the
 * shieldcn UI kit with lucide icons and plan-aware steps.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight, BadgeCheck, CircleCheck, FileText, GitPullRequest,
  Palette, Sparkles, type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMe, type Plan } from "@/lib/use-me"

interface Step {
  id: string
  title: string
  description: string
  icon: LucideIcon
  href: string
  actionLabel: string
  /** Lowest plan this step appears for. */
  minPlan: Plan
}

const RANK: Record<Plan, number> = { free: 0, plus: 1 }

const ALL_STEPS: Step[] = [
  {
    id: "save-readme",
    title: "Save your first README",
    description:
      "Open the Studio, compose a README from blocks, and save it to the cloud so it syncs across devices.",
    icon: FileText,
    href: "/studio",
    actionLabel: "Open the Studio",
    minPlan: "free",
  },
  {
    id: "migrate",
    title: "Migrate your badges",
    description:
      "Scan your repos for shields.io badges and open PRs that swap them for shieldcn — in bulk.",
    icon: GitPullRequest,
    href: "/migrate",
    actionLabel: "Migrate a repo",
    minPlan: "plus",
  },
  {
    id: "ai",
    title: "Generate a README with AI",
    description:
      "Point the Studio at a repo or summary and let AI draft a structured README you can edit.",
    icon: Sparkles,
    href: "/studio",
    actionLabel: "Try AI in the Studio",
    minPlan: "plus",
  },
  {
    id: "brand",
    title: "Create your brand",
    description:
      "Import your brand from a domain — logo, colors, and fonts — then reference it from any badge or header.",
    icon: Palette,
    href: "/dashboard/brands/new",
    actionLabel: "Create a brand",
    minPlan: "plus",
  },
]

function storageKey(userId: string | null) {
  return `shieldcn:onboarding:${userId ?? "anon"}`
}

export function OnboardingFlow({ compact = false }: { compact?: boolean }) {
  const { me } = useMe()
  const plan: Plan = me.plan
  const userId = me.userId ?? null

  const steps = useMemo(
    () => ALL_STEPS.filter((s) => RANK[plan] >= RANK[s.minPlan]),
    [plan],
  )

  const [done, setDone] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // One-shot hydration of persisted progress from localStorage on mount /
    // user change — not a render-cascade concern.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(storageKey(userId))
      const ids: string[] = raw ? JSON.parse(raw) : []
      setDone(new Set(ids))
    } catch {
      /* ignore */
    }
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userId])

  const markDone = useCallback(
    (id: string) => {
      setDone((prev) => {
        const next = new Set(prev)
        next.add(id)
        try {
          localStorage.setItem(storageKey(userId), JSON.stringify([...next]))
        } catch {
          /* ignore */
        }
        return next
      })
    },
    [userId],
  )

  const completed = steps.filter((s) => done.has(s.id)).length
  const total = steps.length
  const activeIdx = steps.findIndex((s) => !done.has(s.id))
  const allDone = completed === total

  if (!hydrated) return null

  return (
    <div className={cn("flex flex-col gap-4", compact ? "" : "gap-6")}>
      {/* Progress header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className={cn("font-semibold tracking-tight", compact ? "text-base" : "text-lg")}>
            {allDone ? "You're all set" : "Get started"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {allDone
              ? `Every step complete on your ${plan.toUpperCase()} plan.`
              : `${completed} of ${total} done`}
          </p>
        </div>
        {!compact && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
            <BadgeCheck className="size-3.5" /> {plan.toUpperCase()}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-500"
          style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const isDone = done.has(step.id)
          const isActive = i === activeIdx
          const Icon = step.icon
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                isActive ? "border-foreground/30 bg-muted/40" : "border-border",
                isDone && "opacity-70",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CircleCheck className="size-6 text-emerald-500" />
                ) : (
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      isActive ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className={cn("text-sm font-medium", isDone && "text-muted-foreground line-through")}>
                    {step.title}
                  </span>
                </div>
                {!isDone && <p className="text-xs text-muted-foreground">{step.description}</p>}
                {!isDone && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button asChild size="sm" variant={isActive ? "default" : "outline"}>
                      <Link href={step.href} onClick={() => markDone(step.id)}>
                        {step.actionLabel}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => markDone(step.id)}
                    >
                      Skip
                    </Button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Upsell to Plus when the free checklist is done */}
      {allDone && plan === "free" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Ready for more? Plus adds mass migration, AI, and a managed brand.
          </p>
          <Button asChild size="sm">
            <Link href="/api/checkout?plan=plus">Get Plus</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
