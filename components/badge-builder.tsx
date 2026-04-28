/**
 * shieldcn
 * components/badge-builder
 *
 * Landing page badge builder. Wraps BadgeBuilderCore with
 * copy output (Markdown, HTML, URL, RST).
 */

"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BadgeBuilderCore } from "@/components/badge-builder-core"
import { cn } from "@/lib/utils"
import {
  BUILDER_DEFAULTS,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"

// ---------------------------------------------------------------------------
// Copy format helpers
// ---------------------------------------------------------------------------

type CopyFormat = "markdown" | "html" | "url" | "rst"

function formatOutput(url: string, format: CopyFormat): string {
  switch (format) {
    case "markdown": return `![badge](${url})`
    case "html": return `<img alt="badge" src="${url}">`
    case "url": return url
    case "rst": return `.. image:: ${url}\n   :alt: badge`
  }
}

const COPY_FORMATS: { value: CopyFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "url", label: "URL" },
  { value: "rst", label: "RST" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeBuilder() {
  const [s, setS] = useState<BuilderState>(BUILDER_DEFAULTS)
  const [copied, setCopied] = useState(false)
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("markdown")
  const [baseUrl, setBaseUrl] = useState("https://shieldcn.dev")

  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  const url = useMemo(() => buildBadgeUrl(s, baseUrl), [s, baseUrl])
  const output = useMemo(() => formatOutput(url, copyFormat), [url, copyFormat])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  return (
    <BadgeBuilderCore state={s} onChange={setS} badgeUrl={url}>
      {/* ── Copy output ── */}
      {url && (
        <div className="space-y-3 pt-2">
          {/* Format tabs */}
          <div className="flex items-center gap-1">
            {COPY_FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => setCopyFormat(f.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  copyFormat === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Output + copy */}
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] font-mono break-all text-muted-foreground leading-relaxed min-h-[2.5rem]">
              {output}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-9">
              {copied
                ? <><Check className="size-3.5 text-green-500" /> Copied</>
                : <><Copy className="size-3.5" /> Copy</>
              }
            </Button>
          </div>
        </div>
      )}
    </BadgeBuilderCore>
  )
}
