// shieldcn — app/dev/social/page.tsx
// Dev-only social-image composer. Pick badges, arrange them on a black/white
// canvas at a social preset (OG / square / story) or tight crop, optionally
// add a title + subtitle, and export the canvas as a 2× PNG.
//
// Badges are inlined as SVG so html-to-image captures them cleanly. When the
// canvas contains any animated badge (?animate=pulse|glow|shimmer), Save
// produces an animated GIF of the WHOLE canvas: each animated badge is baked
// to a static frame via core's frameSvg(), the canvas is snapshotted per
// frame, the canvas is painted per frame, and recorded to an MP4 video via
// MediaRecorder (full color — keeps antialiased text crisp; X-ready). Falls
// back to WebM only if the browser can't encode MP4.

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { frameSvg, GIF_FRAMES, GIF_FRAME_DELAY_MS } from "@shieldcn/core/badges/animate"
import { allBadgePaths } from "@/lib/showcase-data"

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "branded"] as const
type Variant = (typeof VARIANTS)[number]

const SIZES = ["xs", "sm", "default", "lg"] as const
type Size = (typeof SIZES)[number]

const FONTS = ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"] as const
type Font = (typeof FONTS)[number]

const ANIMATES = ["none", "pulse", "glow", "shimmer"] as const
type Animate = (typeof ANIMATES)[number]

// What to caption below a badge on the canvas.
const LABELS = ["none", "variant", "size", "path", "custom"] as const
type LabelKind = (typeof LABELS)[number]

const PRESETS = {
  og: { label: "OG · 1200×630", width: 1200, height: 630 },
  square: { label: "Square · 1080×1080", width: 1080, height: 1080 },
  story: { label: "Story · 1080×1920", width: 1080, height: 1920 },
  tight: { label: "Tight crop", width: 0, height: 0 },
} as const
type PresetKey = keyof typeof PRESETS

type Bg = "black" | "white"

interface BadgeItem {
  id: string
  path: string
  variant: Variant
  size: Size
  font: Font
  animate: Animate
  label: LabelKind
  labelText: string // used when label === "custom"
}

