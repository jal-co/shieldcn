"use client"

/**
 * shieldcn
 * components/studio/cloud-menu.tsx
 *
 * The Studio's cloud + AI + brand toolbar. Turns saving into a live-document
 * experience rather than a one-off export:
 *
 * - Cloud save/open with a visible document name + save-status indicator.
 * - Auto-save: once a README lives in the cloud, edits sync automatically
 *   (debounced), so the doc is never stale and there's nothing to remember.
 * - ⌘S / Ctrl+S saves on demand (creates the doc on first save).
 * - Rename + delete saved documents inline.
 * - AI README generation and "Save as brand" (both Plus).
 *
 * Free syncs 2 documents (the account hook); Plus raises the cap, enforced
 * server-side. Below-tier AI/brand actions open an UpgradeDialog instead of
 * hitting a 402.
 *
 * Studio owns the document state and passes the live `blocks`/`themeAware` in,
 * so this component can track dirtiness and auto-save without reaching into
 * Studio's internals.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Check, Cloud, CloudOff, FolderOpen, Loader2, Palette,
  Save, Sparkles, Trash2, ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tip } from "@/components/studio/inspectors"
import { UpgradeDialog } from "@/components/upgrade-cta"
import { useMe, planMeets } from "@/lib/use-me"
import { cn } from "@/lib/utils"
import type { Block } from "@/lib/studio-shared"

interface SavedDoc {
  id: number
  name: string
  updatedAt: string
}

/** Auto-save lifecycle for the currently-open cloud document. */
type SaveState = "clean" | "dirty" | "saving" | "saved" | "error"

/** Debounce before auto-saving after the last edit. */
const AUTOSAVE_MS = 1500

export interface StudioCloudMenuProps {
  /** Live document blocks (drives dirty-tracking + auto-save). */
  blocks: Block[]
  /** Live theme-aware flag (part of the saved snapshot). */
  themeAware: boolean
  /** Replace the current document (used by Open and AI generate). */
  loadProject: (blocks: Block[], themeAware: boolean) => void
  /** Current export markdown — context for AI. */
  getMarkdown: () => string
  /** Import markdown from AI into typed blocks. */
  applyMarkdown: (markdown: string) => void
}

