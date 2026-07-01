"use client"

/**
 * shieldcn
 * lib/use-copy-to-clipboard
 *
 * Shared clipboard-copy state + write, used by every builder and badge
 * modal's "Copy output" control. Centralizes the copied/copyError timing
 * and the toast-on-failure behavior so each caller doesn't hand-roll its
 * own (previously slightly different) version.
 */

import { useCallback, useState } from "react"
import { toast } from "sonner"

export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)

  const copy = useCallback((text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), resetMs)
      },
      () => {
        setCopyError(true)
        setTimeout(() => setCopyError(false), resetMs)
        toast.error("Couldn't copy to clipboard")
      },
    )
  }, [resetMs])

  return { copied, copyError, copy }
}
