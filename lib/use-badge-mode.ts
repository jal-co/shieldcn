/**
 * shieldcn
 * lib/use-badge-mode
 *
 * Returns the badge `mode` param that matches the current site theme.
 * Dark site → dark badges (default), light site → light badges.
 *
 * Also provides a helper to append/replace the mode param on a badge URL.
 */

"use client"

import { useTheme } from "next-themes"
import { useCallback } from "react"

/**
 * Appends or replaces the `mode` query param on a badge URL path.
 * If the badge already has an explicit `mode=` param, it's left as-is
 * (the user chose it intentionally).
 */
export function withBadgeMode(badgePath: string, mode: "dark" | "light"): string {
  // If the path already has an explicit mode param, don't override
  if (/[?&]mode=/.test(badgePath)) return badgePath

  // Always include mode= explicitly so the URL changes when theme toggles.
  // Without this, dark mode URLs are identical to the default (no param),
  // and the browser serves cached dark SVGs when switching to light.
  const separator = badgePath.includes("?") ? "&" : "?"
  return `${badgePath}${separator}mode=${mode}`
}

/**
 * Hook that returns the current badge mode and a URL transform function.
 */
export function useBadgeMode() {
  const { resolvedTheme } = useTheme()
  const mode: "dark" | "light" = resolvedTheme === "light" ? "light" : "dark"

  const adaptUrl = useCallback(
    (badgePath: string) => withBadgeMode(badgePath, mode),
    [mode],
  )

  return { mode, adaptUrl }
}
