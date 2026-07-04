"use client"

import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import {
  ArrowRight,
  Check,
  ExternalLink,
  GitPullRequest,
  Loader2,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { UpgradeInline } from "@/components/upgrade-cta"
import { useMe, planMeets } from "@/lib/use-me"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BadgeTransform {
  original: string
  shieldsUrl: string
  shieldcnUrl: string
  replacement: string
  confident: boolean
  description: string
}

interface CheckResult {
  installed: boolean
  installUrl?: string
  installationId?: number
  readme?: {
    path: string
    sha: string
    content: string
  }
  result?: {
    transformed: string
    badges: BadgeTransform[]
    found: number
    transformed_count: number
    skipped: number
  }
}

type Step = "input" | "loading" | "install" | "preview" | "creating" | "done"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim()

  // owner/repo
  const slashMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] }

  // https://github.com/owner/repo
  try {
    const url = new URL(trimmed)
    if (url.hostname === "github.com") {
      const parts = url.pathname.split("/").filter(Boolean)
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") }
      }
    }
  } catch {
    // not a URL
  }

  return null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SingleMigrate() {
  const [input, setInput] = useState("")
  const [step, setStep] = useState<Step>("input")
  const [error, setError] = useState<string | null>(null)
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)

  // -- Auto-resume after GitHub App install redirect --
  // Legitimate on-mount initialization from a non-React source (the return URL
  // GitHub redirects to after an App install): read the params once, hydrate the
  // form, clear the URL, and kick off the check. The one extra render this
  // schedules only happens on that specific redirect, not the cascading-render
  // hot path the rule targets — hence the scoped disable on the initial writes.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const setupAction = params.get("setup_action")
    const state = params.get("state")

    if (setupAction === "install" && state) {
      // User just installed the App — state contains "owner/repo"
      const parsed = parseRepoUrl(state)
      if (parsed) {
        /* eslint-disable react-hooks/set-state-in-effect */
        setInput(state)
        setOwner(parsed.owner)
        setRepo(parsed.repo)
        /* eslint-enable react-hooks/set-state-in-effect */
        // Clean URL
        window.history.replaceState({}, "", "/migrate")
        // Auto-check after a brief delay (installation takes a moment to propagate)
        setTimeout(() => {
          setStep("loading")
          fetch("/api/migrate/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed),
          })
            .then((res) => res.json())
            .then((data) => {
              if (!data.installed) {
                setCheckResult(data)
                setStep("install")
              } else if (data.result?.transformed_count === 0) {
                setError(
                  data.result.found === 0
                    ? "No shields.io badges found in this README."
                    : "Found shields.io badges but couldn't map any to shieldcn equivalents.",
                )
                setStep("input")
              } else {
                setCheckResult(data)
                setStep("preview")
              }
            })
            .catch(() => {
              setError("Failed to check repo after installation. Please try again.")
              setStep("input")
            })
        }, 1500)
      }
    }
  }, [])

  // -- Toggle individual badges --
  const [excludedBadges, setExcludedBadges] = useState<Set<number>>(new Set())

  const toggleBadge = (idx: number) => {
    setExcludedBadges((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const activeBadges =
    checkResult?.result?.badges.filter((_, i) => !excludedBadges.has(i)) ?? []

  // -- Compute final transformed content with exclusions --
  const getFinalContent = useCallback(() => {
    if (!checkResult?.readme?.content || !checkResult?.result?.badges) return ""
    let content = checkResult.readme.content
    const included = checkResult.result.badges.filter(
      (_, i) => !excludedBadges.has(i),
    )
    // Sort by position in reverse to preserve indices
    const sorted = [...included].sort((a, b) => {
      const aIdx = content.indexOf(a.original)
      const bIdx = content.indexOf(b.original)
      return bIdx - aIdx
    })
    for (const badge of sorted) {
      content = content.replace(badge.original, badge.replacement)
    }
    return content
  }, [checkResult, excludedBadges])

  // -- Step 1: Check repo --
  const handleCheck = async () => {
    const parsed = parseRepoUrl(input)
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL or owner/repo.")
      return
    }

    setOwner(parsed.owner)
    setRepo(parsed.repo)
    setError(null)
    setStep("loading")
    setExcludedBadges(new Set())

    try {
      const res = await fetch("/api/migrate/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to check repository")
        setStep("input")
        return
      }

      setCheckResult(data)

      if (!data.installed) {
        setStep("install")
      } else if (data.result.transformed_count === 0) {
        setError(
          data.result.found === 0
            ? "No shields.io badges found in this README."
            : "Found shields.io badges but couldn't map any to shieldcn equivalents. They may use unsupported badge types.",
        )
        setStep("input")
      } else {
        setStep("preview")
      }
    } catch {
      setError("Network error. Please try again.")
      setStep("input")
    }
  }

  // -- Step 3: Create PR --
  const handleCreatePR = async () => {
    if (!checkResult?.readme) return

    setStep("creating")
    setError(null)

    try {
      const res = await fetch("/api/migrate/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          readmePath: checkResult.readme.path,
          readmeSha: checkResult.readme.sha,
          transformedContent: getFinalContent(),
          badgeCount: activeBadges.length,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create PR")
        setStep("preview")
        return
      }

      setPrUrl(data.prUrl)
      setStep("done")
    } catch {
      setError("Network error. Please try again.")
      setStep("preview")
    }
  }

  // -- Reset --
  const reset = () => {
    setStep("input")
    setInput("")
    setError(null)
    setCheckResult(null)
    setPrUrl(null)
    setExcludedBadges(new Set())
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Input */}
      {(step === "input" || step === "loading") && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://github.com/owner/repo or owner/repo"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              disabled={step === "loading"}
              className="flex-1 font-mono text-sm"
            />
            <Button
              onClick={handleCheck}
              disabled={step === "loading" || !input.trim()}
            >
              {step === "loading" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {step === "loading" ? "Checking…" : "Check"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a GitHub repository URL. We&apos;ll scan the README for shields.io
            badges and show you a preview of the migration.
          </p>
        </div>
      )}

      {/* Step 2: Install prompt */}
      {step === "install" && checkResult && (
        <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className="size-6 text-muted-foreground"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Install the shieldcn GitHub App</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              To create a PR on{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {owner}/{repo}
              </code>
              , the shieldcn GitHub App needs to be installed on that repository.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a href={checkResult.installUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2">
                Install on {owner}/{repo}
                <ExternalLink className="size-3.5 opacity-60" />
              </Button>
            </a>
            <p className="text-xs text-muted-foreground">
              Only requests <strong>contents</strong> and <strong>pull requests</strong> permissions.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={() => handleCheck()} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            I&apos;ve installed it — check again
          </Button>

          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        </div>
      )}

      {/* Step 3: Preview */}
      {(step === "preview" || step === "creating") && checkResult?.result && (
        <div className="flex flex-col gap-6">
          {/* Summary */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {checkResult.result.found} badge{checkResult.result.found !== 1 ? "s" : ""} found
            </Badge>
            <Badge variant="default">
              {activeBadges.length} will be migrated
            </Badge>
            {checkResult.result.skipped > 0 && (
              <Badge variant="outline">
                {checkResult.result.skipped} skipped (no equivalent)
              </Badge>
            )}
          </div>

          {/* Badge list */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Badge replacements</h3>
            <div className="flex flex-col gap-2">
              {checkResult.result.badges.map((badge, i) => {
                const excluded = excludedBadges.has(i)
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                      excluded
                        ? "border-border/50 bg-muted/30 opacity-50"
                        : "border-border bg-card",
                    )}
                  >
                    <button
                      onClick={() => toggleBadge(i)}
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                        excluded
                          ? "border-muted-foreground/30 bg-transparent"
                          : "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {!excluded && <Check className="size-3" />}
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {badge.description}
                      </p>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive">
                            −
                          </span>
                          <code className="truncate text-muted-foreground">
                            {badge.shieldsUrl}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-emerald-500">
                            +
                          </span>
                          <code className="truncate text-foreground">
                            {badge.shieldcnUrl}
                          </code>
                        </div>
                      </div>

                      {/* Live preview */}
                      <div className="mt-1 flex items-center gap-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Before
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={badge.shieldsUrl}
                            alt="shields.io badge"
                            className="h-5"
                            loading="lazy"
                          />
                        </div>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            After
                          </span>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={badge.shieldcnUrl}
                            alt="shieldcn badge"
                            className="h-5"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreatePR}
              disabled={step === "creating" || activeBadges.length === 0}
              size="lg"
              className="gap-2"
            >
              {step === "creating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitPullRequest className="size-4" />
              )}
              {step === "creating"
                ? "Creating PR…"
                : `Open PR (${activeBadges.length} badge${activeBadges.length !== 1 ? "s" : ""})`}
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              <ArrowLeft className="size-3.5" />
              Start over
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && prUrl && (
        <div className="flex flex-col items-center gap-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="size-6 text-emerald-500" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">PR created!</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Your migration PR is ready for review on{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {owner}/{repo}
              </code>
              . Review the changes, tweak any badge parameters, and merge when ready.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <a href={prUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="gap-2">
                <GitPullRequest className="size-4" />
                View Pull Request
                <ExternalLink className="size-3.5 opacity-60" />
              </Button>
            </a>
          </div>

          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Migrate another repo
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bulk migration (Plus) — scan many repos, open PRs across all of them
// ---------------------------------------------------------------------------

type BulkStatus = "pending" | "scanning" | "ready" | "skip" | "opening" | "done" | "error"

interface BulkRow {
  owner: string
  repo: string
  status: BulkStatus
  message?: string
  found?: number
  willMigrate?: number
  readmePath?: string
  readmeSha?: string
  transformed?: string
  prUrl?: string
  installUrl?: string
}

function BulkMigrate() {
  const [input, setInput] = useState("")
  const [rows, setRows] = useState<BulkRow[]>([])
  const [scanning, setScanning] = useState(false)
  const [opening, setOpening] = useState(false)

  const parseRepos = (): { owner: string; repo: string }[] => {
    const seen = new Set<string>()
    const out: { owner: string; repo: string }[] = []
    for (const line of input.split(/[\n,]/)) {
      const parsed = parseRepoUrl(line)
      if (!parsed) continue
      const key = `${parsed.owner}/${parsed.repo}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(parsed)
    }
    return out
  }

  const patchRow = (owner: string, repo: string, patch: Partial<BulkRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.owner === owner && r.repo === repo ? { ...r, ...patch } : r)),
    )
  }

  const scanAll = async () => {
    const repos = parseRepos()
    if (repos.length === 0) return
    setRows(repos.map((r) => ({ ...r, status: "pending" as BulkStatus })))
    setScanning(true)

    // Scan sequentially — keeps well under GitHub App rate limits and gives
    // steady per-row progress rather than a thundering burst.
    for (const { owner, repo } of repos) {
      patchRow(owner, repo, { status: "scanning" })
      try {
        const res = await fetch("/api/migrate/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo }),
        })
        const data = await res.json()
        if (!res.ok) {
          patchRow(owner, repo, { status: "error", message: data.error ?? "Check failed" })
        } else if (!data.installed) {
          patchRow(owner, repo, { status: "skip", message: "App not installed", installUrl: data.installUrl })
        } else if (!data.result || data.result.transformed_count === 0) {
          patchRow(owner, repo, { status: "skip", message: data.result?.found ? "No mappable badges" : "No shields.io badges" })
        } else {
          patchRow(owner, repo, {
            status: "ready",
            found: data.result.found,
            willMigrate: data.result.transformed_count,
            readmePath: data.readme.path,
            readmeSha: data.readme.sha,
            transformed: data.result.transformed,
          })
        }
      } catch {
        patchRow(owner, repo, { status: "error", message: "Network error" })
      }
    }
    setScanning(false)
  }

  const openAll = async () => {
    setOpening(true)
    // Snapshot the ready rows up front so state updates don't reshuffle the loop.
    const ready = rows.filter((r) => r.status === "ready")
    for (const row of ready) {
      patchRow(row.owner, row.repo, { status: "opening" })
      try {
        const res = await fetch("/api/migrate/pr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: row.owner,
            repo: row.repo,
            readmePath: row.readmePath,
            readmeSha: row.readmeSha,
            transformedContent: row.transformed,
            badgeCount: row.willMigrate,
          }),
        })
        const data = await res.json()
        if (!res.ok) patchRow(row.owner, row.repo, { status: "error", message: data.error ?? "PR failed" })
        else patchRow(row.owner, row.repo, { status: "done", prUrl: data.prUrl })
      } catch {
        patchRow(row.owner, row.repo, { status: "error", message: "Network error" })
      }
    }
    setOpening(false)
  }

  const readyCount = rows.filter((r) => r.status === "ready").length
  const doneCount = rows.filter((r) => r.status === "done").length
  const busy = scanning || opening

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder={"vercel/next.js\nfacebook/react\nhttps://github.com/owner/repo"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={5}
          disabled={busy}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          One repo per line (or comma-separated). We scan each README, then you open every PR in one click.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={scanAll} disabled={busy || !input.trim()}>
            {scanning ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {scanning ? "Scanning…" : "Scan all"}
          </Button>
          {readyCount > 0 && (
            <Button onClick={openAll} disabled={busy} variant="default" className="gap-2">
              {opening ? <Loader2 className="size-4 animate-spin" /> : <GitPullRequest className="size-4" />}
              Open {readyCount} PR{readyCount === 1 ? "" : "s"}
            </Button>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {doneCount > 0 && (
            <p className="text-sm text-emerald-500">
              {doneCount} PR{doneCount === 1 ? "" : "s"} opened.
            </p>
          )}
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {rows.map((r) => (
              <li key={`${r.owner}/${r.repo}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate font-mono text-xs">{r.owner}/{r.repo}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {r.status === "scanning" && <><Loader2 className="size-3.5 animate-spin" /> Scanning</>}
                  {r.status === "opening" && <><Loader2 className="size-3.5 animate-spin" /> Opening PR</>}
                  {r.status === "pending" && <span className="text-muted-foreground">Queued</span>}
                  {r.status === "ready" && <Badge variant="secondary">{r.willMigrate} to migrate</Badge>}
                  {r.status === "skip" && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {r.message}
                      {r.installUrl && (
                        <a href={r.installUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground">
                          Install <ExternalLink className="size-3" />
                        </a>
                      )}
                    </span>
                  )}
                  {r.status === "error" && (
                    <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" /> {r.message}</span>
                  )}
                  {r.status === "done" && r.prUrl && (
                    <a href={r.prUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-500 underline underline-offset-2">
                      <Check className="size-3.5" /> PR opened <ExternalLink className="size-3" />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wrapper — single vs bulk. Bulk is a Plus feature; free users see an upsell.
// ---------------------------------------------------------------------------

export default function MigrateClient() {
  const { me } = useMe()
  const isPlus = planMeets(me.plan, "plus")

  return (
    <Tabs defaultValue="single" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="single">Single repo</TabsTrigger>
        <TabsTrigger value="bulk" className="gap-1.5">
          Bulk
          {!isPlus && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Plus</span>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="single">
        <SingleMigrate />
      </TabsContent>

      <TabsContent value="bulk">
        {isPlus ? (
          <BulkMigrate />
        ) : (
          <div className="flex flex-col gap-4">
            <UpgradeInline
              tier="plus"
              feature="Bulk migration"
            />
            <p className="text-sm text-muted-foreground">
              Scanning and previewing is free for a single repo. Bulk migration
              scans every repo you list and opens all the PRs in one click —
              part of <strong>Plus</strong>, which also adds{" "}
              <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">a managed brand</Link>{" "}
              so one edit restyles every embed.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
