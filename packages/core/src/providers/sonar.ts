/**
 * @shieldcn/core
 * src/providers/sonar
 *
 * SonarCloud / SonarQube API client.
 * Supports: quality gate, bugs, vulnerabilities, code smells,
 * coverage, duplicated lines, maintainability/reliability/security rating.
 *
 * Uses the public SonarCloud API (no auth required for public projects).
 */

import type { BadgeData } from "../badges/types"
import { formatCount } from "../format"
import { providerFetch } from "../provider-fetch"

async function sonarFetch(
  component: string,
  metricKeys: string,
  server: string = "sonarcloud.io",
): Promise<Record<string, unknown> | null> {
  return providerFetch({
    provider: "sonar",
    cacheKey: `${server}:${component}:${metricKeys}`,
    url: `https://${server}/api/measures/component?component=${encodeURIComponent(component)}&metricKeys=${metricKeys}`,
    ttl: 3600,
  })
}

function getMeasureValue(data: Record<string, unknown>, metric: string): string | undefined {
  const component = data.component as Record<string, unknown> | undefined
  const measures = component?.measures as Array<Record<string, string>> | undefined
  if (!measures) return undefined
  const m = measures.find(m => m.metric === metric)
  return m?.value
}

function ratingToLetter(value: string): string {
  const map: Record<string, string> = { "1.0": "A", "2.0": "B", "3.0": "C", "4.0": "D", "5.0": "E" }
  return map[value] ?? value
}

function ratingColor(letter: string): string | undefined {
  const map: Record<string, string> = { A: "green", B: "green", C: "yellow", D: "amber", E: "red" }
  return map[letter]
}

// ---------------------------------------------------------------------------
// Quality Gate
// ---------------------------------------------------------------------------

export async function getSonarQualityGate(component: string, server?: string): Promise<BadgeData | null> {
  const data = await providerFetch<Record<string, unknown>>({
    provider: "sonar",
    cacheKey: `qg:${server ?? "sonarcloud.io"}:${component}`,
    url: `https://${server ?? "sonarcloud.io"}/api/qualitygates/project_status?projectKey=${encodeURIComponent(component)}`,
    ttl: 3600,
  })
  if (!data) return null

  const projectStatus = data.projectStatus as Record<string, string> | undefined
  const status = projectStatus?.status

  return {
    label: "quality gate",
    value: status === "OK" ? "passed" : status === "ERROR" ? "failed" : status ?? "unknown",
    color: status === "OK" ? "green" : status === "ERROR" ? "red" : undefined,
    link: `https://${server ?? "sonarcloud.io"}/dashboard?id=${component}`,
  }
}

// ---------------------------------------------------------------------------
// Bugs
// ---------------------------------------------------------------------------

export async function getSonarBugs(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "bugs", server)
  if (!data) return null
  const value = getMeasureValue(data, "bugs")
  if (value === undefined) return null

  return {
    label: "bugs",
    value: formatCount(parseInt(value)),
    link: `https://${server ?? "sonarcloud.io"}/project/issues?id=${component}&resolved=false&types=BUG`,
  }
}

// ---------------------------------------------------------------------------
// Vulnerabilities
// ---------------------------------------------------------------------------

export async function getSonarVulnerabilities(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "vulnerabilities", server)
  if (!data) return null
  const value = getMeasureValue(data, "vulnerabilities")
  if (value === undefined) return null

  return {
    label: "vulnerabilities",
    value: formatCount(parseInt(value)),
    link: `https://${server ?? "sonarcloud.io"}/project/issues?id=${component}&resolved=false&types=VULNERABILITY`,
  }
}

// ---------------------------------------------------------------------------
// Code Smells
// ---------------------------------------------------------------------------

export async function getSonarCodeSmells(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "code_smells", server)
  if (!data) return null
  const value = getMeasureValue(data, "code_smells")
  if (value === undefined) return null

  return {
    label: "code smells",
    value: formatCount(parseInt(value)),
    link: `https://${server ?? "sonarcloud.io"}/project/issues?id=${component}&resolved=false&types=CODE_SMELL`,
  }
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export async function getSonarCoverage(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "coverage", server)
  if (!data) return null
  const value = getMeasureValue(data, "coverage")
  if (value === undefined) return null

  const pct = parseFloat(value)
  let color: string | undefined
  if (pct >= 80) color = "green"
  else if (pct >= 60) color = "yellow"
  else if (pct >= 40) color = "amber"
  else color = "red"

  return {
    label: "coverage",
    value: `${pct}%`,
    color,
    link: `https://${server ?? "sonarcloud.io"}/component_measures?id=${component}&metric=coverage`,
  }
}

// ---------------------------------------------------------------------------
// Duplicated Lines
// ---------------------------------------------------------------------------

export async function getSonarDuplicatedLines(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "duplicated_lines_density", server)
  if (!data) return null
  const value = getMeasureValue(data, "duplicated_lines_density")
  if (value === undefined) return null

  return {
    label: "duplicated lines",
    value: `${parseFloat(value)}%`,
    link: `https://${server ?? "sonarcloud.io"}/component_measures?id=${component}&metric=duplicated_lines_density`,
  }
}

// ---------------------------------------------------------------------------
// Maintainability Rating
// ---------------------------------------------------------------------------

export async function getSonarMaintainability(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "sqale_rating", server)
  if (!data) return null
  const value = getMeasureValue(data, "sqale_rating")
  if (value === undefined) return null

  const letter = ratingToLetter(value)

  return {
    label: "maintainability",
    value: letter,
    color: ratingColor(letter),
    link: `https://${server ?? "sonarcloud.io"}/component_measures?id=${component}&metric=sqale_rating`,
  }
}

// ---------------------------------------------------------------------------
// Reliability Rating
// ---------------------------------------------------------------------------

export async function getSonarReliability(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "reliability_rating", server)
  if (!data) return null
  const value = getMeasureValue(data, "reliability_rating")
  if (value === undefined) return null

  const letter = ratingToLetter(value)

  return {
    label: "reliability",
    value: letter,
    color: ratingColor(letter),
    link: `https://${server ?? "sonarcloud.io"}/component_measures?id=${component}&metric=reliability_rating`,
  }
}

// ---------------------------------------------------------------------------
// Security Rating
// ---------------------------------------------------------------------------

export async function getSonarSecurity(component: string, server?: string): Promise<BadgeData | null> {
  const data = await sonarFetch(component, "security_rating", server)
  if (!data) return null
  const value = getMeasureValue(data, "security_rating")
  if (value === undefined) return null

  const letter = ratingToLetter(value)

  return {
    label: "security",
    value: letter,
    color: ratingColor(letter),
    link: `https://${server ?? "sonarcloud.io"}/component_measures?id=${component}&metric=security_rating`,
  }
}
