/**
 * shieldcn
 * components/matrix-mark.tsx
 *
 * Icon marks for capability / compatibility matrices in docs (no emojis).
 * <Yes/> = supported, <No/> = not available, both with an accessible label.
 * Optional `note` renders a small qualifier (e.g. a limit) beside the icon.
 */

import { Check, Minus } from "lucide-react"

export function Yes({ note }: { note?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
      <Check className="size-4" aria-hidden="true" />
      <span className="sr-only">Yes</span>
      {note && <span className="text-xs font-medium text-muted-foreground">{note}</span>}
    </span>
  )
}

export function No({ note }: { note?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1 text-muted-foreground/50">
      <Minus className="size-4" aria-hidden="true" />
      <span className="sr-only">Not available</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </span>
  )
}
