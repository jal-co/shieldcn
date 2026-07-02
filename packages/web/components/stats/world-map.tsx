/**
 * shieldcn
 * components/stats/world-map
 *
 * Visitor-by-country choropleth for the /stats page (bklit-ui). Joins
 * OpenPanel country stats (ISO alpha-2) to world-atlas TopoJSON features
 * (ISO numeric ids) and shades each country on the site's sequential
 * --chart-scale ramp using quantile bins, so a handful of huge markets
 * don't wash out the long tail.
 */

"use client"

import { useEffect, useMemo, useState } from "react"
import * as topojson from "topojson-client"
import type { Topology, GeometryCollection } from "topojson-specification"
import type { FeatureCollection } from "geojson"
import {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethGraticule,
  ChoroplethTooltip,
  type ChoroplethFeature,
} from "@/components/charts"
import { ISO2_TO_NUMERIC } from "@/lib/country-codes"
import type { CountryStat } from "@/lib/openpanel-insights"

/* ─────────────────────────────────────────────────────────
 * MAP CONFIG
 *
 * 5 quantile bins over the sequential scale; countries with
 * no sessions use --muted. Map data lazy-loads client-side
 * (world-atlas 110m ≈ 100KB) so it never blocks the page.
 * ───────────────────────────────────────────────────────── */

const SCALE = [
  "var(--chart-scale-01)",
  "var(--chart-scale-02)",
  "var(--chart-scale-03)",
  "var(--chart-scale-04)",
  "var(--chart-scale-05)",
] as const

const EMPTY_FILL = "var(--muted)"

export function WorldMap({ countries }: { countries: CountryStat[] }) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null)

  useEffect(() => {
    let cancelled = false
    import("world-atlas/countries-110m.json").then((mod) => {
      if (cancelled) return
      const topology = mod.default as unknown as Topology<{
        countries: GeometryCollection<{ name?: string }>
      }>
      setGeojson(
        topojson.feature(topology, topology.objects.countries) as FeatureCollection,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  // numeric country id -> sessions
  const sessionsById = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of countries) {
      const id = ISO2_TO_NUMERIC[c.name]
      if (id) map.set(id, (map.get(id) ?? 0) + c.sessions)
    }
    return map
  }, [countries])

  // Quantile thresholds over countries that actually have traffic.
  const thresholds = useMemo(() => {
    const values = [...sessionsById.values()].sort((a, b) => a - b)
    if (values.length === 0) return []
    return SCALE.map(
      (_, i) => values[Math.min(values.length - 1, Math.floor(((i + 1) / SCALE.length) * values.length))] ?? 0,
    )
  }, [sessionsById])

  const valueOf = (feature: ChoroplethFeature) =>
    sessionsById.get(String(feature.id)) ?? 0

  const colorOf = (feature: ChoroplethFeature) => {
    const v = valueOf(feature)
    if (v === 0) return EMPTY_FILL
    const bin = thresholds.findIndex((t) => v <= t)
    return SCALE[bin === -1 ? SCALE.length - 1 : bin]
  }

  if (!geojson) {
    return (
      <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    )
  }

  return (
    <ChoroplethChart
      data={geojson as React.ComponentProps<typeof ChoroplethChart>["data"]}
      aspectRatio="16 / 9"
    >
      <ChoroplethGraticule stroke="color-mix(in oklch, var(--chart-grid) 40%, transparent)" />
      <ChoroplethFeatureComponent getFeatureColor={colorOf} stroke="var(--chart-grid)" />
      <ChoroplethTooltip valueLabel="Sessions" getFeatureValue={valueOf} />
    </ChoroplethChart>
  )
}
