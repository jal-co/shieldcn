/**
 * shieldcn
 * app/badge/builder-v2
 *
 * The /badge page builder: BuilderV2Core in the two-panel page layout with
 * the storyboarded entrance and the copy-output panel in the output slot.
 */

"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { BuilderV2Core } from "@/components/builder-v2/core"
import {
  BUILDER_V2_DEFAULTS,
  buildBadgeUrlV2,
  type BuilderV2State,
} from "@/components/builder-v2/state"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import { formatBadgeOutput, isThemeAdaptiveBadgeUrl } from "@/lib/badge-output"

// ---------------------------------------------------------------------------
// Copy formats (matches showcase badge modal semantics: markdown = plain,
// adaptive = theme-adaptive <picture> markdown)
// ---------------------------------------------------------------------------

type CopyFormat = "markdown" | "adaptive" | "html" | "url" | "rst"
const COPY_FORMATS: CopyFormat[] = ["markdown", "adaptive", "html", "url", "rst"]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BuilderV2() {
  const [s, setS] = React.useState<BuilderV2State>(BUILDER_V2_DEFAULTS)
  const [copyFormat, setCopyFormat] = React.useState<CopyFormat>("markdown")
  const { copied, copy } = useCopyToClipboard()

  const baseUrl = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  // Debounced URL (text inputs update state instantly; URL trails)
  const liveUrl = React.useMemo(() => buildBadgeUrlV2(s, baseUrl), [s, baseUrl])
  const [badgeUrl, setBadgeUrl] = React.useState(liveUrl)
  React.useEffect(() => {
    const t = setTimeout(() => setBadgeUrl(liveUrl), 250)
    return () => clearTimeout(t)
  }, [liveUrl])

  // Adaptive tab only applies to theme-adaptive badges; for fixed-color badges
  // a <picture> would just duplicate the plain markdown.
  const availableFormats = React.useMemo<CopyFormat[]>(
    () => COPY_FORMATS.filter(f => f !== "adaptive" || isThemeAdaptiveBadgeUrl(badgeUrl, { ignoreMode: true })),
    [badgeUrl],
  )
  const activeFormat: CopyFormat = availableFormats.includes(copyFormat) ? copyFormat : "markdown"

  const output = React.useMemo(() => {
    switch (activeFormat) {
      case "url": return badgeUrl
      case "rst": return formatBadgeOutput(badgeUrl, "rst", { alt: "badge", linkUrl: s.linkUrl })
      case "markdown": return formatBadgeOutput(badgeUrl, "markdown", { alt: "badge", linkUrl: s.linkUrl })
      case "adaptive":
        return formatBadgeOutput(badgeUrl, "markdown", {
          alt: "badge", linkUrl: s.linkUrl, preferPicture: true, ignoreModeForPicture: true,
        })
      default:
        return formatBadgeOutput(badgeUrl, "html", {
          alt: "badge", linkUrl: s.linkUrl, preferPicture: true, ignoreModeForPicture: true,
        })
    }
  }, [badgeUrl, activeFormat, s.linkUrl])

  return (
    <BuilderV2Core state={s} onChange={setS} badgeUrl={badgeUrl} layout="page" animate>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {availableFormats.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setCopyFormat(f)}
                aria-pressed={activeFormat === f}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium lowercase tracking-wide transition-colors",
                  activeFormat === f ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => copy(output)}>
            {copied ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {output}
        </pre>
      </div>
    </BuilderV2Core>
  )
}
