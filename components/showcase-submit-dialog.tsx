/**
 * shieldcn
 * components/showcase-submit-dialog
 *
 * Dialog for building and submitting a badge to the community showcase.
 * Includes a full badge builder so users can create their badge visually.
 */

"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Send, Loader2, Check, RotateCcw, ChevronDown, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox"
import { LogoPicker } from "@/components/logo-picker"
import { ColorInput } from "@/components/color-input"
import { SvgIconUpload } from "@/components/svg-icon-upload"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Builder options (same as badge-builder)
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { value: "npm", label: "npm version", placeholder: "react", inputLabel: "Package" },
  { value: "npm-downloads", label: "npm downloads", placeholder: "react", inputLabel: "Package" },
  { value: "github-stars", label: "GitHub stars", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "github-release", label: "GitHub release", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "github-ci", label: "CI status", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "github-license", label: "License", placeholder: "vercel/next.js", inputLabel: "Repository" },
  { value: "discord", label: "Discord online", placeholder: "1316199667142496307", inputLabel: "Server ID" },
  { value: "static", label: "Static badge", placeholder: "build-passing-green", inputLabel: "Text (label-message-color)" },
] as const

const VARIANTS = [
  { value: "default", label: "Default" },
  { value: "secondary", label: "Secondary" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "destructive", label: "Destructive" },
  { value: "branded", label: "Branded" },
] as const

const SIZES = [
  { value: "xs", label: "Extra small" },
  { value: "sm", label: "Small" },
  { value: "default", label: "Default" },
  { value: "lg", label: "Large" },
] as const

const THEMES = [
  { value: "_none", label: "None" },
  { value: "zinc", label: "Zinc" },
  { value: "slate", label: "Slate" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "rose", label: "Rose" },
  { value: "orange", label: "Orange" },
  { value: "violet", label: "Violet" },
  { value: "purple", label: "Purple" },
  { value: "cyan", label: "Cyan" },
] as const

// ---------------------------------------------------------------------------
// State + URL builder
// ---------------------------------------------------------------------------

interface BuilderState {
  provider: string
  input: string
  variant: string
  size: string
  theme: string
  mode: string
  split: boolean
  font: string
  logo: string
  logoColor: string
  label: string
  color: string
  gradient: string
  valueColor: string
  labelTextColor: string
  labelOpacity: string
  leftBg: string
  rightBg: string
}

const builderDefaults: BuilderState = {
  provider: "static",
  input: "my-badge-blue",
  variant: "default",
  size: "sm",
  theme: "_none",
  mode: "dark",
  split: false,
  font: "inter",
  logo: "",
  logoColor: "",
  label: "",
  color: "",
  gradient: "",
  valueColor: "",
  labelTextColor: "",
  labelOpacity: "",
  leftBg: "",
  rightBg: "",
}

