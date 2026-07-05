import type { ReactNode } from "react"
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal"
import { cn } from "@/lib/utils"

/**
 * The dashboard content column. Provides consistent padding and a spring
 * entrance stagger for its direct children (via DashboardReveal). Pages compose
 * a header + panels; layering comes from the page bg vs. DashboardPanel's card.
 */
export function DashboardPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <DashboardReveal
      className={cn(
        "flex min-h-full flex-col gap-6 p-4 @2xl/main:gap-7 @2xl/main:p-6 @5xl/main:p-8",
        className,
      )}
    >
      {children}
    </DashboardReveal>
  )
}

export function DashboardPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
            {icon}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight @2xl/main:text-3xl">{title}</h1>
          {description && (
            <div className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function DashboardPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm @2xl/main:p-6",
        className,
      )}
    >
      {children}
    </section>
  )
}

/** A compact stat cell for the overview strip: label + value + optional icon. */
export function DashboardStat({
  label,
  value,
  icon,
  href,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  href?: string
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
    </>
  )
  const cls =
    "flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors"
  if (href) {
    return (
      <a href={href} className={cn(cls, "hover:border-ring/40 hover:bg-accent/40")}>
        {body}
      </a>
    )
  }
  return <div className={cls}>{body}</div>
}
