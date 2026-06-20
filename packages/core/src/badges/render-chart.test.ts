/**
 * shieldcn
 * src/badges/render-chart.test
 */

import { describe, it, expect } from "vitest"
import { renderChart, resolveAccent, type ChartPoint } from "./render-chart"

function synth(n: number): ChartPoint[] {
  const pts: ChartPoint[] = []
  let value = 0
  const start = new Date("2022-01-01").getTime()
  for (let i = 0; i < n; i++) {
    value += 100 + i * 7
    pts.push({ date: new Date(start + i * 86400000 * 30).toISOString(), value })
  }
  return pts
}

describe("renderChart", () => {
  it("produces a valid SVG in both modes", () => {
    const pts = synth(30)
    for (const mode of ["dark", "light"] as const) {
      const svg = renderChart({
        title: "vercel/next.js",
        subtitle: "12k stars",
        series: [{ label: "next.js", points: pts, color: resolveAccent("blue", null) }],
        width: 800,
        height: 400,
        mode,
        area: true,
      })
      expect(svg.startsWith("<svg")).toBe(true)
      expect(svg.includes("</svg>")).toBe(true)
      expect(svg).toContain("linearGradient")
      expect(svg).toContain("vercel/next.js")
      // no NaN leaked into coordinates
      expect(svg).not.toContain("NaN")
    }
  })

  it("handles a single point gracefully (degenerate domain)", () => {
    const svg = renderChart({
      title: "a/b",
      series: [{ label: "b", points: [{ date: new Date().toISOString(), value: 1 }], color: "#3b82f6" }],
      width: 600,
      height: 300,
      mode: "dark",
      area: true,
    })
    expect(svg).not.toContain("NaN")
    expect(svg.includes("</svg>")).toBe(true)
  })

  it("escapes title text", () => {
    const svg = renderChart({
      title: "<script>&\"",
      series: [],
      width: 400,
      height: 200,
      mode: "dark",
      area: false,
    })
    expect(svg).not.toContain("<script>")
    expect(svg).toContain("&lt;script&gt;")
  })

  it("renders an index axis when points have no dates", () => {
    const svg = renderChart({
      title: "inline",
      series: [{ label: "v", points: [10, 25, 40, 30, 60].map((value) => ({ value })), color: "#3b82f6" }],
      width: 600,
      height: 300,
      mode: "dark",
      area: true,
    })
    expect(svg).not.toContain("NaN")
    expect(svg.includes("</svg>")).toBe(true)
    // index axis labels start at 1
    expect(svg).toContain(">1<")
  })

  it("supports log scale and custom y-domain / tick counts", () => {
    const pts = [1, 10, 100, 1000, 10000].map((value, i) => ({
      date: new Date(2022, 0, 1 + i).toISOString(),
      value,
    }))
    const svg = renderChart({
      title: "log",
      series: [{ label: "v", points: pts, color: "#3b82f6" }],
      width: 700,
      height: 350,
      mode: "dark",
      area: true,
      yScale: "log",
      yMin: 1,
      yMax: 10000,
      yTicks: 5,
      xTicks: 6,
    })
    expect(svg).not.toContain("NaN")
    expect(svg.includes("</svg>")).toBe(true)
    // 6 x-ticks + 6 y-tick labels (yTicks=5 → 6 labels) => many <text> nodes
    expect((svg.match(/<text /g) || []).length).toBeGreaterThanOrEqual(12)
  })

  it("resolveAccent honors color > theme > default", () => {
    expect(resolveAccent("blue", "ff0000")).toBe("#ff0000")
    expect(resolveAccent("blue", null)).toMatch(/^#/)
    expect(resolveAccent(null, null)).toBe("#3b82f6")
  })
})
