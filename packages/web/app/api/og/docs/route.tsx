/**
 * shieldcn
 * app/api/og/docs/route.tsx
 *
 * Dynamic OG image for docs pages. Renders the page title, description,
 * and the page's badge (fetched from the badge frontmatter URL).
 *
 * Usage: /api/og/docs?title=npm&description=...&badge=/npm/react.svg?variant=branded&path=/docs/badges/npm
 */

import { ImageResponse } from "next/og"
import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

export const runtime = "nodejs"

// ---------------------------------------------------------------------------
// Font loading — mirrors packages/core/src/badges/render.tsx strategy
// ---------------------------------------------------------------------------

function findGeistFont(): Buffer {
  const filename = "geist-medium.ttf"
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..", "core", "src", "fonts"),
    join(process.cwd(), "packages", "core", "src", "fonts"),
    join(process.cwd(), "..", "core", "src", "fonts"),
    join(process.cwd(), "lib", "fonts"),
  ]
  for (const dir of candidates) {
    const p = join(dir, filename)
    if (existsSync(p)) return readFileSync(p)
  }
  throw new Error(`Could not find ${filename}. Searched: ${candidates.join(", ")}`)
}

let fontData: ArrayBuffer | null = null

function getFont(): ArrayBuffer {
  if (fontData) return fontData
  const buf = findGeistFont()
  fontData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  return fontData
}

// ---------------------------------------------------------------------------
// Logo SVG path data
// ---------------------------------------------------------------------------

const LOGO_PATH_1 = "M148.02,363.76c-4.48,0-8.64-2.42-10.86-6.32l-54.29-95.68c-2.15-3.8-2.15-8.52,0-12.32l54.29-95.68c2.21-3.9,6.37-6.32,10.86-6.32h18.51c4.44,0,8.45,2.28,10.73,6.09,2.27,3.82,2.37,8.43.25,12.33l-42.23,77.99c-3.98,7.36-3.98,16.14,0,23.49l22.22,41.02c4.25,7.85,12.43,12.8,21.36,12.92,0,0,45.08.61,45.11.61,8.68,0,16.83-4.64,21.26-12.12l24.87-41.99c2.23-3.77,6.34-6.11,10.72-6.12l19.47-.04c4.48,0,8.49,2.29,10.76,6.12,2.27,3.83,2.35,8.45.21,12.35l-42.2,77.17c-2.19,4-6.39,6.49-10.95,6.49h-110.08Z"
const LOGO_PATH_2 = "M346.7,363.69c-4.44,0-8.45-2.28-10.73-6.09-2.27-3.82-2.37-8.43-.25-12.33l42.23-77.99c3.98-7.35,3.98-16.14,0-23.49l-22.22-41.02c-4.25-7.85-12.44-12.8-21.36-12.92,0,0-46.51-.63-46.53-.63-8.88,0-17.12,4.81-21.48,12.54l-23.35,41.36c-2.2,3.9-6.36,6.34-10.84,6.35l-19.21.04c-4.48,0-8.49-2.29-10.76-6.12-2.27-3.83-2.35-8.45-.22-12.36l42.2-77.17c2.19-4.01,6.39-6.5,10.95-6.5h110.08c4.48,0,8.64,2.42,10.86,6.32l54.29,95.68c2.16,3.8,2.16,8.52,0,12.32l-54.29,95.68c-2.21,3.9-6.37,6.32-10.86,6.32h-18.51Z"

// ---------------------------------------------------------------------------
// Badge fetch with timeout + safety
// ---------------------------------------------------------------------------

const BADGE_FETCH_TIMEOUT_MS = 5_000

async function fetchBadgeDataUri(badge: string): Promise<string | null> {
  try {
    const badgeUrl = badge.startsWith("http")
      ? badge
      : `https://shieldcn.dev${badge}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), BADGE_FETCH_TIMEOUT_MS)
    const res = await fetch(badgeUrl, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const svgText = await res.text()
    // Sanity check — must look like SVG
    if (!svgText.includes("<svg")) return null
    return `data:image/svg+xml;base64,${Buffer.from(svgText).toString("base64")}`
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/** Cache the OG image for 1 hour, stale-while-revalidate for 1 day */
export const revalidate = 3600

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get("title") || "shieldcn"
  const description = searchParams.get("description") || ""
  const badge = searchParams.get("badge") || ""
  const pathDisplay = searchParams.get("path") || "/docs"

  const font = getFont()

  // Fetch badge in parallel with nothing — just keeping it clean
  const badgeDataUri = badge ? await fetchBadgeDataUri(badge) : null

  // Truncate long strings to prevent overflow
  const safeTitle = title.length > 60 ? title.slice(0, 57) + "…" : title
  const safeDesc = description.length > 120 ? description.slice(0, 117) + "…" : description

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#09090b",
          fontFamily: "Geist",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Gradient glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 600,
            height: 600,
            display: "flex",
            borderRadius: 300,
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            padding: "60px 72px",
            position: "relative",
          }}
        >
          {/* Top: Logo + branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 512 512"
              fill="rgba(250,250,250,0.5)"
            >
              <path d={LOGO_PATH_1} />
              <path d={LOGO_PATH_2} />
            </svg>
            <span style={{ color: "rgba(250,250,250,0.5)", fontSize: 22, letterSpacing: "-0.02em" }}>
              shieldcn
            </span>
          </div>

          {/* Middle: Title + badge */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <span
                style={{
                  color: "#fafafa",
                  fontSize: 64,
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                {safeTitle}
              </span>
              {badgeDataUri && (
                // eslint-disable-next-line @next/next/no-img-element -- satori/ImageResponse JSX; next/image is not available in OG image generation
                <img
                  src={badgeDataUri}
                  height={40}
                  alt=""
                />
              )}
            </div>
            {safeDesc && (
              <span
                style={{
                  color: "rgba(250,250,250,0.5)",
                  fontSize: 26,
                  lineHeight: 1.4,
                  maxWidth: 800,
                }}
              >
                {safeDesc}
              </span>
            )}
          </div>

          {/* Bottom: URL path */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                color: "rgba(250,250,250,0.3)",
                fontSize: 18,
                letterSpacing: "0.02em",
              }}
            >
              shieldcn.dev{pathDisplay}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Geist",
          data: font,
          weight: 500,
          style: "normal",
        },
      ],
    },
  )

  // Add cache headers for CDN / Vercel edge cache
  response.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
  )

  return response
}
