/**
 * shieldcn
 * components/badge-builder
 *
 * Landing page badge builder. Wraps BadgeBuilderCore with
 * copy output (Markdown, HTML, URL, RST) slotted into the preview column.
 */

"use client"

import { useState, useEffect, useMemo, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { BadgeBuilderCore } from "@/components/badge-builder-core"
import { CopyOutputSection } from "@/components/copy-output-section"
import { useCopyToClipboard } from "@/lib/use-copy-to-clipboard"
import {
  BUILDER_DEFAULTS,
  buildBadgeUrl,
  type BuilderState,
} from "@/lib/badge-builder-shared"
import { formatBadgeOutput } from "@/lib/badge-output"

// ---------------------------------------------------------------------------
// Copy format helpers
// ---------------------------------------------------------------------------

type CopyFormat = "markdown" | "html" | "url" | "rst"

function formatOutput(url: string, format: CopyFormat, linkUrl?: string): string {
  switch (format) {
    case "markdown":
      return formatBadgeOutput(url, "markdown", {
        alt: "badge",
        linkUrl,
        preferPicture: true,
        ignoreModeForPicture: true,
      })
    case "html":
      return formatBadgeOutput(url, "html", {
        alt: "badge",
        linkUrl,
        preferPicture: true,
        ignoreModeForPicture: true,
      })
    case "url":
      return url
    case "rst":
      return formatBadgeOutput(url, "rst", { alt: "badge", linkUrl })
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
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("markdown")
  const { copied, copyError, copy } = useCopyToClipboard()
  const { resolvedTheme } = useTheme()

  // Snapshot the real origin synchronously on the client's first render
  // (matches SSR's fallback exactly, so there's no post-hydration flash of
  // the wrong origin the way a `useState` + `useEffect(setBaseUrl, [])`
  // pair would produce).
  const baseUrl = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "https://shieldcn.dev",
  )

  // Sync mode with site theme
  useEffect(() => {
    if (!resolvedTheme) return
    const siteMode = resolvedTheme === "light" ? "light" : "dark"
    if (s.mode !== siteMode) {
      // Pre-existing react-compiler debt (set-state-in-effect); tracked separately.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setS((prev) => ({ ...prev, mode: siteMode }))
    }
  }, [resolvedTheme]) // eslint-disable-line react-hooks/exhaustive-deps

  const url = useMemo(() => buildBadgeUrl(s, baseUrl), [s, baseUrl])
  const output = useMemo(() => formatOutput(url, copyFormat, s.linkUrl), [url, copyFormat, s.linkUrl])

  return (
    <BadgeBuilderCore state={s} onChange={setS} badgeUrl={url}>
      {/* ── Copy output ── */}
      {url && (
        <>
          <CopyOutputSection
            formats={COPY_FORMATS}
            format={copyFormat}
            onFormatChange={setCopyFormat}
            output={output}
            copied={copied}
            copyError={copyError}
            onCopy={() => copy(output)}
          />
        </>
      )}
    </BadgeBuilderCore>
  )
}
