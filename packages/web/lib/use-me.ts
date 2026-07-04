"use client"

/**
 * shieldcn
 * lib/use-me.ts
 *
 * Client hook for the current viewer's session + plan, backed by /api/me.
 * Used to gate paid features (Studio cloud save, AI, brands) and show the
 * right upgrade CTA. The result is cached module-side and shared across
 * components so mounting many gated controls issues a single request.
 */

import { useEffect, useState } from "react"
import type { Plan } from "@shieldcn/core/entitlements"

export type { Plan }

export interface Me {
  signedIn: boolean
  /** Signed-in user id, or null when signed out. */
  userId?: string | null
  /**
   * Personal-first owner key: the active team id when one is selected, else the
   * personal user id. This is what ownable resources are keyed by.
   */
  ownerId: string | null
  /** Active team (organization) id, or null for a personal account. */
  orgId: string | null
  plan: Plan
  email?: string | null
  name?: string | null
}

const DEFAULT_ME: Me = { signedIn: false, userId: null, ownerId: null, orgId: null, plan: "free" }

// Module-level cache so every gated control shares one fetch per page load.
let cached: Me | null = null
let inflight: Promise<Me> | null = null
const listeners = new Set<(me: Me) => void>()

async function load(): Promise<Me> {
  if (cached) return cached
  if (inflight) return inflight
  inflight = fetch("/api/me", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : DEFAULT_ME))
    .then((data: Me) => {
      cached = { ...DEFAULT_ME, ...data }
      listeners.forEach((l) => l(cached!))
      return cached
    })
    .catch(() => {
      cached = DEFAULT_ME
      return cached
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Force a refetch (e.g. after checkout returns or an org switch). */
export function refreshMe() {
  cached = null
  return load()
}

export function useMe(): { me: Me; loading: boolean } {
  const [me, setMe] = useState<Me | null>(cached)

  useEffect(() => {
    let active = true
    const onUpdate = (next: Me) => {
      if (active) setMe(next)
    }
    listeners.add(onUpdate)
    // load() resolves to the cached value (or fetches once); the .then runs on a
    // microtask, so state is never set synchronously inside the effect body.
    void load().then(onUpdate)
    return () => {
      active = false
      listeners.delete(onUpdate)
    }
  }, [])

  return { me: me ?? DEFAULT_ME, loading: me === null }
}

/** Plan ranking helper: does `plan` meet or exceed `required`? */
const RANK: Record<Plan, number> = { free: 0, plus: 1 }
export function planMeets(plan: Plan, required: Plan): boolean {
  return RANK[plan] >= RANK[required]
}
