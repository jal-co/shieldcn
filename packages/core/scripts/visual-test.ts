/**
 * @shieldcn/core
 * scripts/visual-test.ts
 *
 * Renders a visual consistency matrix by calling renderBadge() directly.
 * Every badge is inlined as a base64 data URI — zero HTTP requests.
 * Badges that fail contrast/visibility checks are highlighted with a red border.
 *
 * Usage:
 *   cd packages/core
 *   pnpm dlx tsx scripts/visual-test.ts
 *   open visual-test.html
 */

import { renderBadge } from "../src/badges/render"
import { resolveTheme, applyColorOverrides, type ThemeName } from "../src/badges/themes"
import type { BadgeConfig, BadgeStyle, BadgeSize } from "../src/badges/types"
import type { BadgeFont } from "../src/badges/render"
import { getButtonSize } from "../src/badges/button-tokens"
import { writeFileSync } from "node:fs"

const VARIANTS: BadgeStyle[] = ["default", "secondary", "outline", "ghost", "destructive", "branded"]
const THEMES: ThemeName[] = ["zinc", "slate", "blue", "green", "rose", "orange", "violet", "purple", "cyan", "emerald"]
const MODES = ["dark", "light"] as const
const FONTS: BadgeFont[] = ["inter", "geist", "geist-mono", "jetbrains-mono", "fira-code", "roboto", "space-grotesk"]
const SIZES: BadgeSize[] = ["xs", "sm", "default", "lg"]

// ---------------------------------------------------------------------------
// Color / contrast utilities
// ---------------------------------------------------------------------------

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "")
  if (h.length !== 6) return null
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null
  return [r, g, b]
}

function parseRgba(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (!m) return null
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] ? parseFloat(m[4]) : 1]
}

function parseColor(color: string): [number, number, number, number] | null {
  if (color === "transparent") return [0, 0, 0, 0]
  const rgba = parseRgba(color)
  if (rgba) return rgba
  const hex = parseHex(color)
  if (hex) return [hex[0], hex[1], hex[2], 1]
  return null
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [sr, sg, sb] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb
}

function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

function composite(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): [number, number, number] {
  const a = fg[3]
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ]
}

function extractFills(svg: string): { bg: string[]; text: string[] } {
  const bg: string[] = []
  const text: string[] = []
  const re = /fill="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg)) !== null) {
    const fill = m[1]
    if (fill === "none") continue
    // Skip mask fills — Satori wraps content in <mask><path fill="#fff">.
    // Detect by checking if this fill is inside a <mask> element.
    const before = svg.substring(Math.max(0, m.index - 200), m.index)
    if (before.includes("<mask") && !before.includes("</mask")) continue
    // Skip clip-path definitions
    if (before.includes("<clipPath") && !before.includes("</clipPath")) continue
    // Heuristic: large rect paths (badge bg / segment bg) have simple d like "M0 0H54V32H0z".
    // Text paths are complex with curves. Check the d attribute length after this fill.
    const afterFill = svg.substring(m.index, m.index + 300)
    const dMatch = afterFill.match(/d="([^"]+)"/)
    if (dMatch) {
      const dLen = dMatch[1].length
      // Short d = rectangle/bg shape (incl. rounded rect with arcs).
      // Long d = text glyph. Rounded rects are typically <120 chars.
      if (dLen < 120) {
        bg.push(fill)
      } else {
        text.push(fill)
      }
    }
  }
  return { bg, text }
}

// ---------------------------------------------------------------------------
// Check a single SVG for issues
// ---------------------------------------------------------------------------

interface Issue {
  severity: "error" | "warn"
  message: string
}

