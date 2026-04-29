/**
 * shieldcn
 * lib/providers/tokscale
 *
 * Tokscale API client — AI token usage leaderboard.
 * Supports: tokens, cost, rank, stats, active-days, submissions.
 * API: https://tokscale.ai/api/
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TokscaleUserProfile {
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string
    rank: number
  }
  stats: {
    totalTokens: number
    totalCost: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    reasoningTokens: number
    submissionCount: number
    activeDays: number
  }
  clients: string[]
  models: string[]
}

interface TokscaleLeaderboard {
  stats: {
    totalTokens: number
    totalCost: number
    totalSubmissions: number
    uniqueUsers: number
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchUserProfile(username: string): Promise<TokscaleUserProfile | null> {
  return providerFetch<TokscaleUserProfile>({
    provider: "tokscale",
    cacheKey: `user:${username}`,
    url: `https://tokscale.ai/api/users/${encodeURIComponent(username)}`,
    ttl: 600,
  })
}

async function fetchLeaderboardStats(): Promise<TokscaleLeaderboard | null> {
  return providerFetch<TokscaleLeaderboard>({
    provider: "tokscale",
    cacheKey: "leaderboard:stats",
    url: "https://tokscale.ai/api/leaderboard?limit=1",
    ttl: 600,
  })
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}T`
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return formatCount(n)
}

function formatCost(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function profileLink(username: string): string {
  return `https://tokscale.ai/u/${username}`
}

// ---------------------------------------------------------------------------
// Badge functions
// ---------------------------------------------------------------------------

export async function getTokscaleTokens(username: string): Promise<BadgeData | null> {
  const data = await fetchUserProfile(username)
  if (!data) return { label: "tokscale", value: "not found" }
  return {
    label: "tokens",
    value: formatTokens(data.stats.totalTokens),
    link: profileLink(username),
  }
}

export async function getTokscaleCost(username: string): Promise<BadgeData | null> {
  const data = await fetchUserProfile(username)
  if (!data) return { label: "tokscale", value: "not found" }
  return {
    label: "cost",
    value: formatCost(data.stats.totalCost),
    link: profileLink(username),
  }
}

export async function getTokscaleRank(username: string): Promise<BadgeData | null> {
  const data = await fetchUserProfile(username)
  if (!data) return { label: "tokscale", value: "not found" }
  return {
    label: "rank",
    value: `#${data.user.rank}`,
    link: profileLink(username),
  }
}

export async function getTokscaleActiveDays(username: string): Promise<BadgeData | null> {
  const data = await fetchUserProfile(username)
  if (!data) return { label: "tokscale", value: "not found" }
  return {
    label: "active days",
    value: `${data.stats.activeDays}`,
    link: profileLink(username),
  }
}

export async function getTokscaleStats(): Promise<BadgeData | null> {
  const data = await fetchLeaderboardStats()
  if (!data) return null
  return {
    label: "tokscale users",
    value: formatCount(data.stats.uniqueUsers),
    link: "https://tokscale.ai/leaderboard",
  }
}
