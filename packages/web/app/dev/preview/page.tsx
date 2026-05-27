// shieldcn — app/dev/preview/page.tsx
// Dev-only badge preview page — visual matrix of variants × modes
// with per-badge variant toggling, custom input, and screenshot export.
// Badges are collapsed by default to avoid slamming the dev server.

"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { toPng } from "html-to-image"

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const ALL_VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "branded"] as const
type Variant = (typeof ALL_VARIANTS)[number]
const MODES = ["dark", "light"] as const
const SIZES = ["xs", "sm", "default", "lg"] as const
type Size = (typeof SIZES)[number]

interface BadgeEntry {
  path: string
  variants: Set<Variant>
  expanded: boolean
}

const DEFAULT_ENTRIES: BadgeEntry[] = [
  { path: "/shipperclub", variants: new Set<Variant>(["default", "secondary", "outline", "ghost"]), expanded: true },
  { path: "/npm/react", variants: new Set<Variant>([...ALL_VARIANTS]), expanded: false },
  { path: "/github/stars/vercel/next.js", variants: new Set<Variant>([...ALL_VARIANTS]), expanded: false },
  { path: "/discord/1316199667142496307", variants: new Set<Variant>([...ALL_VARIANTS]), expanded: false },
  { path: "/badge/hello-world-blue", variants: new Set<Variant>([...ALL_VARIANTS]), expanded: false },
  { path: "/pypi/requests", variants: new Set<Variant>([...ALL_VARIANTS]), expanded: false },
  { path: "/bluesky/jay.bsky.team", variants: new Set<Variant>([...ALL_VARIANTS]), expanded: false },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSrc(basePath: string, variant: string, mode: string, size?: string) {
  const params = new URLSearchParams()
  params.set("variant", variant)
  params.set("mode", mode)
  if (size && size !== "sm") params.set("size", size)
  return `${basePath}.svg?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Inline SVG component — fetches SVG and inlines it for screenshot capture
// ---------------------------------------------------------------------------

function InlineBadge({ src, alt }: { src: string; alt: string }) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setSvgHtml(text)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src])

  if (!svgHtml) {
    return (
      <div
        className="animate-pulse rounded"
        style={{ width: 120, height: 28, backgroundColor: "#27272a" }}
      />
    )
  }

  return (
    <div
      title={alt}
      className="inline-flex h-auto max-h-10 shrink-0"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function VariantToggle({
  variant,
  active,
  onToggle,
}: {
  variant: Variant
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className="rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors"
      style={{
        backgroundColor: active ? "#27272a" : "transparent",
        color: active ? "#e4e4e7" : "#52525b",
        border: `1px solid ${active ? "#3f3f46" : "#27272a"}`,
      }}
    >
      {variant}
    </button>
  )
}

function BadgeRow({
  path,
  variant,
  mode,
  size,
  showSizeLabel,
}: {
  path: string
  variant: Variant
  mode: string
  size: Size
  showSizeLabel: boolean
}) {
  const label = showSizeLabel ? `${variant} · ${size}` : variant
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono text-[10px] w-28 shrink-0 text-right"
        style={{ color: mode === "dark" ? "#52525b" : "#a1a1aa" }}
      >
        {label}
      </span>
      <InlineBadge
        src={buildSrc(path, variant, mode, size)}
        alt={`${path} ${variant} ${mode} ${size}`}
      />
    </div>
  )
}

function BadgeMatrix({
  entry,
  showSizes,
  onToggleVariant,
  onToggleExpanded,
  onRemove,
  onSaveOne,
}: {
  entry: BadgeEntry
  showSizes: boolean
  onToggleVariant: (variant: Variant) => void
  onToggleExpanded: () => void
  onRemove: () => void
  onSaveOne: (el: HTMLDivElement) => void
}) {
  const activeVariants = ALL_VARIANTS.filter((v) => entry.variants.has(v))
  const sizes: readonly Size[] = showSizes ? SIZES : ["sm"]
  const cardsRef = useRef<HTMLDivElement>(null)

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleExpanded}
          className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
          title={entry.expanded ? "Collapse" : "Expand"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: entry.expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms" }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button
          onClick={onToggleExpanded}
          className="font-mono text-sm text-zinc-400 shrink-0 hover:text-zinc-200 transition-colors"
        >
          {entry.path}
        </button>

        {entry.expanded && (
          <div className="flex items-center gap-1">
            {ALL_VARIANTS.map((v) => (
              <VariantToggle
                key={v}
                variant={v}
                active={entry.variants.has(v)}
                onToggle={() => onToggleVariant(v)}
              />
            ))}
          </div>
        )}

        {entry.expanded && activeVariants.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); cardsRef.current && onSaveOne(cardsRef.current) }}
            className="rounded-full p-1 text-zinc-700 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Save this badge as PNG"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-auto rounded-full p-1 text-zinc-700 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          title="Remove badge"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Matrix — one panel per mode, all sizes × variants inside */}
      {entry.expanded && (
        activeVariants.length === 0 ? (
          <p className="font-mono text-xs text-zinc-600 italic pl-7">No variants selected</p>
        ) : (
          <div ref={cardsRef} className="grid grid-cols-2 gap-3 pl-7">
            {MODES.map((mode) => (
              <div
                key={mode}
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: mode === "dark" ? "#09090b" : "#ffffff",
                  borderColor: mode === "dark" ? "#27272a" : "#e4e4e7",
                }}
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-wider mb-3"
                  style={{ color: mode === "dark" ? "#71717a" : "#a1a1aa" }}
                >
                  {mode}
                </p>
                <div className="flex flex-col gap-2">
                  {sizes.map((size) =>
                    activeVariants.map((variant) => (
                      <BadgeRow
                        key={`${variant}-${size}`}
                        path={entry.path}
                        variant={variant}
                        mode={mode}
                        size={size}
                        showSizeLabel={showSizes}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DevPreviewPage() {
  const [badges, setBadges] = useState<BadgeEntry[]>(DEFAULT_ENTRIES)
  const [input, setInput] = useState("")
  const [showSizes, setShowSizes] = useState(false)
  const [saving, setSaving] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const addBadge = useCallback(() => {
    const path = input.trim().replace(/\.svg$/, "").replace(/\?.*$/, "")
    if (!path) return
    const normalized = path.startsWith("/") ? path : `/${path}`
    if (badges.some((b) => b.path === normalized)) return
    setBadges((prev) => [
      { path: normalized, variants: new Set<Variant>([...ALL_VARIANTS]), expanded: true },
      ...prev,
    ])
    setInput("")
  }, [input, badges])

  const removeBadge = useCallback((path: string) => {
    setBadges((prev) => prev.filter((b) => b.path !== path))
  }, [])

  const toggleVariant = useCallback((path: string, variant: Variant) => {
    setBadges((prev) =>
      prev.map((b) => {
        if (b.path !== path) return b
        const next = new Set(b.variants)
        if (next.has(variant)) {
          next.delete(variant)
        } else {
          next.add(variant)
        }
        return { ...b, variants: next }
      })
    )
  }, [])

  const toggleExpanded = useCallback((path: string) => {
    setBadges((prev) =>
      prev.map((b) =>
        b.path === path ? { ...b, expanded: !b.expanded } : b
      )
    )
  }, [])

  const saveOne = useCallback(async (el: HTMLDivElement) => {
    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 300))
      const dataUrl = await toPng(el, {
        backgroundColor: "#09090b",
        pixelRatio: 2,
      })
      const link = document.createElement("a")
      link.download = `shieldcn-preview-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Screenshot failed:", err)
    } finally {
      setSaving(false)
    }
  }, [])

  const saveAll = useCallback(async () => {
    if (!gridRef.current) return
    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 300))
      const dataUrl = await toPng(gridRef.current, {
        backgroundColor: "#09090b",
        pixelRatio: 2,
      })
      const link = document.createElement("a")
      link.download = `shieldcn-preview-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error("Screenshot failed:", err)
    } finally {
      setSaving(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl flex items-center gap-3 px-6 py-3">
          <h1 className="font-mono text-sm font-medium text-zinc-400 shrink-0">
            /dev/preview
          </h1>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBadge()}
              placeholder="/provider/params or badge path…"
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            <button
              onClick={addBadge}
              className="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Add
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={showSizes}
              onChange={(e) => setShowSizes(e.target.checked)}
              className="rounded border-zinc-700"
            />
            <span className="font-mono text-xs text-zinc-500">All sizes</span>
          </label>

          <button
            onClick={saveAll}
            disabled={saving}
            className="rounded-md bg-zinc-100 px-3 py-1.5 font-mono text-xs text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 shrink-0"
          >
            {saving ? "Saving…" : "📸 Save PNG"}
          </button>
        </div>
      </div>

      {/* Badge grid */}
      <div ref={gridRef} className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {badges.map((entry) => (
          <div key={entry.path}>
            <BadgeMatrix
              entry={entry}
              showSizes={showSizes}
              onToggleVariant={(v) => toggleVariant(entry.path, v)}
              onToggleExpanded={() => toggleExpanded(entry.path)}
              onRemove={() => removeBadge(entry.path)}
              onSaveOne={saveOne}
            />
          </div>
        ))}

        {badges.length === 0 && (
          <div className="text-center py-20 text-zinc-600 font-mono text-sm">
            No badges — type a path above and press Enter
          </div>
        )}
      </div>
    </div>
  )
}
