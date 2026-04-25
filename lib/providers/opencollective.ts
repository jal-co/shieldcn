/**
 * shieldcn
 * lib/providers/opencollective
 *
 * Open Collective API client.
 * Supports: backers, sponsors, contributors, balance.
 */

import type { BadgeData } from "@/lib/badges/types"
import { formatCount } from "@/lib/utils"
import { providerFetch } from "@/lib/provider-fetch"

async function ocFetch(slug: string): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "opencollective",
    cacheKey: `collective:${slug}`,
    url: `https://opencollective.com/${slug}.json`,
    ttl: 3600,
  })
}

// ---------------------------------------------------------------------------
// Backers
// ---------------------------------------------------------------------------

export async function getOCBackers(slug: string): Promise<BadgeData | null> {
  const data = await ocFetch(slug)
  if (!data) return null

  const count = (data.backersCount as number) ?? 0
  return {
    label: "backers",
    value: formatCount(count),
    link: `https://opencollective.com/${slug}`,
  }
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------

export async function getOCSponsors(slug: string): Promise<BadgeData | null> {
  const data = await ocFetch(slug)
  if (!data) return null

  const count = (data.sponsorsCount as number) ?? 0
  return {
    label: "sponsors",
    value: formatCount(count),
    link: `https://opencollective.com/${slug}`,
  }
}

// ---------------------------------------------------------------------------
// Contributors (all members)
// ---------------------------------------------------------------------------

export async function getOCContributors(slug: string): Promise<BadgeData | null> {
  const data = await ocFetch(slug)
  if (!data) return null

  const count = (data.contributorsCount as number) ?? 0
  return {
    label: "contributors",
    value: formatCount(count),
    link: `https://opencollective.com/${slug}`,
  }
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export async function getOCBalance(slug: string): Promise<BadgeData | null> {
  const data = await ocFetch(slug)
  if (!data) return null

  const balance = (data.balance as number) ?? 0
  const currency = (data.currency as string) || "USD"

  // Balance is in cents
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(balance / 100)

  return {
    label: "balance",
    value: formatted,
    link: `https://opencollective.com/${slug}`,
  }
}

// ---------------------------------------------------------------------------
// Yearly budget
// ---------------------------------------------------------------------------

export async function getOCBudget(slug: string): Promise<BadgeData | null> {
  const data = await ocFetch(slug)
  if (!data) return null

  const budget = (data.yearlyIncome as number) ?? 0
  const currency = (data.currency as string) || "USD"

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(budget / 100)

  return {
    label: "yearly budget",
    value: formatted,
    link: `https://opencollective.com/${slug}`,
  }
}
