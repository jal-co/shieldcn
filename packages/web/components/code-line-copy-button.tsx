"use client"

/**
 * jalco-ui
 * CodeLineCopyButton
 * by Justin Levine
 * ui.justinlevine.me
 *
 * Inline copy button for the CodeLine component.
 *
 * Dependencies: lucide-react
 */

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeLineCopyButtonProps extends Omit<React.ComponentProps<"button">, "value"> {
  value: string
}

function CodeLineCopyButton({ value, className, ...props }: CodeLineCopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-slot="code-line-copy-button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      {...props}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

export { CodeLineCopyButton, type CodeLineCopyButtonProps }