export function StudioCloudMenu(props: StudioCloudMenuProps) {
  const { blocks, themeAware, loadProject, getMarkdown, applyMarkdown } = props
  const router = useRouter()
  const { me } = useMe()
  const signedIn = me.signedIn
  const isPlus = planMeets(me.plan, "plus")

  const [upgradeTier, setUpgradeTier] = useState<null | "plus">(null)
  const [upgradeFeature, setUpgradeFeature] = useState("this feature")

  const gatePlus = useCallback((feature: string): boolean => {
    if (isPlus) return true
    setUpgradeFeature(feature); setUpgradeTier("plus"); return false
  }, [isPlus])

  // -- Cloud doc state --
  const [docs, setDocs] = useState<SavedDoc[]>([])
  const [currentDocId, setCurrentDocId] = useState<number | null>(null)
  const [docName, setDocName] = useState("README")
  const [saveState, setSaveState] = useState<SaveState>("clean")
  const [openDialog, setOpenDialog] = useState(false)
  const [saveDialog, setSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState("README")
  const [renaming, setRenaming] = useState(false)
  const [busy, setBusy] = useState(false)

  // -- AI state --
  const [aiDialog, setAiDialog] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  // Plus: pick one of your brands to style the generated badges.
  const [brands, setBrands] = useState<{ slug: string; name: string | null }[]>([])
  const [aiBrand, setAiBrand] = useState("")

  // Baseline = the exact blocks/themeAware references at the last save or open.
  // Reference identity is cheap and exact: Studio makes a new array on every
  // edit, so `blocks !== baseline` means "changed since we last synced".
  const baselineBlocks = useRef<Block[] | null>(null)
  const baselineTheme = useRef<boolean>(false)
  const savedStateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const markSynced = useCallback((b: Block[], t: boolean) => {
    baselineBlocks.current = b
    baselineTheme.current = t
  }, [])

  const refreshDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/docs", { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      setDocs(Array.isArray(json.docs) ? json.docs : [])
    } catch {
      /* best-effort */
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (signedIn) void refreshDocs()
  }, [signedIn, refreshDocs])

  // -- Core save (create or update). `silent` drives the auto-save path (no
  // toast; status shown via the indicator). Returns the saved id or null. --
  const persist = useCallback(async (opts: {
    asNew: boolean
    name: string
    silent: boolean
  }): Promise<number | null> => {
    const snapshot = blocks
    const snapshotTheme = themeAware
    const body = JSON.stringify({
      name: opts.name.trim() || "README",
      doc: { version: 1, blocks: snapshot, themeAware: snapshotTheme },
    })
    const updating = !opts.asNew && currentDocId != null
    if (opts.silent) setSaveState("saving")
    else setBusy(true)
    try {
      const res = await fetch(
        updating ? `/api/studio/docs/${currentDocId}` : "/api/studio/docs",
        { method: updating ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) router.push("/sign-up")
        else if (res.status === 402) { setUpgradeFeature("Saved READMEs"); setUpgradeTier("plus") }
        else if (res.status === 409) { setUpgradeFeature("more saved READMEs"); setUpgradeTier("plus") }
        else if (!opts.silent) toast.error(json.error ?? "Couldn't save")
        if (opts.silent) setSaveState("error")
        return null
      }
      setCurrentDocId(json.id)
      setDocName(json.name ?? opts.name)
      markSynced(snapshot, snapshotTheme)
      if (opts.silent) {
        setSaveState("saved")
        if (savedStateTimer.current) clearTimeout(savedStateTimer.current)
        savedStateTimer.current = setTimeout(() => setSaveState("clean"), 2000)
      } else {
        setSaveDialog(false)
        toast.success(updating ? "Saved to cloud" : "Saved — auto-syncing from now on")
        setSaveState("clean")
      }
      void refreshDocs()
      return json.id
    } catch {
      if (opts.silent) setSaveState("error")
      else toast.error("Network error while saving")
      return null
    } finally {
      if (!opts.silent) setBusy(false)
    }
  }, [blocks, themeAware, currentDocId, router, markSynced, refreshDocs])

  // -- Dirty-tracking + auto-save (cloud docs only) --
  useEffect(() => {
    if (currentDocId == null || baselineBlocks.current == null) return
    const changed = blocks !== baselineBlocks.current || themeAware !== baselineTheme.current
    if (!changed) return
    setSaveState((s) => (s === "saving" ? s : "dirty"))
    const t = setTimeout(() => {
      void persist({ asNew: false, name: docName, silent: true })
    }, AUTOSAVE_MS)
    return () => clearTimeout(t)
  }, [blocks, themeAware, currentDocId, docName, persist])

  // -- Manual save (⌘S / menu) --
  const saveNow = useCallback(() => {
    if (!signedIn) { router.push("/sign-up"); return }
    if (currentDocId != null) void persist({ asNew: false, name: docName, silent: true })
    else { setSaveName(docName); setSaveDialog(true) }
  }, [signedIn, currentDocId, persist, docName, router])

  // ⌘S / Ctrl+S — save without leaving the keyboard (prevents the browser's
  // "save page" default).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [saveNow])

  const onOpenClick = useCallback(() => {
    if (!signedIn) { router.push("/sign-up"); return }
    void refreshDocs()
    setOpenDialog(true)
  }, [signedIn, router, refreshDocs])

  const openDoc = useCallback(async (id: number) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/studio/docs/${id}`, { credentials: "include" })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? "Couldn't open"); return }
      const doc = json.doc as { blocks?: Block[]; themeAware?: boolean } | null
      if (!doc?.blocks?.length) { toast.error("That document looks empty"); return }
      loadProject(doc.blocks, doc.themeAware === true)
      // The exact array we handed Studio becomes its state, so it matches the
      // next `blocks` prop — mark it synced so opening never trips auto-save.
      markSynced(doc.blocks, doc.themeAware === true)
      setCurrentDocId(id)
      setDocName(json.name ?? "README")
      setSaveState("clean")
      setOpenDialog(false)
      toast.success(`Opened “${json.name}”`)
    } catch {
      toast.error("Network error while opening")
    } finally {
      setBusy(false)
    }
  }, [loadProject, markSynced])

  const deleteDoc = useCallback(async (id: number) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/studio/docs/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) { toast.error("Couldn't delete"); return }
      if (id === currentDocId) { setCurrentDocId(null); baselineBlocks.current = null; setSaveState("clean") }
      toast.success("Deleted")
      void refreshDocs()
    } catch {
      toast.error("Network error while deleting")
    } finally {
      setBusy(false)
    }
  }, [currentDocId, refreshDocs])

  const commitRename = useCallback(async (next: string) => {
    setRenaming(false)
    const name = next.trim()
    if (!name || name === docName) return
    setDocName(name)
    if (currentDocId != null) void persist({ asNew: false, name, silent: true })
  }, [docName, currentDocId, persist])

  // Deep link: /studio?doc=<id> (from the dashboard) auto-opens once.
  useEffect(() => {
    if (!signedIn) return
    const params = new URLSearchParams(window.location.search)
    const id = Number(params.get("doc"))
    if (Number.isInteger(id) && id > 0) {
      window.history.replaceState({}, "", "/studio")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void openDoc(id)
    }
  }, [signedIn, openDoc])

  // -- AI generate --
  const onGenerateClick = useCallback(() => {
    if (!gatePlus("AI README generation")) return
    setAiDialog(true)
    // Plus: load the owner's brands so generated badges can be styled with one.
    if (isPlus) {
      void fetch("/api/brands", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : { brands: [] }))
        .then((j) => setBrands(Array.isArray(j.brands) ? j.brands : []))
        .catch(() => {})
    }
  }, [gatePlus, isPlus])

  const runGenerate = useCallback(async () => {
    const summary = aiPrompt.trim() || getMarkdown().slice(0, 4000)
    if (!summary) { toast.error("Describe your project first"); return }
    setAiBusy(true)
    try {
      const res = await fetch("/api/ai/readme", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, brand: aiBrand || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 402) { setAiDialog(false); setUpgradeFeature("AI README generation"); setUpgradeTier("plus") }
        else toast.error(json.error ?? "Generation failed")
        return
      }
      if (typeof json.markdown === "string" && json.markdown.trim()) {
        applyMarkdown(json.markdown)
        setAiDialog(false)
        toast.success("Draft generated — review and edit")
      } else toast.error("The model returned an empty draft")
    } catch {
      toast.error("Network error during generation")
    } finally {
      setAiBusy(false)
    }
  }, [aiPrompt, aiBrand, getMarkdown, applyMarkdown])

  const onSaveAsBrand = useCallback(() => {
    if (!gatePlus("Managed brands")) return
    // Capture the README's dominant look so the brand editor opens pre-filled
    // instead of blank — the whole point of "save as brand".
    try {
      const seed = extractBrandSeed(blocks)
      if (Object.keys(seed).length) {
        sessionStorage.setItem("shieldcn:brand-seed", JSON.stringify(seed))
      }
    } catch {
      /* seeding is best-effort; the editor still opens */
    }
    router.push("/dashboard/brands/new")
  }, [gatePlus, router, blocks])

  return (
    <>
      {/* Live document chip — name + auto-save status (only when a cloud doc
          is open). Click the name to rename. */}
      {currentDocId != null && (
        <div className="hidden items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 sm:flex">
          {renaming ? (
            <input
              autoFocus
              defaultValue={docName}
              onBlur={(e) => commitRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename((e.target as HTMLInputElement).value)
                if (e.key === "Escape") setRenaming(false)
              }}
              className="w-28 bg-transparent text-xs font-medium outline-none"
            />
          ) : (
            <Tip label="Rename">
              <button
                onClick={() => setRenaming(true)}
                className="max-w-32 truncate text-xs font-medium hover:underline"
              >
                {docName}
              </button>
            </Tip>
          )}
          <SaveIndicator state={saveState} onRetry={saveNow} />
        </div>
      )}

      {/* Generate with AI — a first-class toolbar action, not buried in a menu. */}
      <Tip label="Generate a README with AI">
        <Button size="sm" className="h-8 gap-1.5 shadow-sm" onClick={onGenerateClick} aria-label="Generate with AI">
          <Sparkles className="size-4" />
          <span className="hidden md:inline">Generate</span>
        </Button>
      </Tip>

      <DropdownMenu>
        <Tip label={currentDocId != null ? "Cloud & brand" : "Save to cloud & brand"}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Cloud & brand">
              <Cloud className="size-4" />
              <span className="hidden lg:inline">Cloud</span>
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </Tip>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Cloud</DropdownMenuLabel>
          <DropdownMenuItem onSelect={saveNow}>
            <Save className="size-4" />
            {currentDocId != null ? "Save now" : "Save to cloud…"}
            <span className="ml-auto text-[10px] text-muted-foreground">⌘S</span>
          </DropdownMenuItem>
          {currentDocId != null && (
            <DropdownMenuItem onSelect={() => { if (!signedIn) { router.push("/sign-up"); return } setSaveName(docName); setSaveDialog(true) }}>
              <Save className="size-4" /> Save as a copy…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onOpenClick}>
            <FolderOpen className="size-4" /> Open…
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center justify-between">
            Brand
            {!isPlus && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Plus</span>}
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={onSaveAsBrand}>
            <Palette className="size-4" /> Save as brand…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save dialog (first save / save a copy) */}
      <Dialog open={saveDialog} onOpenChange={setSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save README to cloud</DialogTitle>
            <DialogDescription>
              Synced to your account and available on every device. After the first
              save, edits sync automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && persist({ asNew: currentDocId != null, name: saveName, silent: false })}
              placeholder="README"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialog(false)}>Cancel</Button>
            <Button onClick={() => persist({ asNew: currentDocId != null, name: saveName, silent: false })} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open dialog — with delete */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your saved READMEs</DialogTitle>
            <DialogDescription>Cloud-synced across your devices.</DialogDescription>
          </DialogHeader>
          {docs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No saved READMEs yet. Use <strong>Save to cloud</strong> to create one.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 pr-2">
                  <button
                    onClick={() => openDoc(d.id)}
                    disabled={busy}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent/50 disabled:opacity-50",
                      d.id === currentDocId && "font-medium",
                    )}
                  >
                    <span className="truncate">{d.name}</span>
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <Tip label="Delete">
                    <button
                      onClick={() => deleteDoc(d.id)}
                      disabled={busy}
                      className="rounded p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      aria-label={`Delete ${d.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </Tip>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* AI dialog */}
      <Dialog open={aiDialog} onOpenChange={setAiDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate a README with AI</DialogTitle>
            <DialogDescription>
              Describe your project — name, what it does, install & usage. We&apos;ll draft
              clean Markdown you can refine. Leave blank to use the current document as context.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={6}
            placeholder="acme-cli — a fast task runner for monorepos. Install via npm i -g acme-cli. Run `acme run <task>`…"
          />
          {/* Plus: style the generated badges with one of your brands. */}
          {isPlus && brands.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="ai-brand" className="text-xs text-muted-foreground">Badge style</label>
              <select
                id="ai-brand"
                value={aiBrand}
                onChange={(e) => setAiBrand(e.target.value)}
                className="h-8 flex-1 rounded-md border border-border bg-transparent px-2 text-sm"
              >
                <option value="">Default</option>
                {brands.map((b) => (
                  <option key={b.slug} value={b.slug}>{b.name ?? b.slug} brand</option>
                ))}
              </select>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAiDialog(false)}>Cancel</Button>
            <Button onClick={runGenerate} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={upgradeTier !== null}
        onOpenChange={(o) => !o && setUpgradeTier(null)}
        tier={upgradeTier ?? "plus"}
        feature={upgradeFeature}
      />
    </>
  )
}