// Resolve the caption text for a badge from its label setting.
function labelFor(item: BadgeItem): string {
  switch (item.label) {
    case "variant": return item.variant
    case "size": return item.size
    case "path": return item.path
    case "custom": return item.labelText
    default: return ""
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let idCounter = 0
const nextId = () => `b${++idCounter}`

function normalizePath(raw: string): string {
  const p = raw.trim().replace(/\.svg$/, "").replace(/\.png$/, "").replace(/\.gif$/, "").replace(/\?.*$/, "")
  if (!p) return ""
  return p.startsWith("/") ? p : `/${p}`
}

function buildSrc(item: BadgeItem, mode: Bg): string {
  const params = new URLSearchParams()
  params.set("variant", item.variant)
  params.set("mode", mode === "black" ? "dark" : "light")
  if (item.size !== "sm") params.set("size", item.size)
  if (item.font !== "inter") params.set("font", item.font)
  if (item.animate !== "none") params.set("animate", item.animate)
  return `${item.path}.svg?${params.toString()}`
}

function buildGifUrl(item: BadgeItem, mode: Bg): string {
  const params = new URLSearchParams()
  params.set("variant", item.variant)
  params.set("mode", mode === "black" ? "dark" : "light")
  if (item.size !== "sm") params.set("size", item.size)
  if (item.font !== "inter") params.set("font", item.font)
  if (item.animate !== "none") params.set("animate", item.animate)
  return `${item.path}.gif?${params.toString()}`
}

// Load an SVG string into an <img> and resolve once decoded, so it can be
// painted onto a 2D canvas pixel-perfectly (no foreignObject re-raster).
function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 0) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

async function downloadGif(item: BadgeItem, mode: Bg): Promise<void> {
  try {
    const res = await fetch(buildGifUrl(item, mode))
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const slug = item.path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-")
    link.download = `shieldcn-${slug}-${item.animate}-${Date.now()}.gif`
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    console.error("GIF download failed:", err)
  }
}

const DEFAULT_ITEMS: BadgeItem[] = [
  { id: nextId(), path: "/badge/font-Inter-a78bfa", variant: "branded", size: "sm", font: "inter", animate: "none", label: "variant", labelText: "" },
  { id: nextId(), path: "/badge/font-Geist-34d399", variant: "branded", size: "sm", font: "geist", animate: "none", label: "variant", labelText: "" },
  { id: nextId(), path: "/badge/font-Geist Mono-22d3ee", variant: "branded", size: "sm", font: "geist-mono", animate: "none", label: "variant", labelText: "" },
  { id: nextId(), path: "/badge/font-JetBrains Mono-facc15", variant: "branded", size: "sm", font: "jetbrains-mono", animate: "none", label: "variant", labelText: "" },
  { id: nextId(), path: "/badge/font-Fira Code-fb923c", variant: "branded", size: "sm", font: "fira-code", animate: "none", label: "variant", labelText: "" },
  { id: nextId(), path: "/badge/font-Roboto-60a5fa", variant: "branded", size: "sm", font: "roboto", animate: "none", label: "variant", labelText: "" },
  { id: nextId(), path: "/badge/font-Space Grotesk-f472b6", variant: "branded", size: "sm", font: "space-grotesk", animate: "none", label: "variant", labelText: "" },
]

// ---------------------------------------------------------------------------
// Inline SVG badge — pure renderer. The page fetches each badge's base SVG
// (+ dot color) and passes it in. For animated badges with a `frameTime`,
// frameSvg() bakes that exact moment (no CSS); otherwise the live animated
// SVG is shown for preview.
//
// Export does NOT screenshot this DOM — it reads each wrapper's geometry and
// paints the SVG directly onto a 2D canvas (pixel-perfect, no foreignObject).
// ---------------------------------------------------------------------------

function buildBaseSrc(item: BadgeItem, mode: Bg): string {
  const params = new URLSearchParams()
  params.set("variant", item.variant)
  params.set("mode", mode === "black" ? "dark" : "light")
  if (item.size !== "sm") params.set("size", item.size)
  if (item.font !== "inter") params.set("font", item.font)
  return `${item.path}.svg?${params.toString()}`
}

interface BadgeSvg {
  base: string
  animatedPreview: string
  dotColor?: string
}

function InlineBadge({
  item,
  svg,
  frameTime,
}: {
  item: BadgeItem
  svg: BadgeSvg | undefined
  frameTime: number | null
}) {
  if (!svg) {
    return <div className="animate-pulse rounded" style={{ width: 120, height: 28, backgroundColor: "#3f3f4633" }} />
  }

  const animated = item.animate !== "none"
  const html =
    animated && frameTime !== null
      ? frameSvg(svg.base, item.animate as "pulse" | "glow" | "shimmer", frameTime, svg.dotColor)
      : animated
        ? svg.animatedPreview
        : svg.base

  return (
    <div
      className="inline-flex shrink-0"
      data-badge-id={item.id}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function Select<T extends string>({
  value, options, onChange,
}: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function ItemControls({
  item, mode, onChange, onRemove,
}: {
  item: BadgeItem
  mode: Bg
  onChange: (patch: Partial<BadgeItem>) => void
  onRemove: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isAnimated = item.animate !== "none"

  const copyGif = useCallback(() => {
    const url = `${window.location.origin}${buildGifUrl(item, mode)}`
    void navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }, [item, mode])

  const saveGif = useCallback(async () => {
    await downloadGif(item, mode)
  }, [item, mode])

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
      <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[180px]" title={item.path}>{item.path}</span>
      <Select value={item.variant} options={VARIANTS} onChange={(v) => onChange({ variant: v })} />
      <Select value={item.size} options={SIZES} onChange={(v) => onChange({ size: v })} />
      <Select value={item.font} options={FONTS} onChange={(v) => onChange({ font: v as Font })} />
      <Select value={item.animate} options={ANIMATES} onChange={(v) => onChange({ animate: v })} />
      <span className="font-mono text-[10px] text-zinc-600">label</span>
      <Select value={item.label} options={LABELS} onChange={(v) => onChange({ label: v })} />
      {item.label === "custom" && (
        <input
          type="text"
          value={item.labelText}
          onChange={(e) => onChange({ labelText: e.target.value })}
          placeholder="caption…"
          className="w-28 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />
      )}
      {isAnimated && (
        <>
          <button
            onClick={saveGif}
            className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Download this badge as an animated .gif"
          >
            save .gif
          </button>
          <button
            onClick={copyGif}
            className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Copy animated .gif URL (works in READMEs)"
          >
            {copied ? "copied!" : "copy .gif"}
          </button>
        </>
      )}
      <button
        onClick={onRemove}
        className="ml-auto rounded-full p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
        title="Remove"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DevSocialPage() {
  const [items, setItems] = useState<BadgeItem[]>(DEFAULT_ITEMS)
  const [input, setInput] = useState("")
  const [preset, setPreset] = useState<PresetKey>("og")
  const [bg, setBg] = useState<Bg>("black")
  const [gap, setGap] = useState(16)
  const [showText, setShowText] = useState(false)
  const [showLogo, setShowLogo] = useState(true)
  const [title, setTitle] = useState("shieldcn")
  const [subtitle, setSubtitle] = useState("Beautiful README badges")
  const [saving, setSaving] = useState(false)
  // Resolved SVG (base + animated preview + dot color) per badge id.
  const [svgMap, setSvgMap] = useState<Record<string, BadgeSvg>>({})
  const canvasRef = useRef<HTMLDivElement>(null)

  // Fetch each badge's SVG whenever its identity (path/variant/size/animate)
  // or the background mode changes. Stored centrally so both the preview and
  // the canvas exporter use identical markup.
  useEffect(() => {
    let cancelled = false
    items.forEach((item) => {
      const animated = item.animate !== "none"
      const baseUrl = buildBaseSrc(item, bg)
      const animUrl = animated ? buildSrc(item, bg) : baseUrl
      Promise.all([
        fetch(baseUrl).then((r) => r.text()),
        animated ? fetch(animUrl).then((r) => r.text()) : Promise.resolve(""),
      ])
        .then(([base, anim]) => {
          if (cancelled) return
          let dotColor: string | undefined
          if (animated && (item.animate === "pulse" || item.animate === "glow")) {
            dotColor =
              anim.match(/<path class="scn-dot"[^>]*fill="([^"]+)"/)?.[1] ??
              anim.match(/<path[^>]*fill="([^"]+)"[^>]*class="scn-dot"/)?.[1]
          }
          setSvgMap((prev) => ({
            ...prev,
            [item.id]: { base, animatedPreview: animated ? anim : base, dotColor },
          }))
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [items, bg])

  const addBadge = useCallback(() => {
    const path = normalizePath(input)
    if (!path) return
    if (items.some((b) => b.path === path)) { setInput(""); return }
    setItems((prev) => [...prev, { id: nextId(), path, variant: "branded", size: "sm", font: "inter", animate: "none", label: "none", labelText: "" }])
    setInput("")
  }, [input, items])

  const patchItem = useCallback((id: string, patch: Partial<BadgeItem>) => {
    setItems((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((b) => b.id !== id))
  }, [])

  // If any badge is animated, Save produces an animated GIF of the whole
  // canvas; otherwise a flat PNG.
  const hasAnimated = items.some((i) => i.animate !== "none")

  const exportImage = useCallback(async () => {
    const node = canvasRef.current
    if (!node) return
    setSaving(true)
    const canvasBgHex = bg === "black" ? "#000000" : "#ffffff"
    const SCALE = 2 // export resolution multiplier
    const textCol = bg === "black" ? "#ffffff" : "#09090b"
    const subCol = bg === "black" ? "rgba(255,255,255,0.6)" : "rgba(9,9,11,0.55)"

    try {
      // Read the laid-out geometry from the live DOM so canvas painting
      // matches exactly what's previewed (flex-wrap positions, text, gaps).
      const rootRect = node.getBoundingClientRect()
      const W = Math.round(rootRect.width)
      const H = Math.round(rootRect.height)

      // Collect each badge's on-screen box relative to the canvas root.
      const boxes = items.map((item) => {
        const el = node.querySelector(`[data-badge-id="${item.id}"] svg`) as SVGElement | null
        if (!el) return null
        const r = el.getBoundingClientRect()
        return {
          item,
          x: r.left - rootRect.left,
          y: r.top - rootRect.top,
          w: r.width,
          h: r.height,
        }
      })

      // Title / subtitle positions (if shown) — read their boxes too.
      const titleEl = node.querySelector("[data-canvas-title]") as HTMLElement | null
      const subEl = node.querySelector("[data-canvas-subtitle]") as HTMLElement | null
      const titleBox = titleEl ? titleEl.getBoundingClientRect() : null
      const subBox = subEl ? subEl.getBoundingClientRect() : null
      const logoEl = node.querySelector("[data-canvas-logo]") as HTMLElement | null
      const logoBox = logoEl ? logoEl.getBoundingClientRect() : null

      // Per-badge variant labels (if shown) — capture text, center, baseline.
      const labels = items
        .map((item) => {
          const el = node.querySelector(`[data-badge-label="${item.id}"]`) as HTMLElement | null
          if (!el) return null
          const r = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return {
            text: el.textContent ?? "",
            cx: r.left - rootRect.left + r.width / 2,
            baseline: r.bottom - rootRect.top - parseFloat(cs.fontSize) * 0.2,
            fontSize: parseFloat(cs.fontSize),
            font: cs.fontFamily,
          }
        })
        .filter((l): l is NonNullable<typeof l> => l !== null)

      const out = document.createElement("canvas")
      out.width = W * SCALE
      out.height = H * SCALE
      const ctx = out.getContext("2d")
      if (!ctx) return
      ctx.scale(SCALE, SCALE)

      // Pre-decode every image we'll ever draw so painting is fully
      // synchronous during recording (no async gaps → no half-drawn frames).
      // Animated badges have GIF_FRAMES distinct baked frames; statics one.
      // imgFor(boxIndex, frameIndex) returns a ready HTMLImageElement.
      const ready: Array<HTMLImageElement[] | null> = await Promise.all(
        boxes.map(async (box) => {
          if (!box) return null
          const entry = svgMap[box.item.id]
          if (!entry) return null
          const animated = box.item.animate !== "none"
          if (!animated) {
            const img = await loadSvg(entry.base)
            return [img] // single frame
          }
          // Bake + decode all animation frames once.
          return Promise.all(
            Array.from({ length: GIF_FRAMES }, (_, fi) =>
              loadSvg(
                frameSvg(
                  entry.base,
                  box.item.animate as "pulse" | "glow" | "shimmer",
                  fi / GIF_FRAMES,
                  entry.dotColor,
                ),
              ),
            ),
          )
        }),
      )

      // Paint one full frame at frame index fi (0..GIF_FRAMES-1). Synchronous.
      const paintFrame = (fi: number) => {
        ctx.clearRect(0, 0, W, H)
        ctx.fillStyle = canvasBgHex
        ctx.fillRect(0, 0, W, H)

        // Graph paper grid
        const gSize = 24
        const gCol = bg === "black" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
        ctx.strokeStyle = gCol
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let x = 0; x <= W; x += gSize) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H) }
        for (let y = 0; y <= H; y += gSize) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5) }
        ctx.stroke()

        // Radial fade: solid center fading out, revealing grid at edges
        const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.55)
        grad.addColorStop(0, canvasBgHex)
        grad.addColorStop(1, "transparent")
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, W, H)

        // Title + subtitle (canvas-drawn text — sharp, no glyph doubling).
        if (titleBox && titleEl) {
          const fs = parseFloat(getComputedStyle(titleEl).fontSize)
          ctx.fillStyle = textCol
          ctx.font = `700 ${fs}px var(--font-sora), system-ui, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "alphabetic"
          ctx.fillText(title, W / 2, titleBox.bottom - rootRect.top - fs * 0.18)
        }
        if (subBox && subEl && subtitle) {
          const fs = parseFloat(getComputedStyle(subEl).fontSize)
          ctx.fillStyle = subCol
          ctx.font = `400 ${fs}px system-ui, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "alphabetic"
          ctx.fillText(subtitle, W / 2, subBox.bottom - rootRect.top - fs * 0.18)
        }

        // Badges — drawn from pre-decoded images (no async during record).
        boxes.forEach((box, bi) => {
          if (!box) return
          const frames = ready[bi]
          if (!frames || frames.length === 0) return
          const img = frames.length === 1 ? frames[0] : frames[fi % frames.length]
          ctx.drawImage(img, box.x, box.y, box.w, box.h)
        })

        // Variant labels under each badge (canvas-drawn text — stays sharp).
        ctx.textAlign = "center"
        ctx.textBaseline = "alphabetic"
        ctx.fillStyle = subCol
        labels.forEach((l) => {
          ctx.font = `400 ${l.fontSize}px ${l.font}`
          ctx.fillText(l.text, l.cx, l.baseline)
        })

        // Logo watermark at the bottom
        if (logoBox && logoEl) {
          ctx.save()
          ctx.globalAlpha = 0.4
          const lx = logoBox.left - rootRect.left
          const ly = logoBox.top - rootRect.top
          // Draw the shield icon as a path
          const iconSize = 20
          ctx.fillStyle = textCol
          ctx.save()
          ctx.translate(lx, ly + 1)
          const s = iconSize / 512
          ctx.scale(s, s)
          const p1 = new Path2D("M148.02,363.76c-4.48,0-8.64-2.42-10.86-6.32l-54.29-95.68c-2.15-3.8-2.15-8.52,0-12.32l54.29-95.68c2.21-3.9,6.37-6.32,10.86-6.32h18.51c4.44,0,8.45,2.28,10.73,6.09,2.27,3.82,2.37,8.43.25,12.33l-42.23,77.99c-3.98,7.36-3.98,16.14,0,23.49l22.22,41.02c4.25,7.85,12.43,12.8,21.36,12.92,0,0,45.08.61,45.11.61,8.68,0,16.83-4.64,21.26-12.12l24.87-41.99c2.23-3.77,6.34-6.11,10.72-6.12l19.47-.04c4.48,0,8.49,2.29,10.76,6.12,2.27,3.83,2.35,8.45.21,12.35l-42.2,77.17c-2.19,4-6.39,6.49-10.95,6.49h-110.08Z")
          const p2 = new Path2D("M346.7,363.69c-4.44,0-8.45-2.28-10.73-6.09-2.27-3.82-2.37-8.43-.25-12.33l42.23-77.99c3.98-7.35,3.98-16.14,0-23.49l-22.22-41.02c-4.25-7.85-12.44-12.8-21.36-12.92,0,0-46.51-.63-46.53-.63-8.88,0-17.12,4.81-21.48,12.54l-23.35,41.36c-2.2,3.9-6.36,6.34-10.84,6.35l-19.21.04c-4.48,0-8.49-2.29-10.76-6.12-2.27-3.83-2.35-8.45-.22-12.36l42.2-77.17c2.19-4.01,6.39-6.5,10.95-6.5h110.08c4.48,0,8.64,2.42,10.86,6.32l54.29,95.68c2.16,3.8,2.16,8.52,0,12.32l-54.29,95.68c-2.21,3.9-6.37,6.32-10.86,6.32h-18.51Z")
          ctx.fill(p1)
          ctx.fill(p2)
          ctx.restore()
          // Draw "shieldcn.dev" text next to the icon
          ctx.fillStyle = textCol
          ctx.font = '500 14px "Geist Mono", ui-monospace, monospace'
          ctx.textAlign = "left"
          ctx.textBaseline = "middle"
          ctx.fillText("shieldcn.dev", lx + iconSize + 8, ly + iconSize / 2 + 1)
          ctx.restore()
        }
      }

      // ── Static → PNG ───────────────────────────────────────────────────
      if (!hasAnimated) {
        paintFrame(0)
        const dataUrl = out.toDataURL("image/png")
        const link = document.createElement("a")
        link.download = `shieldcn-social-${preset}-${Date.now()}.png`
        link.href = dataUrl
        link.click()
        return
      }

      // ── Animated → MP4 video (whole canvas) ────────────────────────────
      // Full color + real frames, so antialiased text stays crisp (unlike a
      // 256-color GIF). X/Twitter requires MP4 (H.264), so prefer an MP4
      // codec from MediaRecorder and fall back to WebM only if unsupported.
      // We record the export canvas while painting frames in a timed loop.
      // One animation cycle is GIF_FRAMES * GIF_FRAME_DELAY_MS ms; record
      // several loops so the clip plays long enough to loop seamlessly.
      const FPS = Math.round(1000 / GIF_FRAME_DELAY_MS) // ≈20fps
      const LOOPS = 3
      const totalFrames = GIF_FRAMES * LOOPS

      const mime =
        [
          "video/mp4;codecs=avc1.640028", // H.264 High — best X compatibility
          "video/mp4;codecs=avc1.42E01E", // H.264 Baseline
          "video/mp4",
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
        ].find(
          (m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
        ) ?? "video/webm"
      const ext = mime.startsWith("video/mp4") ? "mp4" : "webm"

      // All images are pre-decoded, so paintFrame is synchronous and the very
      // first recorded frame is already complete (no badge "pops in" later).
      paintFrame(0)

      const stream = out.captureStream(FPS)
      const chunks: Blob[] = []
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }

      const done = new Promise<void>((resolve) => { rec.onstop = () => resolve() })
      rec.start()
      // Hold the first complete frame briefly so it's captured before the loop.
      await new Promise((r) => setTimeout(r, GIF_FRAME_DELAY_MS))

      // Paint each frame and hold it for one frame-duration so the recorder
      // captures distinct frames at the intended cadence.
      for (let i = 0; i < totalFrames; i++) {
        paintFrame(i % GIF_FRAMES)
        await new Promise((r) => setTimeout(r, GIF_FRAME_DELAY_MS))
      }
      rec.stop()
      await done

      const blob = new Blob(chunks, { type: mime })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = `shieldcn-social-${preset}-${Date.now()}.${ext}`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setSaving(false)
    }
  }, [bg, preset, hasAnimated, items, svgMap, title, subtitle])

  const p = PRESETS[preset]
  const isTight = preset === "tight"
  const canvasBg = bg === "black" ? "#000000" : "#ffffff"
  const textColor = bg === "black" ? "#ffffff" : "#09090b"
  const subColor = bg === "black" ? "rgba(255,255,255,0.6)" : "rgba(9,9,11,0.55)"

  // Graph paper grid settings
  const gridSize = 24
  const gridColor = bg === "black" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  const gridStyle: React.CSSProperties = {
    backgroundImage: [
      `linear-gradient(${gridColor} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
      // radial fade: solid center → transparent edges, revealing the grid only at edges
      `radial-gradient(ellipse at center, ${canvasBg} 0%, transparent 35%)`,
    ].join(", "),
    backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, 100% 100%`,
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3 px-6 py-3">
          <h1 className="font-mono text-sm font-medium text-zinc-400 shrink-0">/dev/social</h1>

          <div className="flex-1 flex items-center gap-2 min-w-[260px]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBadge()}
              placeholder="/provider/params — Enter to add"
              list="badge-suggestions"
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
            <datalist id="badge-suggestions">
              {allBadgePaths.slice(0, 200).map((s) => <option key={s} value={s.replace(/\.svg.*$/, "").replace(/\?.*$/, "")} />)}
            </datalist>
            <button onClick={addBadge} className="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300 hover:bg-zinc-700 transition-colors">Add</button>
          </div>

          <Select value={preset} options={Object.keys(PRESETS) as PresetKey[]} onChange={setPreset} />

          <div className="flex items-center gap-1 rounded-md border border-zinc-800 p-0.5">
            {(["black", "white"] as Bg[]).map((b) => (
              <button
                key={b}
                onClick={() => setBg(b)}
                className="rounded px-2 py-1 font-mono text-[11px] transition-colors"
                style={{ backgroundColor: bg === b ? "#27272a" : "transparent", color: bg === b ? "#e4e4e7" : "#71717a" }}
              >
                {b}
              </button>
            ))}
          </div>

          <button
            onClick={exportImage}
            disabled={saving || items.length === 0}
            className="rounded-md bg-zinc-100 px-3 py-1.5 font-mono text-xs text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 shrink-0"
          >
            {saving ? "Saving…" : hasAnimated ? "🎞 Save Video" : "📸 Save PNG"}
          </button>
        </div>

        {/* Secondary controls */}
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-4 px-6 pb-3">
          <label className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
            gap
            <input type="range" min={0} max={48} value={gap} onChange={(e) => setGap(Number(e.target.value))} className="accent-zinc-400" />
            <span className="w-6 text-zinc-400">{gap}</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-zinc-500">
            <input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} className="rounded border-zinc-700" />
            title text
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer font-mono text-[11px] text-zinc-500">
            <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="rounded border-zinc-700" />
            logo
          </label>


          {showText && (
            <>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600" />
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="subtitle" className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 flex-1 min-w-[160px]" />
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Per-badge controls */}
        <div className="space-y-2">
          {items.map((item) => (
            <ItemControls
              key={item.id}
              item={item}
              mode={bg}
              onChange={(patch) => patchItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
          {items.length === 0 && (
            <p className="font-mono text-xs text-zinc-600 italic">No badges — add one above.</p>
          )}
        </div>

        {/* Canvas */}
        <div className="flex justify-center overflow-auto rounded-lg border border-zinc-800 bg-[#0c0c0f] p-6">
          <div
            ref={canvasRef}
            className="relative flex shrink-0 flex-col items-center justify-center"
            style={{
              backgroundColor: canvasBg,
              ...gridStyle,
              width: isTight ? "auto" : p.width,
              height: isTight ? "auto" : p.height,
              padding: isTight ? `${Math.max(gap, 24)}px ${Math.max(gap, 32)}px` : 48,
              gap: showText ? 28 : 0,
            }}
          >
            {showText && (
              <div className="flex flex-col items-center gap-2 text-center">
                <p data-canvas-title style={{ fontFamily: "var(--font-sora)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", color: textColor, margin: 0 }}>{title}</p>
                {subtitle && <p data-canvas-subtitle style={{ fontSize: 20, color: subColor, margin: 0 }}>{subtitle}</p>}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center" style={{ gap }}>
              {items.map((item) => {
                const caption = labelFor(item)
                return (
                  <div
                    key={`${item.id}-${item.variant}-${item.size}-${item.font}-${item.animate}-${bg}`}
                    className="flex flex-col items-center"
                    style={{ gap: caption ? 10 : 0 }}
                  >
                    <InlineBadge item={item} svg={svgMap[item.id]} frameTime={null} />
                    {caption && (
                      <span
                        data-badge-label={item.id}
                        style={{ fontSize: 15, color: subColor, fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
                      >
                        {caption}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {showLogo && (
              <div data-canvas-logo className="flex items-center gap-2" style={{ opacity: 0.4, position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)" }}>
                <svg viewBox="0 0 512 512" width={20} height={20} fill={textColor}>
                  <path d="M148.02,363.76c-4.48,0-8.64-2.42-10.86-6.32l-54.29-95.68c-2.15-3.8-2.15-8.52,0-12.32l54.29-95.68c2.21-3.9,6.37-6.32,10.86-6.32h18.51c4.44,0,8.45,2.28,10.73,6.09,2.27,3.82,2.37,8.43.25,12.33l-42.23,77.99c-3.98,7.36-3.98,16.14,0,23.49l22.22,41.02c4.25,7.85,12.43,12.8,21.36,12.92,0,0,45.08.61,45.11.61,8.68,0,16.83-4.64,21.26-12.12l24.87-41.99c2.23-3.77,6.34-6.11,10.72-6.12l19.47-.04c4.48,0,8.49,2.29,10.76,6.12,2.27,3.83,2.35,8.45.21,12.35l-42.2,77.17c-2.19,4-6.39,6.49-10.95,6.49h-110.08Z" />
                  <path d="M346.7,363.69c-4.44,0-8.45-2.28-10.73-6.09-2.27-3.82-2.37-8.43-.25-12.33l42.23-77.99c3.98-7.35,3.98-16.14,0-23.49l-22.22-41.02c-4.25-7.85-12.44-12.8-21.36-12.92,0,0-46.51-.63-46.53-.63-8.88,0-17.12,4.81-21.48,12.54l-23.35,41.36c-2.2,3.9-6.36,6.34-10.84,6.35l-19.21.04c-4.48,0-8.49-2.29-10.76-6.12-2.27-3.83-2.35-8.45-.22-12.36l42.2-77.17c2.19-4.01,6.39-6.5,10.95-6.5h110.08c4.48,0,8.64,2.42,10.86,6.32l54.29,95.68c2.16,3.8,2.16,8.52,0,12.32l-54.29,95.68c-2.21,3.9-6.37,6.32-10.86,6.32h-18.51Z" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 500, color: textColor, fontFamily: "var(--font-geist-mono), ui-monospace, monospace", letterSpacing: "0.02em" }}>shieldcn.dev</span>
              </div>
            )}
          </div>
        </div>

        <p className="text-center font-mono text-[11px] text-zinc-600">
          {isTight ? "Tight crop — canvas fits the cluster" : `${p.width}×${p.height}`}
          {hasAnimated
            ? " · saves the whole canvas as an MP4 video (X-ready)"
            : " · exported at 2×"}
        </p>
      </div>
    </div>
  )
}
