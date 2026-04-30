/**
 * @shieldcn/core
 * src/providers/liberapay
 *
 * Liberapay API client.
 * Supports: receiving (income), patrons, goal.
 *
 * Uses the public Liberapay API (no auth required).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function liberapayFetch(username: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "liberapay",
    cacheKey: `user:${username}`,
    url: `https://liberapay.com/${encodeURIComponent(username)}/public.json`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Receiving (weekly income)
// ---------------------------------------------------------------------------

export async function getLiberapayReceiving(username: string): Promise<BadgeData | null> {
  const data = await liberapayFetch(username)
  if (!data) return null

  const receiving = data.receiving as Record<string, string> | undefined
  if (!receiving) return null

  const amount = receiving.amount
  const currency = receiving.currency

  return {
    label: "receiving",
    value: amount && currency ? `${amount} ${currency}/week` : "hidden",
    link: `https://liberapay.com/${username}`,
  }
}

// ---------------------------------------------------------------------------
// Patrons
// ---------------------------------------------------------------------------

export async function getLiberapayPatrons(username: string): Promise<BadgeData | null> {
  const data = await liberapayFetch(username)
  if (!data) return null

  const npatrons = data.npatrons as number | undefined
  if (npatrons === undefined) return null

  return {
    label: "patrons",
    value: formatCount(npatrons),
    link: `https://liberapay.com/${username}`,
  }
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

export async function getLiberapayGoal(username: string): Promise<BadgeData | null> {
  const data = await liberapayFetch(username)
  if (!data) return null

  const goal = data.goal as Record<string, string> | undefined
  if (!goal) return { label: "goal", value: "not set", link: `https://liberapay.com/${username}` }

  const amount = goal.amount
  const currency = goal.currency

  // Also get receiving to show progress
  const receiving = data.receiving as Record<string, string> | undefined
  const receivingAmount = receiving?.amount ? parseFloat(receiving.amount) : 0
  const goalAmount = amount ? parseFloat(amount) : 0
  const pct = goalAmount > 0 ? Math.round((receivingAmount / goalAmount) * 100) : 0

  return {
    label: "goal",
    value: amount && currency ? `${pct}% of ${amount} ${currency}/week` : "not set",
    link: `https://liberapay.com/${username}`,
  }
}
