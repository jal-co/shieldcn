/**
 * shieldcn
 * components/showcase-submit-dialog
 *
 * Dialog for building and submitting a badge to the community showcase.
 * Uses the shared BadgeBuilderCore for the builder step.
 */

"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Send, Loader2, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { BadgeBuilderCore } from "@/components/badge-builder-core"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  BUILDER_DEFAULTS,
  buildBadgePath,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShowcaseSubmitDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"build" | "submit">("build")
  const [s, setS] = useState<BuilderState>({
    ...BUILDER_DEFAULTS,
    path: "/badge/my-badge-blue.svg",
  })

  // Submit fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [githubUser, setGithubUser] = useState("")
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [prUrl, setPrUrl] = useState("")

  const [baseUrl, setBaseUrl] = useState("https://shieldcn.dev")
  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  const badgeUrl = useMemo(() => buildBadgeUrl(s, baseUrl), [s, baseUrl])
  const badgePath = useMemo(() => buildBadgePath(s), [s])

  function handleNext() {
    setStep("submit")
  }

  function handleBack() {
    setStep("build")
    setSubmitStatus("idle")
    setErrorMsg("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitStatus("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgePath,
          title,
          description,
          githubUser: githubUser.replace(/^@/, ""),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitStatus("error")
        setErrorMsg(data.error || "Something went wrong")
        return
      }

      setPrUrl(data.prUrl || "")
      setSubmitStatus("success")
    } catch {
      setSubmitStatus("error")
      setErrorMsg("Network error. Try again.")
    }
  }

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("build")
        setS({ ...BUILDER_DEFAULTS, path: "/badge/my-badge-blue.svg" })
        setTitle("")
        setDescription("")
        setGithubUser("")
        setSubmitStatus("idle")
        setErrorMsg("")
        setPrUrl("")
      }, 200)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Send className="size-3.5" />
          Submit your badge
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{step === "build" ? "Create your badge" : "Submit to showcase"}</DialogTitle>
          <DialogDescription>
            {step === "build"
              ? "Build your badge using the controls below, then submit it to the community showcase."
              : "Add some details and submit your badge for review."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "build" ? (
          <div>
            <BadgeBuilderCore
              state={s}
              onChange={setS}
              badgeUrl={badgeUrl}
              showHeader={false}
              showFormat={false}
            >
              <Separator />
              {/* Actions */}
              <div className="flex items-center justify-end">
                <Button onClick={handleNext} disabled={!badgePath} className="gap-2">
                  Next: Add details
                  <Send className="size-3.5" />
                </Button>
              </div>
            </BadgeBuilderCore>
          </div>
        ) : submitStatus === "success" ? (
          <div className="flex flex-col items-center gap-4 py-10 px-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10">
              <Check className="size-6 text-green-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Pull request created!</p>
              <p className="text-xs text-muted-foreground">Your badge will appear in the showcase once the PR is merged.</p>
            </div>
            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                View PR on GitHub
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
            {/* Badge preview */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeUrl} alt="Badge preview" className="h-7 max-w-[240px]" />
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Edit badge
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-title">Title</Label>
              <Input
                id="badge-title"
                placeholder="My Awesome Badge"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                A short name for your badge (e.g. &quot;Rust Stack&quot;, &quot;Neon Gradient&quot;)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge-description">Description (optional)</Label>
              <Textarea
                id="badge-description"
                placeholder="What makes this badge useful or cool?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={280}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-user" className="flex items-center gap-1.5">
                <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                GitHub username (optional)
              </Label>
              <Input
                id="github-user"
                placeholder="octocat"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                maxLength={39}
              />
              <p className="text-[11px] text-muted-foreground">
                Your badge will be credited to your GitHub profile in the showcase.
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="text-xs">
                ← Back to builder
              </Button>
              <Button type="submit" className="gap-2" disabled={submitStatus === "loading"}>
                {submitStatus === "loading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Submit for review
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