function buildPath(s: BuilderState): string {
  if (!s.input.trim()) return ""

  let path = ""
  switch (s.provider) {
    case "npm":            path = `/npm/${s.input}.svg`; break
    case "npm-downloads":  path = `/npm/${s.input}/downloads.svg`; break
    case "github-stars":   path = `/github/${s.input}/stars.svg`; break
    case "github-release": path = `/github/${s.input}/release.svg`; break
    case "github-ci":      path = `/github/${s.input}/ci.svg`; break
    case "github-license": path = `/github/${s.input}/license.svg`; break
    case "discord":        path = `/discord/${s.input}.svg`; break
    case "static":         path = `/badge/${s.input}.svg`; break
  }

  const p = new URLSearchParams()
  if (s.variant !== "default") p.set("variant", s.variant)
  if (s.size !== "sm") p.set("size", s.size)
  if (s.theme && s.theme !== "_none") p.set("theme", s.theme)
  if (s.mode !== "dark") p.set("mode", s.mode)
  if (s.split) p.set("split", "true")
  if (s.font && s.font !== "inter") p.set("font", s.font)
  if (s.logo) p.set("logo", s.logo)
  if (s.logoColor) p.set("logoColor", s.logoColor)
  if (s.label) p.set("label", s.label)
  if (s.split) {
    if (s.leftBg) p.set("labelColor", s.leftBg)
    if (s.rightBg) p.set("color", s.rightBg)
  } else {
    if (s.color) p.set("color", s.color)
  }
  if (s.valueColor) p.set("valueColor", s.valueColor)
  if (s.labelTextColor) p.set("labelTextColor", s.labelTextColor)
  if (s.labelOpacity) p.set("labelOpacity", s.labelOpacity)
  if (s.gradient) p.set("gradient", s.gradient)

  const q = p.toString()
  return `${path}${q ? `?${q}` : ""}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShowcaseSubmitDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"build" | "submit">("build")
  const [s, setS] = useState<BuilderState>(builderDefaults)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Submit fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [githubUser, setGithubUser] = useState("")
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [prUrl, setPrUrl] = useState("")

  const badgePath = useMemo(() => buildPath(s), [s])

  const set = useCallback(<K extends keyof BuilderState>(key: K, val: BuilderState[K]) => {
    setS(prev => ({ ...prev, [key]: val }))
  }, [])

  const currentProvider = PROVIDERS.find(p => p.value === s.provider)
  const isDefault = JSON.stringify(s) === JSON.stringify(builderDefaults)

  function handleReset() {
    setS(builderDefaults)
    setShowAdvanced(false)
  }

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
        setS(builderDefaults)
        setTitle("")
        setDescription("")
        setGithubUser("")
        setSubmitStatus("idle")
        setErrorMsg("")
        setPrUrl("")
        setShowAdvanced(false)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{step === "build" ? "Create your badge" : "Submit to showcase"}</DialogTitle>
          <DialogDescription>
            {step === "build"
              ? "Build your badge using the controls below, then submit it to the community showcase."
              : "Add some details and submit your badge for review."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "build" ? (
          <div className="space-y-4">
            {/* Preview */}
            {badgePath && (
              <div className="flex items-center justify-center rounded-lg border border-border bg-muted/20 p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgePath} alt="Badge preview" className="h-8" />
              </div>
            )}

            {/* Badge type + input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Badge type">
                <Select value={s.provider} onValueChange={v => {
                  const p = PROVIDERS.find(x => x.value === v)
                  set("provider", v)
                  if (p) set("input", p.placeholder)
                }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={currentProvider?.inputLabel || "Input"}>
                <Input value={s.input} onChange={e => set("input", e.target.value)} placeholder={currentProvider?.placeholder} />
              </Field>
            </div>

            {/* Style row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Variant">
                <Select value={s.variant} onValueChange={v => set("variant", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VARIANTS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Size">
                <Select value={s.size} onValueChange={v => set("size", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SIZES.map(sz => <SelectItem key={sz.value} value={sz.value}>{sz.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Theme">
                <Select value={s.theme} onValueChange={v => set("theme", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {THEMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Mode">
                <Select value={s.mode} onValueChange={v => set("mode", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Icon + Font */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Icon">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <LogoPicker value={s.logo.startsWith("data:") ? "" : s.logo} onChange={v => set("logo", v)} />
                  </div>
                  <SvgIconUpload value={s.logo} onChange={v => set("logo", v)} className="shrink-0" />
                </div>
              </Field>

              <Field label="Gradient">
                <Input value={s.gradient} onChange={e => set("gradient", e.target.value)} placeholder="ff6b6b,4ecdc4" />
              </Field>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <ShadcnCheckbox checked={s.split} onCheckedChange={v => set("split", v === true)} />
                <span className="text-sm">Split mode</span>
              </label>
            </div>

            {/* Split colors */}
            {s.split && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                <Field label="Left background">
                  <ColorInput value={s.leftBg} onChange={v => set("leftBg", v)} placeholder="auto" />
                </Field>
                <Field label="Right background">
                  <ColorInput value={s.rightBg} onChange={v => set("rightBg", v)} placeholder="auto" />
                </Field>
                <Field label="Label text">
                  <Input value={s.label} onChange={e => set("label", e.target.value)} placeholder="auto" />
                </Field>
              </div>
            )}

            {/* Advanced */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn("size-3 transition-transform", showAdvanced && "rotate-180")} />
              Advanced options
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-border/50 bg-muted/10 p-3">
                <Field label="Background color">
                  <ColorInput value={s.color} onChange={v => set("color", v)} placeholder="auto" />
                </Field>
                <Field label="Value text color">
                  <ColorInput value={s.valueColor} onChange={v => set("valueColor", v)} placeholder="auto" />
                </Field>
                <Field label="Label text color">
                  <ColorInput value={s.labelTextColor} onChange={v => set("labelTextColor", v)} placeholder="auto" />
                </Field>
                <Field label="Icon color">
                  <ColorInput value={s.logoColor} onChange={v => set("logoColor", v)} placeholder="auto" />
                </Field>
                <Field label="Label opacity">
                  <Input value={s.labelOpacity} onChange={e => set("labelOpacity", e.target.value)} placeholder="0.7" />
                </Field>
                <Field label="Font">
                  <Select value={s.font} onValueChange={v => set("font", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">Inter</SelectItem>
                      <SelectItem value="geist">Geist</SelectItem>
                      <SelectItem value="geist-mono">Geist Mono</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between">
              {!isDefault ? (
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1.5 text-muted-foreground">
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              ) : <div />}
              <Button onClick={handleNext} disabled={!badgePath} className="gap-2">
                Next: Add details
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : submitStatus === "success" ? (
          <div className="flex flex-col items-center gap-4 py-10">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Badge preview */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgePath} alt="Badge preview" className="h-7 max-w-[240px]" />
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

// ---------------------------------------------------------------------------
// Field helper
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}
