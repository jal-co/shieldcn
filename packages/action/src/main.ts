/**
 * shieldcn
 * packages/action/src/main
 *
 * Entrypoint for the shieldcn starchart GitHub Action.
 *
 * Fetches the repo's star history with the workflow's `GITHUB_TOKEN` (which,
 * unlike anonymous/pool tokens, still has access to stargazer timestamps),
 * renders a shadcn-styled SVG line chart via @shieldcn/core, writes it into
 * the repo, and optionally commits the result as shieldcn[bot].
 */

import { execFileSync } from "node:child_process"
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import {
  renderChart,
  resolveAccent,
  resolveFontFamily,
  type ChartSeries,
} from "../../core/src/badges/render-chart"
import { formatCount } from "../../core/src/format"
import { getStarHistory } from "./starhistory"

// ---------------------------------------------------------------------------
// Action input/output helpers (no @actions/core — inputs arrive as INPUT_*)
// ---------------------------------------------------------------------------

function getInput(name: string, fallback = ""): string {
  const key = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`
  return (process.env[key] ?? fallback).trim() || fallback
}

function getBoolInput(name: string, fallback: boolean): boolean {
  const raw = getInput(name)
  if (!raw) return fallback
  return raw !== "false" && raw !== "0" && raw !== "no"
}

function setOutput(name: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT
  if (!file) return
  if (value.includes("\n")) {
    // Multiline values use the heredoc form of the GITHUB_OUTPUT file format.
    appendFileSync(file, `${name}<<SHIELDCN_EOF\n${value}\nSHIELDCN_EOF\n`)
  } else {
    appendFileSync(file, `${name}=${value}\n`)
  }
}

function fail(message: string): never {
  console.error(`::error::${message}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Chart rendering
// ---------------------------------------------------------------------------

/** SimpleIcons GitHub mark, embedded so the bundle stays dependency-free. */
const GITHUB_MARK = {
  viewBox: "0 0 24 24",
  path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
}

function clampNum(raw: string, min: number, max: number, fallback: number): number {
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

interface RenderOpts {
  mode: "dark" | "light"
  title: string
  subtitle: string
  series: ChartSeries[]
  width: number
  height: number
  area: boolean
  background?: string
  border: boolean
  fontFamily: string
  logo: boolean
  link: string
}

function renderStarChart(opts: RenderOpts): string {
  return renderChart({
    title: opts.title,
    subtitle: opts.subtitle,
    series: opts.series,
    width: opts.width,
    height: opts.height,
    mode: opts.mode,
    area: opts.area,
    background: opts.background,
    border: opts.border,
    fontFamily: opts.fontFamily,
    logo: opts.logo,
    link: opts.link,
    titleIcon: GITHUB_MARK,
  })
}

// ---------------------------------------------------------------------------
// Git commit as shieldcn[bot]
// ---------------------------------------------------------------------------

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim()
}

function commitFiles(paths: string[], message: string): boolean {
  git(["add", ...paths])
  const staged = git(["diff", "--cached", "--name-only", "--", ...paths])
  if (!staged) {
    console.log("Star chart unchanged — nothing to commit.")
    return false
  }
  git([
    "-c", "user.name=shieldcn[bot]",
    "-c", "user.email=shieldcn[bot]@users.noreply.github.com",
    "commit", "-m", message,
  ])
  git(["push"])
  return true
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  const repoInput = getInput("repo", process.env.GITHUB_REPOSITORY ?? "")
  const [owner, repo] = repoInput.split("/")
  if (!owner || !repo) fail(`Invalid repo "${repoInput}" — expected "owner/repo".`)

  const token = getInput("token", process.env.GITHUB_TOKEN ?? "")
  if (!token) fail("No GitHub token. Pass `token:` or expose GITHUB_TOKEN.")

  const modeInput = getInput("mode", "both")
  if (!["dark", "light", "both"].includes(modeInput)) {
    fail(`Invalid mode "${modeInput}" — expected dark, light, or both.`)
  }
  const modes: Array<"dark" | "light"> =
    modeInput === "both" ? ["dark", "light"] : [modeInput as "dark" | "light"]

  const output = getInput("output", ".github/shieldcn/star-chart.svg")
  if (!output.endsWith(".svg")) fail(`Output "${output}" must end in .svg`)

  const width = clampNum(getInput("width"), 200, 2000, 800)
  const height = clampNum(getInput("height"), 120, 1200, 400)
  const area = getBoolInput("area", true)
  const border = getBoolInput("border", true)
  const logo = getBoolInput("logo", true)
  const accent = resolveAccent(getInput("theme") || null, getInput("color") || null)
  const fontFamily = resolveFontFamily(getInput("font") || null)
  const bgInput = getInput("background")
  const background =
    bgInput === "transparent" || bgInput === "none"
      ? "transparent"
      : /^[0-9a-fA-F]{6}$/.test(bgInput.replace("#", ""))
        ? `#${bgInput.replace("#", "")}`
        : undefined

  console.log(`Fetching star history for ${owner}/${repo}…`)
  const history = await getStarHistory(owner, repo, token)
  console.log(`Total stars: ${history.total} (${history.points.length} points)`)

  const link = `https://github.com/${owner}/${repo}/stargazers`
  const title = getInput("title", `${owner}/${repo}`)
  const subtitle = getInput(
    "subtitle",
    `${formatCount(history.total)} stars`,
  )
  const series: ChartSeries[] = [
    { label: "stars", points: history.points, color: accent },
  ]

  // mode=both writes `-dark` / `-light` suffixed files for a <picture> pair.
  const files: string[] = []
  for (const mode of modes) {
    const path =
      modeInput === "both"
        ? output.replace(/\.svg$/, `-${mode}.svg`)
        : output
    const svg = renderStarChart({
      mode, title, subtitle, series, width, height,
      area, background, border, fontFamily, logo, link,
    })
    mkdirSync(dirname(join(process.cwd(), path)), { recursive: true })
    writeFileSync(path, svg)
    console.log(`Wrote ${path}`)
    files.push(path)
  }

  setOutput("files", files.join("\n"))
  setOutput("stars", String(history.total))

  if (modeInput === "both") {
    const [darkFile, lightFile] = files
    setOutput(
      "snippet",
      [
        "<picture>",
        `  <source media="(prefers-color-scheme: dark)" srcset="${darkFile}">`,
        `  <img alt="Star history of ${owner}/${repo}" src="${lightFile}">`,
        "</picture>",
      ].join("\n"),
    )
  } else {
    setOutput("snippet", `<img alt="Star history of ${owner}/${repo}" src="${files[0]}">`)
  }

  if (getBoolInput("commit", true)) {
    const message = getInput(
      "commit-message",
      "chore: update star chart [skip ci]",
    )
    const committed = commitFiles(files, message)
    setOutput("committed", String(committed))
  } else {
    setOutput("committed", "false")
  }
}

run().catch((err) => fail(err instanceof Error ? err.message : String(err)))
