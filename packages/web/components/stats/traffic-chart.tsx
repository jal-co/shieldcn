/**
 * shieldcn
 * components/stats/traffic-chart
 *
 * Interactive area chart for the /stats page (bklit-ui). One component,
 * two configurations — website traffic (pageviews + visitors) and badge
 * traffic (renders/day with a dashed tail for the in-progress day).
 */

"use client"

import {
  AreaChart,
  Area,
  Grid,
  XAxis,
  ChartTooltip,
} from "@/components/charts"

/* ─────────────────────────────────────────────────────────
 * CHART CONFIG
 *
 * Series colors come from the site's --chart-N scale so both
 * charts stay theme-aware. The badge chart dashes its final
 * point: today is still accumulating.
 * ───────────────────────────────────────────────────────── */

const CONFIG = {
  fillOpacity: 0.3, // gradient strength at the top of each area
  strokeWidth: 2, //   series line weight
  xTicks: 15, //       x-axis labels (denser — ~every other day)
  gridRows: 8, //      horizontal gridlines (denser value scale)
  gridCols: 30, //     vertical gridlines (one per day)
  aspect: "32 / 9", //  wide + dense now the page is full-bleed
  reveal: 900, //      clip-reveal duration (ms)
} as const

export interface TrafficPoint {
  /** ISO date string — serializable across the RSC boundary. */
  date: string
  pageviews: number
  visitors: number
}

export function TrafficChart({ points }: { points: TrafficPoint[] }) {
  const data = points.map((p) => ({ ...p, date: new Date(p.date) }))

  return (
    <AreaChart data={data} animationDuration={CONFIG.reveal} aspectRatio={CONFIG.aspect}>
      <Grid horizontal vertical numTicksRows={CONFIG.gridRows} numTicksColumns={CONFIG.gridCols} />
      <Area
        dataKey="pageviews"
        fill="var(--chart-1)"
        fillOpacity={CONFIG.fillOpacity}
        strokeWidth={CONFIG.strokeWidth}
        fadeEdges
      />
      <Area
        dataKey="visitors"
        fill="var(--chart-2)"
        fillOpacity={CONFIG.fillOpacity}
        strokeWidth={CONFIG.strokeWidth}
        fadeEdges
      />
      <XAxis numTicks={CONFIG.xTicks} />
      <ChartTooltip />
    </AreaChart>
  )
}

export interface BadgePoint {
  date: string
  badges: number
}

export function BadgesChart({ points }: { points: BadgePoint[] }) {
  const data = points.map((p) => ({ ...p, date: new Date(p.date) }))

  return (
    <AreaChart data={data} animationDuration={CONFIG.reveal} aspectRatio={CONFIG.aspect}>
      <Grid horizontal vertical numTicksRows={CONFIG.gridRows} numTicksColumns={CONFIG.gridCols} />
      <Area
        dataKey="badges"
        fill="var(--chart-3)"
        fillOpacity={CONFIG.fillOpacity}
        strokeWidth={CONFIG.strokeWidth}
        fadeEdges
        // Today's count is still accumulating — draw it as a projection.
        dashFromIndex={Math.max(0, data.length - 2)}
      />
      <XAxis numTicks={CONFIG.xTicks} />
      <ChartTooltip />
    </AreaChart>
  )
}
