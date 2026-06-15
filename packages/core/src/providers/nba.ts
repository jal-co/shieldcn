/**
 * shieldcn
 * lib/providers/nba
 *
 * Static NBA team badge provider.
 */

import type { BadgeData } from "../badges/types"

interface NbaTeam {
  name: string
  abbr: string
  color: string
  aliases: string[]
}

const ESPN_LOGO_BASE = "https://a.espncdn.com/i/teamlogos/nba/500"

const TEAMS: NbaTeam[] = [
  { name: "Atlanta Hawks", abbr: "atl", color: "E03A3E", aliases: ["atlanta", "hawks"] },
  { name: "Boston Celtics", abbr: "bos", color: "007A33", aliases: ["boston", "celtics"] },
  { name: "Brooklyn Nets", abbr: "bkn", color: "000000", aliases: ["brooklyn", "nets"] },
  { name: "Charlotte Hornets", abbr: "cha", color: "1D1160", aliases: ["charlotte", "hornets"] },
  { name: "Chicago Bulls", abbr: "chi", color: "CE1141", aliases: ["chicago", "bulls"] },
  { name: "Cleveland Cavaliers", abbr: "cle", color: "860038", aliases: ["cleveland", "cavaliers", "cavs"] },
  { name: "Dallas Mavericks", abbr: "dal", color: "00538C", aliases: ["dallas", "mavericks", "mavs"] },
  { name: "Denver Nuggets", abbr: "den", color: "0E2240", aliases: ["denver", "nuggets"] },
  { name: "Detroit Pistons", abbr: "det", color: "C8102E", aliases: ["detroit", "pistons"] },
  { name: "Golden State Warriors", abbr: "gs", color: "1D428A", aliases: ["golden-state", "warriors", "gsw", "g-state"] },
  { name: "Houston Rockets", abbr: "hou", color: "CE1141", aliases: ["houston", "rockets"] },
  { name: "Indiana Pacers", abbr: "ind", color: "002D62", aliases: ["indiana", "pacers"] },
  { name: "LA Clippers", abbr: "lac", color: "C8102E", aliases: ["la-clippers", "los-angeles-clippers", "clippers"] },
  { name: "Los Angeles Lakers", abbr: "lal", color: "552583", aliases: ["los-angeles-lakers", "la-lakers", "lakers"] },
  { name: "Memphis Grizzlies", abbr: "mem", color: "5D76A9", aliases: ["memphis", "grizzlies"] },
  { name: "Miami Heat", abbr: "mia", color: "98002E", aliases: ["miami", "heat"] },
  { name: "Milwaukee Bucks", abbr: "mil", color: "00471B", aliases: ["milwaukee", "bucks"] },
  { name: "Minnesota Timberwolves", abbr: "min", color: "0C2340", aliases: ["minnesota", "timberwolves", "wolves"] },
  { name: "New Orleans Pelicans", abbr: "no", color: "0C2340", aliases: ["new-orleans", "pelicans", "nop"] },
  { name: "New York Knicks", abbr: "ny", color: "006BB6", aliases: ["new-york", "knicks", "nyk"] },
  { name: "Oklahoma City Thunder", abbr: "okc", color: "007AC1", aliases: ["oklahoma-city", "thunder"] },
  { name: "Orlando Magic", abbr: "orl", color: "0077C0", aliases: ["orlando", "magic"] },
  { name: "Philadelphia 76ers", abbr: "phi", color: "006BB6", aliases: ["philadelphia", "76ers", "sixers", "seventy-sixers"] },
  { name: "Phoenix Suns", abbr: "phx", color: "1D1160", aliases: ["phoenix", "suns"] },
  { name: "Portland Trail Blazers", abbr: "por", color: "E03A3E", aliases: ["portland", "trail-blazers", "blazers"] },
  { name: "Sacramento Kings", abbr: "sac", color: "5A2D81", aliases: ["sacramento", "kings"] },
  { name: "San Antonio Spurs", abbr: "sa", color: "000000", aliases: ["san-antonio", "spurs", "sas"] },
  { name: "Toronto Raptors", abbr: "tor", color: "CE1141", aliases: ["toronto", "raptors"] },
  { name: "Utah Jazz", abbr: "utah", color: "002B5C", aliases: ["utah", "jazz"] },
  { name: "Washington Wizards", abbr: "wsh", color: "002B5C", aliases: ["washington", "wizards"] },
]

const TEAM_BY_SLUG = new Map<string, NbaTeam>()

for (const team of TEAMS) {
  TEAM_BY_SLUG.set(team.abbr, team)
  TEAM_BY_SLUG.set(slugify(team.name), team)
  for (const alias of team.aliases) TEAM_BY_SLUG.set(slugify(alias), team)
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function listNbaTeams(): NbaTeam[] {
  return TEAMS
}

export function getNbaTeamBadge(teamSlug: string, options?: { label?: string; value?: string; color?: string }): BadgeData | null {
  const team = TEAM_BY_SLUG.get(slugify(teamSlug))

  if (!team) {
    return {
      label: "nba",
      value: "team not found",
      color: "red",
      error: true,
    }
  }

  return {
    label: options?.label ?? "fan",
    value: options?.value ?? team.name,
    color: options?.color ?? team.color,
    link: `${ESPN_LOGO_BASE}/${team.abbr}.png`,
  }
}
