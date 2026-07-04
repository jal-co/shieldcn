/**
 * shieldcn
 * components/dashboard/usage-meter.tsx
 *
 * A compact "used X of N" meter for dashboard resources (saved READMEs,
 * brands). Turns amber near the cap and red when full, with an inline upsell
 * link once the ceiling is a real constraint.
 */

import Link from "next/link"
import { cn } from "@/lib/utils"

export function UsageMeter({
  used,
  limit,
  label,
  upsellHref,
  upsellLabel,
}: {
  used: number
  limit: number
  label: string
  /** Where "get more" points (e.g. /pricing). Shown when at/near the cap. */
  upsellHref?: string
  upsellLabel?: string
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const atLimit = limit > 0 && used >= limit
  const near = limit > 0 && used >= limit - 1 && !atLimit

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {used} of {limit} {label}
        </span>
        {(atLimit || near) && upsellHref && (
          <Link href={upsellHref} className="font-medium underline underline-offset-4 hover:text-foreground">
            {upsellLabel ?? "Get more"}
          </Link>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            atLimit ? "bg-destructive" : near ? "bg-amber-500" : "bg-foreground",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
