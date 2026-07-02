/**
 * shieldcn
 * components/stats-area-chart
 *
 * Dependency-free SVG area chart for the /stats page. Server-rendered —
 * colors come from CSS variables so it adapts to the site theme without
 * client JS.
 */

interface StatsAreaChartProps {
  points: number[]
  /** Stroke/fill color — any CSS color, e.g. "var(--chart-1)" or a hex. */
  color: string
  /** Accessible description of the chart. */
  label: string
  height?: number
}

const W = 760

export function StatsAreaChart({ points, color, label, height = 160 }: StatsAreaChartProps) {
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>
  }

  const max = Math.max(...points, 1)
  const pad = 4
  const h = height - pad * 2
  const step = W / (points.length - 1)

  const coords = points.map((v, i) => {
    const x = i * step
    const y = pad + h - (v / max) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const line = `M${coords.join(" L")}`
  const area = `${line} L${W},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="w-full"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <path d={area} fill={color} opacity={0.15} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}
