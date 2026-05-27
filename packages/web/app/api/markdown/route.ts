/**
 * shieldcn
 * app/api/markdown/route.ts
 *
 * Serves llms.txt / llms-full.txt as text/markdown for agent content negotiation.
 * The middleware rewrites to this route when Accept: text/markdown is detected.
 *
 * Query params:
 *   ?full=1 — serve llms-full.txt instead of llms.txt
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

export function GET(request: Request) {
  const url = new URL(request.url)
  const full = url.searchParams.get("full") === "1"
  const filename = full ? "llms-full.txt" : "llms.txt"

  try {
    const content = readFileSync(join(process.cwd(), "public", filename), "utf-8")

    return new Response(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    })
  } catch {
    return new Response("# shieldcn\n\nMarkdown content not available.", {
      status: 404,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    })
  }
}
