"use client"

/**
 * shieldcn
 * components/copy-output-section
 *
 * Format-switcher + output code + copy button, shared by all four builders
 * (badge/header/sponsors/contributors) — previously ~30 lines of
 * byte-identical JSX duplicated in each.
 */

import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export function CopyOutputSection<F extends string>({
  formats,
  format,
  onFormatChange,
  output,
  copied,
  copyError,
  onCopy,
  toggleClassName,
}: {
  formats: { value: F; label: string }[]
  format: F
  onFormatChange: (value: F) => void
  output: string
  copied: boolean
  copyError: boolean
  onCopy: () => void
  toggleClassName?: string
}) {
  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={format}
        onValueChange={(v) => v && onFormatChange(v as F)}
        variant="outline"
        size="sm"
        className={cn("w-full", toggleClassName)}
      >
        {formats.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} className="flex-1 text-xs">
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex items-start gap-2">
        <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-[11px] font-mono break-all text-muted-foreground leading-relaxed min-h-[2.5rem]">
          {output}
        </code>
        <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0 h-9">
          {copied ? (
            <>
              <Check className="size-3.5 text-success" /> Copied
            </>
          ) : copyError ? (
            <>
              <Copy className="size-3.5 text-destructive" /> Failed
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
