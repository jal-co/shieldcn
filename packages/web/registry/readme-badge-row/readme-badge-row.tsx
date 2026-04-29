/**
 * shieldcn
 * ReadmeBadgeRow
 * by Justin Levine
 * shieldcn.dev
 *
 * Horizontal layout wrapper for multiple badges with consistent spacing,
 * wrapping, and alignment. Works with ReadmeBadge or any inline elements.
 *
 * Props:
 * - gap?: spacing between badges ("xs" | "sm" | "md" | "lg", default "sm")
 * - align?: horizontal alignment ("left" | "center" | "right", default "left")
 * - className?: additional class names
 * - children: badge elements
 */

import * as React from "react"
import { cn } from "@/lib/utils"

const gapMap = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
} as const

const alignMap = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const

interface ReadmeBadgeRowProps extends React.ComponentProps<"div"> {
  /** Spacing between badges. @default "sm" */
  gap?: keyof typeof gapMap
  /** Horizontal alignment. @default "left" */
  align?: keyof typeof alignMap
  /** Additional class names. */
  className?: string
  children: React.ReactNode
}

function ReadmeBadgeRow({
  gap = "sm",
  align = "left",
  className,
  children,
  ...props
}: ReadmeBadgeRowProps) {
  return (
    <div
      data-slot="readme-badge-row"
      className={cn(
        "flex flex-wrap items-center",
        gapMap[gap],
        alignMap[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { ReadmeBadgeRow }
export type { ReadmeBadgeRowProps }