/**
 * Tally the document's dominant badge/header styling into a brand config, so
 * "Save as brand" opens the editor pre-filled with the README's house look
 * (the most common non-default value wins per token). Keys map 1:1 onto the
 * brand config; the server drops anything that isn't a valid brand param.
 */
function extractBrandSeed(blocks: Block[]): Record<string, string> {
  const tally: Record<string, Record<string, number>> = {}
  const bump = (key: string, val: string | undefined) => {
    const v = (val ?? "").trim()
    if (!v || v === "_none") return
    ;(tally[key] ??= {})[v] = (tally[key][v] ?? 0) + 1
  }
  for (const b of blocks) {
    if (b.type === "group") {
      bump("variant", b.variant); bump("size", b.size); bump("theme", b.theme)
      bump("font", b.font); bump("mode", b.mode)
    } else if (b.type === "badges") {
      for (const item of b.badges) {
        const s = item.state
        bump("variant", s.variant); bump("size", s.size); bump("theme", s.theme)
        bump("mode", s.mode); bump("font", s.font); bump("color", s.color)
        bump("labelColor", s.labelColor); bump("valueColor", s.valueColor)
        bump("labelTextColor", s.labelTextColor); bump("logoColor", s.logoColor)
        bump("gradient", s.gradient); bump("labelOpacity", s.labelOpacity)
      }
    } else if (b.type === "header") {
      bump("theme", b.state.theme); bump("mode", b.state.mode)
      bump("font", b.state.font); bump("logoColor", b.state.logoColor)
    }
  }
  const seed: Record<string, string> = {}
  for (const key of Object.keys(tally)) {
    const winner = Object.entries(tally[key]).sort((a, c) => c[1] - a[1])[0]?.[0]
    if (winner) seed[key] = winner
  }
  return seed
}

/** Compact auto-save status: spinner / check / amber dot / retry. */
function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === "saving") {
    return <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label="Saving" />
  }
  if (state === "dirty") {
    return (
      <Tip label="Unsaved changes — auto-saving">
        <span className="size-2 rounded-full bg-amber-500" aria-label="Unsaved changes" />
      </Tip>
    )
  }
  if (state === "error") {
    return (
      <Tip label="Save failed — click to retry">
        <button onClick={onRetry} aria-label="Retry save" className="text-destructive">
          <CloudOff className="size-3.5" />
        </button>
      </Tip>
    )
  }
  // clean / saved
  return (
    <Tip label={state === "saved" ? "Saved" : "All changes saved"}>
      <Check className="size-3.5 text-emerald-500" aria-label="Saved" />
    </Tip>
  )
}
