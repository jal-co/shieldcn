/**
 * shieldcn
 * components/badge-builder
 *
 * Landing page badge builder. Wraps BadgeBuilderCore with
 * copy output (Markdown, HTML, URL, RST) slotted into the preview column.
 */

"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { Copy, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BadgeBuilderCore } from "@/components/badge-builder-core"
import {
  BUILDER_DEFAULTS,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"

// ---------------------------------------------------------------------------
// Copy format helpers
// ---------------------------------------------------------------------------

type CopyFormat = "markdown" | "html" | "url" | "rst"

function formatOutput(url: string, format: CopyFormat, linkUrl?: string): string {
  const link = linkUrl?.trim() || ""
  switch (format) {
    case "markdown":
      return link
        ? `[![badge](${url})](${link})`
        : `![badge](${url})`
    case "html":
      return link
        ? `<a href="${link}"><img alt="badge" src="${url}"></a>`
        : `<img alt="badge" src="${url}">`
    case "url":
      return url
    case "rst":
      return link
        ? `.. image:: ${url}\n   :alt: badge\n   :target: ${link}`
        : `.. image:: ${url}\n   :alt: badge`
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
  const [copyError, setCopyError] = useState(false)
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("markdown")
  const [baseUrl, setBaseUrl] = useState("https://shieldcn.dev")
  const { resolvedTheme } = useTheme()

  useEffect(() => { setBaseUrl(window.location.origin) }, [])

  // Sync mode with site theme
  useEffect(() => {
    if (!resolvedTheme) return
    const siteMode = resolvedTheme === "light" ? "light" : "dark"
    if (s.mode !== siteMode) {
      setS((prev) => ({ ...prev, mode: siteMode }))
    }
  }, [resolvedTheme]) // eslint-disable-line react-hooks/exhaustive-deps

  const url = useMemo(() => buildBadgeUrl(s, baseUrl), [s, baseUrl])
  const output = useMemo(() => formatOutput(url, copyFormat, s.linkUrl), [url, copyFormat, s.linkUrl])

  const handleCopy = useCallback(() => {
    if (!output) return
    navigator.clipboard.writeText(output).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        setCopyError(true)
        setTimeout(() => setCopyError(false), 2000)
      },
    )
  }, [output])

  return (
    <BadgeBuilderCore state={s} onChange={setS} badgeUrl={url}>
      {/* ── Copy output ── */}
      {url && (
        <div className="space-y-3">
          {/* Format tabs */}
          <ToggleGroup
            type="single"
            value={copyFormat}
            onValueChange={v => v && setCopyFormat(v as CopyFormat)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {COPY_FORMATS.map(f => (
              <ToggleGroupItem key={f.value} value={f.value} className="flex-1 text-xs">
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {/* Output + copy */}
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] font-mono break-all text-muted-foreground leading-relaxed min-h-[2.5rem]">
              {output}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-9">
              {copied
                ? <><Check className="size-3.5 text-success" /> Copied</>
                : copyError
                  ? <><Copy className="size-3.5 text-destructive" /> Failed</>
                  : <><Copy className="size-3.5" /> Copy</>
              }
            </Button>
          </div>
        </div>
      )}
    </BadgeBuilderCore>
  )
}
