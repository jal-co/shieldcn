/**
 * shieldcn
 * lib/onboarding
 *
 * Shared onboarding progress helpers. Completion is tracked per user in
 * localStorage (client-only), plus an explicit "dismissed" flag set when the
 * user finishes or skips the whole flow. Both the OnboardingFlow component and
 * the /welcome gate read from here so they never drift.
 */

import type { Plan } from "@/lib/use-me"

export interface OnboardingStep {
  id: string
  minPlan: Plan
}

/** Rank used to filter steps a plan can see. */
export const PLAN_RANK: Record<Plan, number> = { free: 0, plus: 1 }

/** Step ids + the lowest plan they appear for. Titles/copy live in the flow. */
export const ONBOARDING_STEP_META: OnboardingStep[] = [
  { id: "save-readme", minPlan: "free" },
  { id: "migrate", minPlan: "plus" },
  { id: "ai", minPlan: "plus" },
  { id: "brand", minPlan: "plus" },
]

export function stepsForPlan(plan: Plan): OnboardingStep[] {
  return ONBOARDING_STEP_META.filter((s) => PLAN_RANK[plan] >= PLAN_RANK[s.minPlan])
}

export function progressKey(userId: string | null): string {
  return `shieldcn:onboarding:${userId ?? "anon"}`
}

/** Explicit "user finished/dismissed onboarding" flag (survives step resets). */
export function dismissedKey(userId: string | null): string {
  return `shieldcn:onboarding-dismissed:${userId ?? "anon"}`
}

export function readDone(userId: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(progressKey(userId))
    const ids: string[] = raw ? JSON.parse(raw) : []
    return new Set(ids)
  } catch {
    return new Set()
  }
}

export function writeDone(userId: string | null, done: Set<string>): void {
  try {
    localStorage.setItem(progressKey(userId), JSON.stringify([...done]))
  } catch {
    /* ignore */
  }
}

export function isDismissed(userId: string | null): boolean {
  try {
    return localStorage.getItem(dismissedKey(userId)) === "1"
  } catch {
    return false
  }
}

export function markDismissed(userId: string | null): void {
  try {
    localStorage.setItem(dismissedKey(userId), "1")
  } catch {
    /* ignore */
  }
}

/**
 * True when the user has nothing left to do: either they explicitly dismissed
 * the flow, or every step for their plan is complete.
 */
export function isOnboardingComplete(userId: string | null, plan: Plan): boolean {
  if (isDismissed(userId)) return true
  const steps = stepsForPlan(plan)
  if (steps.length === 0) return true
  const done = readDone(userId)
  return steps.every((s) => done.has(s.id))
}
