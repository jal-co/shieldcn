/**
 * shieldcn
 * app/api/gen-inspect/route.ts
 *
 * GitHub API proxy for the generators.
 * Forwards requests through the token pool to avoid client-side rate limits.
 *
 * POST { url: "https://api.github.com/users/jal-co" }
 * POST { url: "https://raw.githubusercontent.com/jal-co/shieldcn/HEAD/package.json" }
 * POST { url: "https://raw.githubusercontent.com/...", method: "HEAD" }
 */

import { NextResponse } from "next/server"
import { pickToken, invalidateToken } from "@shieldcn/core/token-pool"

const ALLOWED_HOSTS = [
  "api.github.com",
  "raw.githubusercontent.com",
  "registry.npmjs.org",
]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const url = body?.url as string
    const method = (body?.method as string)?.toUpperCase() || "GET"

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing url" }, { status: 400 })
    }

    // Validate host
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 })
    }
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
    }

    // Build headers — use token pool for GitHub API
    const headers: HeadersInit = {
      "User-Agent": "shieldcn-gen/1.0",
    }
    if (parsed.hostname === "api.github.com") {
      headers.Accept = "application/vnd.github.v3+json"
      const token = await pickToken()
      if (token) headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(url, { method, headers })

    // Handle token invalidation
    if (res.status === 401 && headers.Authorization) {
      const token = headers.Authorization.replace("Bearer ", "")
      await invalidateToken(token)
      // Retry without token
      delete headers.Authorization
      const retry = await fetch(url, { method, headers })
      return proxyResponse(retry, method)
    }

    return proxyResponse(res, method)
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Proxy error" },
      { status: 502 },
    )
  }
}

function proxyResponse(res: Response, method: string) {
  if (method === "HEAD") {
    return NextResponse.json({ ok: res.ok, status: res.status })
  }
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, status: res.status },
      { status: res.status },
    )
  }
  // Determine if JSON or text
  const ct = res.headers.get("content-type") || ""
  if (ct.includes("json")) {
    return res.json().then((data) => NextResponse.json({ ok: true, data }))
  }
  return res.text().then((text) => NextResponse.json({ ok: true, data: text }))
}
