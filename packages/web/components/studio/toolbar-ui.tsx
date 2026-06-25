/**
 * shieldcn
 * components/studio/toolbar-ui
 *
 * Shared "chambered tray" toolbar language used by both the top README Studio
 * toolbar and the floating per-block toolbar, so they read as one system.
 *
 * Anatomy (mirrors a physical tray holding chips):
 *   Tray     — the layered outer container (lighter fill + inset ring + depth)
 *   Chamber  — a recessed darker compartment grouping tightly-related buttons
 *   TrayButton — a uniform ghost icon button with crisp active / danger states
 *
 * Two-tone depth: the Tray sits a step lighter than its Chambers, which sit a
 * step darker than the surface — the recess reads as inset. Active buttons pop
 * back up as a lighter (or primary-tinted) chip with a hairline ring.
 */

"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** The outer tray. `floating` styles it for an elevated contextual popover. */
export function Tray({
  className, floating, ...props
}: React.ComponentProps<"div"> & { floating?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl p-1",
        floating
          ? "bg-popover/95 shadow-lg ring-1 ring-border backdrop-blur-sm"
          : "bg-muted/50 shadow-sm ring-1 ring-inset ring-border/60",
        className,
      )}
      {...props}
    />
  )
}

/** A recessed compartment grouping tightly-related buttons inside a Tray. */
export function Chamber({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-background/60 p-0.5 ring-1 ring-inset ring-border/40",
        className,
      )}
      {...props}
    />
  )
}

/** A uniform icon button for trays. Tooltip + disabled handled internally. */
export function TrayButton({
  label, onClick, active, danger, disabled, tone = "neutral", className, children,
}: {
  label: string
  onClick: () => void
  active?: boolean
  danger?: boolean
  disabled?: boolean
  /** `primary` tints the active state with the brand color (e.g. a mode that
      changes output); `neutral` uses a quiet lighter chip (e.g. alignment). */
  tone?: "neutral" | "primary"
  className?: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "size-7 rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40",
              active && tone === "primary" && "bg-primary/15 text-primary shadow-sm ring-1 ring-inset ring-primary/30 hover:text-primary",
              active && tone === "neutral" && "bg-foreground/10 text-foreground shadow-sm ring-1 ring-inset ring-border/50",
              danger && "hover:bg-destructive/10 hover:text-destructive",
              className,
            )}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