function checkSvg(svg: string, expectedBg: "dark" | "light" | "transparent"): Issue[] {
  const issues: Issue[] = []
  const { bg, text } = extractFills(svg)
  if (text.length === 0) return issues

  const pageBg: [number, number, number, number] = expectedBg === "light"
    ? [250, 250, 250, 1] : [9, 9, 11, 1]

  // Build effective bg colors (composited over page bg)
  const effectiveBgs = bg.length > 0
    ? bg.map(fill => {
        if (fill.startsWith("url(")) return null
        const c = parseColor(fill)
        if (!c || c[3] === 0) return pageBg
        const comp = composite(c, pageBg)
        return [comp[0], comp[1], comp[2], 1] as [number, number, number, number]
      }).filter(Boolean) as [number, number, number, number][]
    : [pageBg]

  if (effectiveBgs.length === 0) return issues

  for (const fill of text) {
    if (fill.startsWith("url(")) continue
    const fgColor = parseColor(fill)
    if (!fgColor) continue

    // Check text against every bg segment — text sits on one segment,
    // but we don't know which, so pass if it contrasts with any.
    let bestRatio = 0
    let bestBgLabel = ""
    for (const ebg of effectiveBgs) {
      const effectiveFg = composite(fgColor, ebg)
      const fgLum = relativeLuminance(effectiveFg[0], effectiveFg[1], effectiveFg[2])
      const bgLum = relativeLuminance(ebg[0], ebg[1], ebg[2])
      const ratio = contrastRatio(fgLum, bgLum)
      if (ratio > bestRatio) {
        bestRatio = ratio
        bestBgLabel = `rgb(${ebg[0]},${ebg[1]},${ebg[2]})`
      }
    }

    if (bestRatio < 2.0) {
      issues.push({ severity: "error", message: `${bestRatio.toFixed(1)}:1 — ${fill} on ${bestBgLabel}` })
    } else if (bestRatio < 3.0) {
      issues.push({ severity: "warn", message: `${bestRatio.toFixed(1)}:1 — ${fill} on ${bestBgLabel}` })
    }
  }
  return issues
}

// ---------------------------------------------------------------------------
// Badge rendering + checking
// ---------------------------------------------------------------------------

let total = 0
let errorCount = 0
let warnCount = 0

function makeConfig(overrides: Partial<BadgeConfig> & { theme?: string; colorOverride?: string }): BadgeConfig {
  const mode = overrides.mode ?? "dark"
  const theme = overrides.theme
  const style = overrides.style ?? "default"
  let colors = resolveTheme(theme)
  if (overrides.colorOverride) {
    colors = applyColorOverrides(colors, { color: overrides.colorOverride })
  }
  return {
    label: overrides.label ?? "npm",
    value: overrides.value ?? "v19.1.0",
    style,
    colors,
    mode,
    hasThemeOverride: !!(theme || overrides.colorOverride),
    font: overrides.font,
    size: overrides.size,
    split: overrides.split,
    statusDot: overrides.statusDot,
    statusColor: overrides.statusColor,
    gradient: overrides.gradient,
    brandColor: overrides.brandColor ?? (style === "branded" ? "CB3837" : undefined),
  }
}

async function img(
  config: Partial<BadgeConfig> & { theme?: string; colorOverride?: string },
  expectedBg: "dark" | "light" | "transparent",
): Promise<string> {
  const cfg = makeConfig(config)
  const svg = await renderBadge(cfg)
  total++

  const issues = checkSvg(svg, expectedBg)
  const errors = issues.filter(i => i.severity === "error")
  const warns = issues.filter(i => i.severity === "warn")
  errorCount += errors.length
  warnCount += warns.length

  const b64 = Buffer.from(svg).toString("base64")
  const hasProblem = errors.length > 0 || warns.length > 0
  const cls = errors.length > 0 ? "err" : warns.length > 0 ? "wrn" : ""
  const tooltip = issues.map(i => `[${i.severity}] ${i.message}`).join("\n")
  const title = tooltip ? ` title="${tooltip.replace(/"/g, "&quot;")}"` : ""

  // Build the full props object — always include variant + mode for identification
  const props: Record<string, string | boolean> = {}
  props.variant = config.style ?? "default"
  props.mode = config.mode ?? "dark"
  if (config.theme) props.theme = config.theme
  if (config.font) props.font = config.font
  if (config.size) props.size = config.size
  if (config.split) props.split = true
  if (config.statusDot) props.statusDot = true
  if (config.statusColor) props.statusColor = config.statusColor
  if (config.gradient) props.gradient = config.gradient
  if (config.brandColor) props.brandColor = config.brandColor
  if (config.colorOverride) props.color = config.colorOverride
  if (config.label && config.label !== "npm") props.label = config.label
  if (config.value && config.value !== "v19.1.0") props.value = config.value
  // Include the check results
  props._issues = issues.map(i => `${i.severity}: ${i.message}`).join(" | ") as any
  const propsJson = JSON.stringify(props)
  const escapedProps = propsJson.replace(/"/g, "&quot;").replace(/'/g, "&#39;")

  const copyBtn = hasProblem
    ? `<button class="cp" onclick="cp(this,'${escapedProps}')" title="Copy config">📋</button>`
    : ""

  return `<span class="b ${cls}"${title}><img src="data:image/svg+xml;base64,${b64}"/>${copyBtn}</span>`
}

// ---------------------------------------------------------------------------
// Build HTML
// ---------------------------------------------------------------------------

async function renderAll(): Promise<string> {
  const s: string[] = []

  // 1. Variant × Mode
  {
    let rows = ""
    for (const v of VARIANTS) {
      let c = `<td class=m>${v}</td>`
      for (const m of MODES) {
        const bg = (v === "outline" || v === "ghost") ? "transparent" : m
        c += `<td class=bg-${m}>${await img({ style: v, mode: m }, bg as any)}</td>`
      }
      for (const m of MODES) {
        c += `<td class=bg-${m}>${await img({ style: v, mode: m, split: true }, m)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>1. Variant × Mode</h2>
      <table><tr><th>Variant</th><th>dark</th><th>light</th><th>dark split</th><th>light split</th></tr>${rows}</table>`)
  }

  // 2. Variant × Theme (dark)
  {
    let rows = ""
    for (const t of THEMES) {
      let c = `<td class=m>${t}</td>`
      for (const v of VARIANTS) {
        const bg = (v === "outline" || v === "ghost") ? "transparent" : "dark"
        c += `<td class=bg-dark>${await img({ style: v, mode: "dark", theme: t }, bg as any)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>2. Variant × Theme (dark)</h2>
      <table><tr><th>Theme</th>${VARIANTS.map(v=>`<th>${v}</th>`).join("")}</tr>${rows}</table>`)
  }

  // 3. Variant × Theme (light)
  {
    let rows = ""
    for (const t of THEMES) {
      let c = `<td class=m>${t}</td>`
      for (const v of VARIANTS) {
        const bg = (v === "outline" || v === "ghost") ? "transparent" : "light"
        c += `<td class=bg-light>${await img({ style: v, mode: "light", theme: t }, bg as any)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>3. Variant × Theme (light)</h2>
      <table><tr><th>Theme</th>${VARIANTS.map(v=>`<th>${v}</th>`).join("")}</tr>${rows}</table>`)
  }

  // 4. Font × Variant (dark)
  {
    let rows = ""
    for (const f of FONTS) {
      let c = `<td class=m>${f}</td>`
      for (const v of VARIANTS) {
        const bg = (v === "outline" || v === "ghost") ? "transparent" : "dark"
        c += `<td class=bg-dark>${await img({ style: v, mode: "dark", font: f }, bg as any)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>4. Font × Variant (dark)</h2>
      <table><tr><th>Font</th>${VARIANTS.map(v=>`<th>${v}</th>`).join("")}</tr>${rows}</table>`)
  }

  // 5. Font × Variant (light)
  {
    let rows = ""
    for (const f of FONTS) {
      let c = `<td class=m>${f}</td>`
      for (const v of VARIANTS) {
        const bg = (v === "outline" || v === "ghost") ? "transparent" : "light"
        c += `<td class=bg-light>${await img({ style: v, mode: "light", font: f }, bg as any)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>5. Font × Variant (light)</h2>
      <table><tr><th>Font</th>${VARIANTS.map(v=>`<th>${v}</th>`).join("")}</tr>${rows}</table>`)
  }

  // 6. Size × Variant
  {
    let rows = ""
    for (const sz of SIZES) {
      let c = `<td class=m>${sz}</td>`
      for (const v of VARIANTS) {
        const bg = (v === "outline" || v === "ghost") ? "transparent" : "dark"
        c += `<td class=bg-dark>${await img({ style: v, mode: "dark", size: sz }, bg as any)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>6. Size × Variant (dark)</h2>
      <table><tr><th>Size</th>${VARIANTS.map(v=>`<th>${v}</th>`).join("")}</tr>${rows}</table>`)
  }

  // 7. CI status
  {
    let rows = ""
    for (const v of VARIANTS) {
      let c = `<td class=m>${v}</td>`
      for (const [status, color] of [["passing","#16a34a"],["failing","#dc2626"],["pending","#d97706"]]) {
        for (const m of MODES) {
          const isTrans = v === "outline" || v === "ghost"
          const bg = isTrans ? "transparent" : m
          c += `<td class=bg-${m}>${await img({ label:"CI", value:status, style:v, mode:m, statusDot:true, statusColor:color }, bg as any)}</td>`
        }
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>7. CI Status × Variant × Mode</h2>
      <table><tr><th>Variant</th><th>pass◗</th><th>pass◖</th><th>fail◗</th><th>fail◖</th><th>pend◗</th><th>pend◖</th></tr>${rows}</table>`)
  }

  // 8. Gradient
  {
    const grads = [
      ["warm", "linear-gradient(135deg, #ff6b6b, #4ecdc4)"],
      ["purple", "linear-gradient(90deg, #667eea, #764ba2)"],
      ["sunset", "linear-gradient(90deg, #f97316, #ec4899)"],
    ]
    let rows = ""
    for (const v of VARIANTS) {
      let c = `<td class=m>${v}</td>`
      for (const [, grad] of grads) {
        for (const m of MODES) {
          c += `<td class=bg-${m}>${await img({ style:v, mode:m, gradient:grad }, m)}</td>`
        }
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>8. Gradient × Variant × Mode</h2>
      <table><tr><th>Variant</th>${grads.flatMap(([n])=>[`<th>${n}◗</th>`,`<th>${n}◖</th>`]).join("")}</tr>${rows}</table>`)
  }

  // 9. Custom color on outline/ghost
  {
    const colors = ["e11d48","7c3aed","2563eb","16a34a","fbbf24"]
    let rows = ""
    for (const v of ["outline","ghost"] as BadgeStyle[]) {
      let c = `<td class=m>${v}</td>`
      for (const color of colors) {
        for (const m of MODES) {
          c += `<td class=bg-${m}>${await img({ label:"label", value:"value", style:v, mode:m, colorOverride:color }, "transparent")}</td>`
        }
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>9. Custom Color on Outline / Ghost</h2>
      <table><tr><th>Variant</th>${colors.flatMap(c=>[`<th>#${c}◗</th>`,`<th>#${c}◖</th>`]).join("")}</tr>${rows}</table>`)
  }

  // 10. Brand color contrast
  {
    const brands = ["CB3837","2563eb","16a34a","fbbf24","f97316","000000","ffffff","84cc16"]
    let rows = ""
    for (const color of brands) {
      let c = `<td class=m>#${color}</td>`
      for (const m of MODES) {
        c += `<td class=bg-${m}>${await img({ label:"brand", value:"test", style:"branded", mode:m, brandColor:color }, m)}</td>`
      }
      for (const m of MODES) {
        c += `<td class=bg-${m}>${await img({ label:"brand", value:"test", style:"branded", mode:m, brandColor:color, split:true }, m)}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>10. Brand Color Contrast</h2>
      <table><tr><th>Color</th><th>dark</th><th>light</th><th>dark split</th><th>light split</th></tr>${rows}</table>`)
  }

  // 11. Theme × Split (dark)
  {
    let rows = ""
    for (const t of THEMES) {
      let c = `<td class=m>${t}</td>`
      for (const v of ["default","secondary","outline","branded"] as BadgeStyle[]) {
        c += `<td class=bg-dark>${await img({ style:v, mode:"dark", theme:t, split:true }, "dark")}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>11. Theme × Split (dark)</h2>
      <table><tr><th>Theme</th><th>default</th><th>secondary</th><th>outline</th><th>branded</th></tr>${rows}</table>`)
  }

  // 12. Theme × Split (light)
  {
    let rows = ""
    for (const t of THEMES) {
      let c = `<td class=m>${t}</td>`
      for (const v of ["default","secondary","outline","branded"] as BadgeStyle[]) {
        c += `<td class=bg-light>${await img({ style:v, mode:"light", theme:t, split:true }, "light")}</td>`
      }
      rows += `<tr>${c}</tr>`
    }
    s.push(`<h2>12. Theme × Split (light)</h2>
      <table><tr><th>Theme</th><th>default</th><th>secondary</th><th>outline</th><th>branded</th></tr>${rows}</table>`)
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>shieldcn visual test</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:32px;background:#111;color:#e4e4e7}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:15px;margin:28px 0 8px;color:#a1a1aa}
.sub{font-size:12px;color:#52525b;margin-bottom:20px}
.legend{display:flex;gap:16px;font-size:11px;color:#71717a;margin-bottom:20px}
.legend span{display:inline-flex;align-items:center;gap:4px}
.legend .swatch{width:12px;height:12px;border-radius:2px;display:inline-block}
.summary{font-size:13px;margin-bottom:16px;padding:12px 16px;border-radius:6px}
.summary.ok{background:#052e16;color:#4ade80;border:1px solid #166534}
.summary.bad{background:#450a0a;color:#fca5a5;border:1px solid #991b1b}
table{border-collapse:collapse;margin-bottom:4px}
th{padding:4px 8px;font-size:10px;font-weight:500;color:#52525b;text-align:center;border-bottom:1px solid #222}
th:first-child{text-align:left}
td{padding:6px 8px;vertical-align:middle;border-bottom:1px solid #1a1a1e}
td img{display:block}
.m{font-family:"SF Mono","Fira Code",monospace;font-size:10px;color:#71717a;white-space:nowrap}
.bg-dark{background:#09090b}
.bg-light{background:#fafafa}
.b{display:inline-block;border-radius:4px;padding:2px;border:2px solid transparent}
.b.err{border-color:#ef4444;background:rgba(239,68,68,0.1)}
.b.wrn{border-color:#eab308;background:rgba(234,179,8,0.08)}
.b.err img,.b.wrn img{cursor:help}
.b{position:relative}
.cp{position:absolute;top:-8px;right:-8px;width:18px;height:18px;border-radius:4px;border:1px solid #333;background:#1a1a1e;color:#a1a1aa;font-size:10px;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;line-height:1}
.b:hover .cp{display:flex}
.cp:hover{background:#27272a;color:#fff}
.cp.ok{background:#166534;color:#4ade80;border-color:#166534}
</style>
<script>
function cp(btn, json) {
  navigator.clipboard.writeText(json).then(() => {
    btn.classList.add('ok');
    btn.textContent = '\u2713';
    setTimeout(() => { btn.classList.remove('ok'); btn.textContent = '\ud83d\udccb'; }, 1200);
  });
}
</script>
</head><body>
<h1>shieldcn — Visual Consistency Matrix</h1>
<p class=sub>${total} badges · ${new Date().toISOString().split("T")[0]} · ◗ = dark · ◖ = light</p>
<div class=legend>
  <span><span class=swatch style="border:2px solid #ef4444;background:rgba(239,68,68,0.1)"></span> contrast &lt; 2:1 (error)</span>
  <span><span class=swatch style="border:2px solid #eab308;background:rgba(234,179,8,0.08)"></span> contrast &lt; 3:1 (warning)</span>
  <span><span class=swatch style="border:2px solid transparent"></span> pass</span>
  <span>hover for details</span>
</div>
<div class="summary ${errorCount > 0 ? "bad" : "ok"}">
  ${errorCount > 0
    ? `❌ ${errorCount} errors, ${warnCount} warnings across ${total} badges`
    : `✅ All ${total} badges pass contrast checks`}
</div>
${s.join("\n")}
</body></html>`
}

async function main() {
  console.log("Rendering...")
  const html = await renderAll()
  writeFileSync("visual-test.html", html)
  console.log(`✓ ${total} badges → visual-test.html`)
  console.log(`  ${errorCount} errors, ${warnCount} warnings`)
  if (errorCount > 0) console.log(`  ❌ Failing badges highlighted in red — hover for details`)
  else console.log(`  ✅ All clear`)
}

main().catch(e => { console.error(e); process.exit(1) })
